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

# ---------------- SERVER ----------------
serve_project() {
    log_info "Starting Local AI server on http://localhost:$PORT ..."

    # Ensure Node server exists
    local server_file="$PROJECT_DIR/server.js"
    if [[ ! -f "$server_file" ]]; then
        log_error "server.js not found in $PROJECT_DIR"
    fi

    # Start Node server in background
    node "$server_file" &
    local server_pid=$!
    log_success "Server started with PID $server_pid"
    echo "Open URL: http://localhost:$PORT"

    # Wait for server to exit or Ctrl+C
    trap "log_info 'Stopping server...'; kill $server_pid; exit" INT TERM
    wait $server_pid
}

# ---------------- HASH SYSTEM STUBS ----------------
init_hash_system() { mkdir -p "$HASH_INDEX_DIR"; }
store_hashed_content() { echo "hash_stub"; }
enhanced_ai_workflow() { log_info "AI workflow stub"; }

# ---------------- COMMANDS ----------------
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
