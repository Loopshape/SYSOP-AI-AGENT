#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# ---------------- CONFIG ----------------
PROJECT_DIR="${PROJECT_DIR:-$HOME/.local_ai}"
REMOTE_REPO="git@github.com:Loopshape/SYSOP-AI-AGENT.git"
NODE_MODULES="$PROJECT_DIR/node_modules"
BUILD_DIR="$PROJECT_DIR/dist"
AI_CMD="$PROJECT_DIR/bin/ai"
LOG_FILE="$PROJECT_DIR/ai.log"
HASH_INDEX_DIR="${HASH_INDEX_DIR:-$PROJECT_DIR/.hash_index}"
HASH_DB="$HASH_INDEX_DIR/hash_registry.db"
MAX_RAM_MB=512
REHASH_THRESHOLD=3600
SERVE_HOST="127.0.0.1"
SERVE_PORT="8888"

# ---------------- LOGGING ----------------
log(){ local lvl="$1"; local msg="$2"; printf "[%s] %s %s\n" "$lvl" "$(date '+%H:%M:%S')" "$msg" | tee -a "$LOG_FILE"; }
log_info(){ log "INFO" "$1"; }
log_warn(){ log "WARN" "$1"; }
log_error(){ log "ERROR" "$1"; exit 1; }
log_success(){ log "SUCCESS" "$1"; }

# ---------------- SELF-HEAL ----------------
self_heal_conflicts() {
    log_info "Checking for unresolved Git conflict markers..."
    local conflicts
    conflicts=$(grep -rl '<<<<<<<\|=======\|>>>>>>>' "$PROJECT_DIR" || true)

    if [[ -n "$conflicts" ]]; then
        log_warn "Conflict markers found in:"
        echo "$conflicts"
        for file in $conflicts; do
            cp "$file" "$file.bak"
            sed -i '/^<<<<<<< /d;/^=======/d;/^>>>>>>> /d' "$file"
            log_info "Markers removed from $file (backup at $file.bak)"
        done
        log_success "Conflict markers cleaned. Please review the files."
    fi
}

self_heal_deps() {
    if ! command -v vite >/dev/null 2>&1; then
        log_warn "Vite not found, reinstalling..."
        npm install -g vite
    fi

    if [[ ! -d "$NODE_MODULES" ]]; then
        log_warn "node_modules missing, running npm install..."
        (cd "$PROJECT_DIR" && npm install)
    fi
}

self_heal_build() {
    log_warn "Build failed, attempting self-heal..."
    rm -rf "$BUILD_DIR"
    vite build || log_error "Self-heal failed: build still broken"
    log_success "Build healed."
}

self_heal_db() {
    if [[ ! -f "$HASH_DB" ]]; then
        log_warn "Hash DB missing, reinitializing..."
        mkdir -p "$HASH_INDEX_DIR"
        sqlite3 "$HASH_DB" "CREATE TABLE IF NOT EXISTS hash_registry (
            hash TEXT PRIMARY KEY,
            original_hash TEXT,
            content_ref TEXT,
            timestamp INTEGER,
            rehash_count INTEGER DEFAULT 0,
            last_accessed INTEGER
        );"
        log_success "Hash DB reinitialized."
    fi
}

self_heal() {
    log_info "Running self-heal sequence..."
    self_heal_conflicts
    self_heal_deps
    self_heal_db
}

trap 'log_warn "Error detected, running self-heal..."; self_heal' ERR

# ---------------- GIT ----------------
init_git(){
    if [[ ! -d "$PROJECT_DIR/.git" ]]; then
        log_info "Initializing git repo..."
        git init "$PROJECT_DIR"
        git -C "$PROJECT_DIR" remote add origin "$REMOTE_REPO"
    else
        log_info "Git repo already exists."
    fi
}

update_repo(){
    log_info "Fetching latest changes from remote..."
    git -C "$PROJECT_DIR" fetch --all
    git -C "$PROJECT_DIR" reset --hard origin/main || true
    self_heal_conflicts
    log_success "Repository is up-to-date."
}

# ---------------- BUILD ----------------
install_deps(){
    log_info "Installing npm dependencies..."
    cd "$PROJECT_DIR"
    npm install
    log_success "Dependencies installed."
}

vite_build(){
    log_info "Building project with Vite..."
    vite build || self_heal_build
    log_success "Vite build complete."
}

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

# ---------------- AI WORKFLOW (stub) ----------------
run_ai_workflow(){
    log_info "run_ai_workflow() called with prompt: $*"
}

# ---------------- SERVE ----------------
serve_project() {
    log_info "Ensuring build before serve..."
    if [[ ! -f "$BUILD_DIR/index.html" ]]; then
        log_warn "No build found, running vite build..."
        vite_build
    fi

    log_info "Starting server on http://${SERVE_HOST}:${SERVE_PORT} ..."
    node <<'NODE'
        import express from 'express';
        import { createServer } from 'http';
        import path from 'path';
        import { fileURLToPath } from 'url';

        const app = express();
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const distPath = path.join(process.env.PROJECT_DIR || __dirname, "dist");

        app.use(express.static(distPath));

        // SPA fallback
        app.get("*", (req, res) => {
            res.sendFile(path.join(distPath, "index.html"));
        });

        const host = process.env.SERVE_HOST || "127.0.0.1";
        const port = process.env.SERVE_PORT || 8888;

        createServer(app).listen(port, host, () => {
            console.log(`[SUCCESS] Server running at http://${host}:${port}`);
        });
NODE

    sleep 2
    if curl -s --head "http://${SERVE_HOST}:${SERVE_PORT}/index.html" | grep -q "200 OK"; then
        log_success "Self-test passed: index.html is being served."
    else
        log_error "Self-test failed: index.html not reachable."
    fi
}

# ---------------- MAIN ----------------
main(){
    log_info "==== Starting Git Build & AGI Workflow ===="
    self_heal
    init_git
    update_repo
    install_deps
    init_hash_system
    vite_build

    case "${1:-}" in
        "--clean")
            self_heal_conflicts
            ;;
        "--serve")
            serve_project
            ;;
        *)
            run_ai_workflow "$@"
            ;;
    esac

    log_info "==== Workflow Finished ===="
}

main "$@"
