#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# ---------------- CONFIG ----------------
PROJECT_DIR="${PROJECT_DIR:-$HOME/.local_ai}"
BUILD_DIR="$PROJECT_DIR/dist"
HASH_INDEX_DIR="${HASH_INDEX_DIR:-$HOME/.hash_index}"
HASH_DB="$HASH_INDEX_DIR/hash_registry.db"
PID_FILE="$PROJECT_DIR/server.pid"
WATCHDOG_LOG="$PROJECT_DIR/watchdog.log"
WATCHDOG_INTERVAL=30  # seconds
SERVE_HOST="127.0.0.1"
SERVE_PORT="8888"

# ---------------- LOGGING ----------------
log() { local lvl="$1"; local msg="$2"; printf "[%s] %s %s\n" "$lvl" "$(date '+%H:%M:%S')" "$msg"; }
log_info() { log "INFO" "$1"; }
log_warn() { log "WARN" "$1"; }
log_error() { log "ERROR" "$1"; exit 1; }
log_success() { log "SUCCESS" "$1"; }

# ---------------- HASH SYSTEM ----------------
init_hash_system() {
    mkdir -p "$HASH_INDEX_DIR"
    sqlite3 "$HASH_DB" "CREATE TABLE IF NOT EXISTS hash_registry (
        hash TEXT PRIMARY KEY,
        original_hash TEXT,
        content_ref TEXT,
        timestamp INTEGER,
        rehash_count INTEGER DEFAULT 0,
        last_accessed INTEGER
    );" 2>/dev/null || true
}

store_hashed_content() {
    local content="$*"
    local hash=$(echo -n "$content" | sha256sum | cut -d' ' -f1)
    local file="$HASH_INDEX_DIR/${hash}.content"
    echo "$content" > "$file"
    sqlite3 "$HASH_DB" "INSERT OR REPLACE INTO hash_registry (hash, original_hash, content_ref, timestamp, last_accessed)
                        VALUES ('$hash', '$hash', '$file', strftime('%s','now'), strftime('%s','now'));"
    echo "$hash"
}

force_rehash_content() {
    local content="$*"
    local timestamp=$(date +%s)
    local new_hash=$(echo -n "${content}${timestamp}" | sha256sum | cut -d' ' -f1)
    local file="$HASH_INDEX_DIR/${new_hash}.content"
    echo "$content" > "$file"
    sqlite3 "$HASH_DB" "INSERT INTO hash_registry (hash, original_hash, content_ref, timestamp, last_accessed, rehash_count)
                        VALUES ('$new_hash', '$new_hash', '$file', $timestamp, $timestamp, 1);"
    echo "$new_hash"
}

retrieve_hashed_content() {
    local hash="$1"
    local file="$HASH_INDEX_DIR/${hash}.content"
    [[ -f "$file" ]] && cat "$file" || echo "Content not found for hash: $hash"
}

rehash_stats() {
    sqlite3 "$HASH_DB" "SELECT COUNT(*), SUM(rehash_count) FROM hash_registry;" | \
    awk -F'|' '{print "📊 Entries: "$1"\n🔁 Total Rehashes: "$2}'
}

# ---------------- SERVER ----------------
start_server() {
    node <<'NODE' &
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(process.env.PROJECT_DIR || __dirname, "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
const host = process.env.SERVE_HOST || "127.0.0.1";
const port = process.env.SERVE_PORT || 8888;
createServer(app).listen(port, host, () => {
    console.log(`[SUCCESS] Server running at http://${host}:${port}`);
});
NODE
    SERVER_PID=$!
    echo "$SERVER_PID" > "$PID_FILE"
    log_info "Server PID: $SERVER_PID (stored in $PID_FILE)"
}

serve_project() {
    log_info "Ensuring build..."
    [[ ! -f "$BUILD_DIR/index.html" ]] && vite build
    start_server

    # Self-test
    sleep 2
    if curl -s --head "http://${SERVE_HOST}:${SERVE_PORT}/index.html" | grep -q "200 OK"; then
        log_success "Self-test passed: index.html reachable"
    else
        log_warn "Self-test failed: index.html not reachable"
    fi

    # Watchdog in daemon mode
    if [[ "${AI_MODE:-}" == "daemon" ]] || [[ "${1:-}" == "--daemon" ]]; then
        log_info "Daemon mode: starting persistent watchdog..."
        nohup bash -c "watchdog_loop" >> "$WATCHDOG_LOG" 2>&1 &
    fi
}

watchdog_loop() {
    log_info "Watchdog started (interval: ${WATCHDOG_INTERVAL}s)"
    while true; do
        if [[ -f "$PID_FILE" ]]; then
            SERVER_PID=$(cat "$PID_FILE")
        fi

        if [[ -z "${SERVER_PID:-}" ]] || ! ps -p "$SERVER_PID" > /dev/null 2>&1; then
            log_warn "Server not running, restarting..."
            serve_project &
            sleep 5
            SERVER_PID=$(cat "$PID_FILE")
            log_success "Server restarted (PID: $SERVER_PID)"
        else
            if curl -s --head "http://${SERVE_HOST}:${SERVE_PORT}/index.html" | grep -q "200 OK"; then
                log_info "Health-check OK (PID: $SERVER_PID)"
            else
                log_warn "Server PID $SERVER_PID running but index.html not reachable. Restarting..."
                kill -9 "$SERVER_PID" || true
                serve_project &
                sleep 5
                SERVER_PID=$(cat "$PID_FILE")
                log_success "Server self-healed (PID: $SERVER_PID)"
            fi
        fi
        sleep "$WATCHDOG_INTERVAL"
    done
}

status_check() {
    if [[ -f "$PID_FILE" ]]; then
        SERVER_PID=$(cat "$PID_FILE")
    fi

    if [[ -n "${SERVER_PID:-}" ]] && ps -p "$SERVER_PID" > /dev/null 2>&1; then
        if curl -s --head "http://${SERVE_HOST}:${SERVE_PORT}/index.html" | grep -q "200 OK"; then
            log_success "Server running (PID $SERVER_PID) ✅"
        else
            log_warn "Server process alive, but index.html not reachable ❌"
        fi
    else
        log_error "No server running"
    fi
}

stop_server() {
    if [[ -f "$PID_FILE" ]]; then
        SERVER_PID=$(cat "$PID_FILE")
    fi
    if [[ -n "${SERVER_PID:-}" ]] && ps -p "$SERVER_PID" > /dev/null 2>&1; then
        kill -9 "$SERVER_PID" || true
        rm -f "$PID_FILE"
        log_success "Stopped server (PID $SERVER_PID)"
        unset SERVER_PID
    else
        log_warn "No server found to stop"
    fi
}

restart_server() {
    stop_server
    serve_project
    status_check
}

# ---------------- MAINTENANCE ----------------
fix_system() {
    log_info "Running self-heal..."
    find "$PROJECT_DIR" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" \) \
        -exec sed -i '/^<<<<<<<\|^=======\|^>>>>>>>/d' {} +
    log_success "Removed merge conflict markers"
    npm install
    vite build || log_warn "Vite build failed after fix"
}

show_help() {
    cat <<EOF
Usage: ai [command] [options]

Lifecycle:
  serve              Start server
  status             Check server status
  restart            Restart server
  stop               Stop server

Maintenance:
  --fix              Self-heal repo (remove conflict markers, rebuild)
  --help             Show this help message

Hashing:
  --hash "text"      Store text and return hash
  --rehash "text"    Force rehash text
  --hashed <hash>    Retrieve content by hash
  --rehashed         Show rehash statistics
EOF
}

# ---------------- MAIN ----------------
main() {
    init_hash_system

    case "${1:-}" in
        serve)       shift; serve_project "$@" ;;
        status)      status_check ;;
        restart)     restart_server ;;
        stop)        stop_server ;;
        --fix)       fix_system ;;
        --help)      show_help ;;
        --hash)      shift; store_hashed_content "$*" ;;
        --rehash)    shift; force_rehash_content "$*" ;;
        --hashed)    shift; retrieve_hashed_content "$1" ;;
        --rehashed)  rehash_stats ;;
        *)           log_info "Unknown command. Use --help" ;;
    esac
}

main "$@"
