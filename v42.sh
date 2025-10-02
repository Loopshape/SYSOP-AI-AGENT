#!/usr/bin/env bash
# AI Autonomic Synthesis Platform v42.0 (Architect + Code Analyst)
# Mandatory execution: ~/bin/ai
set -euo pipefail
IFS=$'\n\t'

# === ENVIRONMENT & PATHS ===
AI_HOME="${AI_HOME:-$HOME/.local_ai}"
PROJECTS_DIR="$AI_HOME"
LOG_DIR="$AI_HOME/logs"
TMP_DIR="$AI_HOME/tmp"
SWAP_DIR="$AI_HOME/swap"
CORE_DB="$AI_HOME/agent_core.db"
TASK_DB="$AI_HOME/ai_task_manager.db"
LOG_FILE="$LOG_DIR/system.log"
HMAC_SECRET_KEY="$AI_HOME/secret.key"
mkdir -p "$AI_HOME" "$PROJECTS_DIR" "$LOG_DIR" "$TMP_DIR" "$SWAP_DIR"

# === COLORS & LOGGING ===
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ICON_INFO="ℹ️"; ICON_WARN="⚠️"; ICON_ERROR="❌"; ICON_SUCCESS="✅"; ICON_TASK="📝"; ICON_TRADE="💰"; ICON_AI="🤖"
log_msg(){ local color="$1"; local icon="$2"; local msg="$3"; echo -e "${color}[${icon}] $(date '+%H:%M:%S') $msg${NC}"; echo "$(date '+%Y-%m-%d %H:%M:%S') [$icon] $msg" >> "$LOG_FILE"; }
log_info(){ log_msg "$BLUE" "$ICON_INFO" "$*"; }
log_warn(){ log_msg "$YELLOW" "$ICON_WARN" "$*"; }
log_error(){ log_msg "$RED" "$ICON_ERROR" "$*"; }
log_success(){ log_msg "$GREEN" "$ICON_SUCCESS" "$*"; }

# === HASH FUNCTIONS ===
hash_string(){ echo -n "$1" | sha256sum | awk '{print $1}'; }
hash_string_salt(){ echo -n "$1$2" | sha256sum | awk '{print $1}'; }
hash_file(){ sha256sum "$1" | awk '{print $1}'; }
hash_dir(){ find "$1" -type f -exec sha256sum {} \; | sort | sha256sum | awk '{print $1}'; }

# === DATABASE UTILITIES ===
sqlite_escape(){ echo "$1" | sed "s/'/''/g"; }
run_sql(){ sqlite3 "$TASK_DB" "$1"; }

init_task_db(){
    if [[ ! -f "$TASK_DB" ]]; then
        log_info "Initializing Task DB..."
        sqlite3 "$TASK_DB" <<SQL
CREATE TABLE projects(hash TEXT PRIMARY KEY, path TEXT NOT NULL, ts DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE file_hashes(project_hash TEXT, file_path TEXT, file_hash TEXT, rehashed INTEGER DEFAULT 0, PRIMARY KEY(project_hash,file_path));
CREATE TABLE events(id INTEGER PRIMARY KEY AUTOINCREMENT, ts DATETIME DEFAULT CURRENT_TIMESTAMP, type TEXT, data TEXT);
SQL
    fi
}

init_core_db(){
    if [[ ! -f "$CORE_DB" ]]; then
        log_info "Initializing Core DB..."
        sqlite3 "$CORE_DB" <<SQL
CREATE TABLE memories(id INTEGER PRIMARY KEY, prompt_hash TEXT, prompt TEXT, response_ref TEXT);
CREATE TABLE tool_logs(id INTEGER PRIMARY KEY, task_id TEXT, tool_name TEXT, args TEXT, result TEXT);
SQL
    fi
}

init_databases(){ init_task_db; init_core_db; }

# === AI MODELS & PARAMETERS ===
MODELS=("core" "loop" "2244")
MAX_AGENT_LOOPS=12
MAX_RAM_BYTES=2097152
OLLAMA_BIN="${OLLAMA_BIN:-$(command -v ollama || echo 'ollama')}"

# === OLLAMA WORKERS ===
ensure_ollama(){
    if ! curl -s http://localhost:11434/api/tags >/dev/null; then
        log_info "Starting Ollama service..."
        nohup "$OLLAMA_BIN" serve >/dev/null 2>&1 &
        sleep 3
        curl -s http://localhost:11434/api/tags >/dev/null || log_error "Ollama failed to start"
    fi
}

run_worker_streaming(){
    local model="$1"; local system="$2"; local prompt="$3"; local full=""
    local payload=$(jq -nc --arg m "$model" --arg s "$system" --arg p "$prompt" '{model:$m,system:$s,prompt:$p,stream:true}')
    while IFS= read -r line; do
        if jq -e . >/dev/null 2>&1 <<<"$line"; then
            local token=$(echo "$line" | jq -r '.response // empty')
            [[ -n "$token" ]] && { printf "%s" "$token"; full+="$token"; }
        fi
    done < <(curl -s --max-time 300 -X POST http://localhost:11434/api/generate -d "$payload")
    printf "\n"
    echo "$full"
}

# === AGI WORKFLOW ===
run_agi_workflow(){
    local prompt="$*"
    log_info "Starting AGI workflow: $prompt"
    ensure_ollama
    local task_id=$(hash_string "$prompt$(date +%s%N)" | cut -c1-16)
    local proj_dir="$PROJECTS_DIR/task-$task_id"; mkdir -p "$proj_dir"
    log_success "Workspace: $proj_dir"

    local history="User Request: $prompt"
    local status="IN_PROGRESS"

    for ((i=1;i<=MAX_AGENT_LOOPS;i++)); do
        log_info "AGI Loop $i/$MAX_AGENT_LOOPS"
        local messenger_out=$(run_worker_streaming "core" "Analyze state" "$history")
        local planner_out=$(run_worker_streaming "loop" "Plan" "$messenger_out")
        local executor_out=$(run_worker_streaming "2244" "Decide" "$planner_out")
        history="Loop $i: $executor_out"
        [[ "$executor_out" == *"[FINAL_ANSWER]"* ]] && { status="SUCCESS"; break; }
    done

    local final_answer=$(echo "$history" | grep '\[FINAL_ANSWER\]' | sed 's/\[FINAL_ANSWER\]//')
    [[ -z "$final_answer" ]] && final_answer="$history"
    log_success "AGI Workflow complete: $final_answer"
}

# === FILE / URL / ZIP / RECURSIVE SCAN / MIME PROCESSING ===
auto_ingest(){
    local src="$1"
    local local_path=""
    [[ "$src" =~ ^https?:// ]] && { local_path="$TMP_DIR/$(basename "$src")"; curl -L -o "$local_path" "$src"; }
    [[ -f "$src" ]] && local_path="$src"
    [[ -z "$local_path" ]] && log_warn "Cannot ingest: $src" && return 1

    local mimetype=$(file --mime-type -b "$local_path")
    log_info "Detected MIME: $mimetype"

    case "$mimetype" in
        application/zip)
            local extract_dir="$TMP_DIR/zip_$(hash_string "$local_path")"; mkdir -p "$extract_dir"
            unzip -o "$local_path" -d "$extract_dir"
            log_info "ZIP extracted to $extract_dir"
            scan_recursive "$extract_dir"
            ;;
        text/*|application/json|application/javascript|text/html|text/css)
            scan_recursive "$local_path"
            ;;
        *)
            log_warn "Unhandled MIME: $mimetype"
            ;;
    esac
}

scan_recursive(){
    local path="$1"
    if [[ -d "$path" ]]; then
        find "$path" -type f | while read -r f; do
            file_parse "$f"
        done
    elif [[ -f "$path" ]]; then
        file_parse "$path"
    fi
}

file_parse(){
    local f="$1"
    local mime=$(file --mime-type -b "$f")
    log_info "Parsing $f ($mime)"
    case "$mime" in
        text/*)
            # Syntax highlighting / formatting
            if command -v bat >/dev/null; then bat --color=always "$f"; fi
            if command -v prettier >/dev/null; then prettier --write "$f"; fi
            ;;
        application/javascript|application/json)
            if command -v eslint >/dev/null; then eslint --fix "$f"; fi
            ;;
        *)
            log_warn "No parser for $f ($mime)"
            ;;
    esac
}

# === BTC / WALLET SIMULATION ===
btc_analyze(){ log_trade "BTC/USD technical analysis (simulated)"; }
btc_buy(){ log_trade "BTC buy executed (simulated)"; }
btc_sell(){ log_trade "BTC sell executed (simulated)"; }
wallet_connect(){ log_info "Connecting wallet: $1"; }

# === WEBKIT BUILD ===
build_webkit(){ log_info "Building WebKit (simulated) in $TMP_DIR"; }

# === MAIN DISPATCHER ===
main(){
    init_databases
    local cmd="${1:-}"; shift || true
    case "$cmd" in
        -h|--help) echo "Usage: ai <command> [args]"; exit;;
        ai) run_agi_workflow "$*";;
        ingest|download) auto_ingest "$1";;
        btc) case "$1" in analyze) btc_analyze;; buy) btc_buy;; sell) btc_sell;; esac;;
        wallet) wallet_connect "$1";;
        webkit) build_webkit;;
        *) auto_ingest "$cmd";;
    esac
}

# === ENTRY POINT ===
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then main "$@"; fi
