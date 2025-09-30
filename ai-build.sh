#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# ---------------- CONFIG ----------------
PROJECT_DIR="${PROJECT_DIR:-$HOME/.local_ai}"
HASH_INDEX_DIR="${HASH_INDEX_DIR:-$HOME/.hash_index}"
HASH_DB="$HASH_INDEX_DIR/hash_registry.db"
PORT="${PORT:-3000}"
VERBOSE="${VERBOSE:-true}"

# ---------------- LOGGING ----------------
log() { local lvl="$1"; local msg="$2"; printf "[%s] %s %s\n" "$lvl" "$(date '+%H:%M:%S')" "$msg"; }
log_info()    { [[ "$VERBOSE" == true ]] && log "INFO" "$1"; }
log_warn()    { log "WARN" "$1"; }
log_error()   { log "ERROR" "$1"; exit 1; }
log_success() { log "SUCCESS" "$1"; }

# ---------------- FRONTEND BUILD ----------------
ensure_build() {
    local dist_file="$PROJECT_DIR/dist/index.html"
    if [[ ! -f "$dist_file" ]]; then
        log_warn "dist/index.html not found. Running mandatory Vite build..."
        cd "$PROJECT_DIR"
        vite build || log_error "Vite build failed!"
        log_success "Vite build completed."
    else
        log_info "dist/index.html exists. Skipping build."
    fi
}

# ---------------- SERVER ----------------
serve_project() {
    ensure_build

    log_info "Starting Local AI server on http://localhost:$PORT ..."

    local server_file="$PROJECT_DIR/server.js"
    if [[ ! -f "$server_file" ]]; then
        log_error "server.js not found in $PROJECT_DIR"
    fi

    # Start Node server in background
    node "$server_file" &
    local server_pid=$!
    log_success "Server started with PID $server_pid"
    echo "Open URL: http://localhost:$PORT"

    # Wait for server or Ctrl+C
    trap "log_info 'Stopping server...'; kill $server_pid; exit" INT TERM
    wait $server_pid
}

# ---------------- HASH / AI STUBS ----------------
init_hash_system() { mkdir -p "$HASH_INDEX_DIR"; }
store_hashed_content() { echo "hash_stub"; }
enhanced_ai_workflow() { log_info "AI workflow stub"; }

# ---------------- MAIN ----------------
main() {
    case "${1:-}" in
        "--serve")
            serve_project
            ;;
        *)
            enhanced_ai_workflow "$@"
            ;;
    esac
}

main "$@"
