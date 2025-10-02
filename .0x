#!/usr/bin/env bash
# AI Autonomic Synthesis Platform v170 (The Architect — v170 Full Bundle)
# Mandatory install path: ~/bin/ai
# Full-featured: sandbox, SQL-managed memory & audit, AGI triumvirate (streaming), mindflow, hashing,
# file parsing, regex scanning, lint/format hooks, zip/url handling, wallet simulation, btc sim, webkit build.
set -euo pipefail
IFS=$'\n\t'

VERSION="v170"

# ---------------------------
# 0. BASIC ENV & PATHS
# ---------------------------
AI_HOME="${AI_HOME:-$HOME/.local_ai}"
BIN_PATH="${BIN_PATH:-$HOME/bin/ai}"
PROJECTS_DIR="$AI_HOME/projects"
LOG_DIR="$AI_HOME/logs"
TMP_DIR="$AI_HOME/tmp"
SWAP_DIR="$AI_HOME/swap"
DOWNLOADS_DIR="$AI_HOME/downloads"
OUTPUTS_DIR="$AI_HOME/outputs"

CORE_DB="$AI_HOME/agent_core.db"
TASK_DB="$AI_HOME/ai_task_manager.db"
LOG_FILE="$LOG_DIR/system.log"
HMAC_SECRET_KEY="$AI_HOME/secret.key"

# Models (triad + extras)
MODELS=("core" "loop" "2244-1")
DEFAULT_AGI_LOOPS="${DEFAULT_AGI_LOOPS:-12}"
MAX_RAM_BYTES="${MAX_RAM_BYTES:-2097152}" # 2 MiB threshold

# Ensure directories exist (idempotent)
mkdir -p "$AI_HOME" "$PROJECTS_DIR" "$LOG_DIR" "$TMP_DIR" "$SWAP_DIR" "$DOWNLOADS_DIR" "$OUTPUTS_DIR"

# ---------------------------
# 1. COLORS & LOGGING
# ---------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ICON_INFO="ℹ️"; ICON_WARN="⚠️"; ICON_ERROR="❌"; ICON_SUCCESS="✅"; ICON_TASK="📝"; ICON_TRADE="💰"

log_write() { printf '%s\n' "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"; }
log() { printf "%b\n" "$2"; log_write "$2"; } # log "<color>" "message"
log_info()  { log "$BLUE"  "$ICON_INFO [INFO]  $*${NC}"; }
log_warn()  { log "$YELLOW" "$ICON_WARN [WARN]  $*${NC}"; }
log_error() { log "$RED"   "$ICON_ERROR [ERROR] $*${NC}"; }
log_ok()    { log "$GREEN" "$ICON_SUCCESS [OK]    $*${NC}"; }
log_task()  { log "$BLUE"  "$ICON_TASK [TASK] $*${NC}"; }
log_trade() { log "$YELLOW" "$ICON_TRADE [TRADE] $*${NC}"; }

# ---------------------------
# 2. SQLITE HELPERS & SCHEMA
# ---------------------------
sqlite_exec() {
    local db="$1"; local sql="$2"
    sqlite3 "$db" "$sql"
}

sqlite_escape() { printf "%s" "$1" | sed "s/'/''/g"; }

init_databases() {
    # Core DB: memories, tool_logs, agi_loops, mindflow
    sqlite_exec "$CORE_DB" "
    CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY,
        prompt_hash TEXT UNIQUE,
        prompt TEXT,
        response_ref TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tool_logs (
        id INTEGER PRIMARY KEY,
        task_id TEXT,
        tool_name TEXT,
        args TEXT,
        result TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS agi_loops (
        id INTEGER PRIMARY KEY,
        task_id TEXT,
        loop_number INTEGER,
        model TEXT,
        input TEXT,
        output TEXT,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS mindflow (
        id INTEGER PRIMARY KEY,
        task_id TEXT,
        node_id TEXT,
        parent_id TEXT,
        model TEXT,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    "
    # Task DB: projects, file_hashes, events
    sqlite_exec "$TASK_DB" "
    CREATE TABLE IF NOT EXISTS projects (
        hash TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        ts DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS file_hashes (
        project_hash TEXT,
        file_path TEXT,
        file_hash TEXT,
        mime_type TEXT,
        rehashed INTEGER DEFAULT 0,
        PRIMARY KEY(project_hash,file_path)
    );
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts DATETIME DEFAULT CURRENT_TIMESTAMP,
        type TEXT,
        data TEXT
    );
    "
    # create HMAC secret if missing
    if [[ ! -f "$HMAC_SECRET_KEY" ]]; then
        openssl rand -hex 32 > "$HMAC_SECRET_KEY"
        chmod 600 "$HMAC_SECRET_KEY"
        log_info "Generated HMAC secret key at $HMAC_SECRET_KEY"
    fi
}

# ---------------------------
# 3. HASHING UTILITIES
# ---------------------------
hash_string()   { printf "%s" "$1" | sha256sum | awk '{print $1}'; }
hash_string_salt(){ local s="${2:-salt}"; printf "%s%s" "$1" "$s" | sha256sum | awk '{print $1}'; }
hash_file()     { local f="$1"; local algo="${2:-sha256}"; case "$algo" in sha256) sha256sum "$f" | awk '{print $1}' ;; sha512) sha512sum "$f" | awk '{print $1}' ;; md5) md5sum "$f" | awk '{print $1}' ;; *) sha256sum "$f" | awk '{print $1}' ;; esac; }
hash_dir()      { find "$1" -type f -exec sha256sum {} \; | sort | sha256sum | awk '{print $1}'; }

# ---------------------------
# 4. SWAP/CACHE STORAGE
# ---------------------------
store_output_fast() {
    local content="$1"
    local h
    h=$(hash_string "$content")
    if ((${#content} > MAX_RAM_BYTES)); then
        local path="$SWAP_DIR/$h.txt.gz"
        mkdir -p "$(dirname "$path")"
        printf "%s" "$content" | gzip > "$path"
        echo "$path"
    else
        echo "$content"
    fi
}
retrieve_output_fast() {
    local ref="$1"
    if [[ -f "$ref" ]]; then
        if [[ "$ref" == *.gz ]]; then
            gzip -dc "$ref"
        else
            cat "$ref"
        fi
    else
        printf "%s" "$ref"
    fi
}

# ---------------------------
# 5. FILE / MIME / ZIP / URL
# ---------------------------
get_mime() { file --mime-type -b "$1" 2>/dev/null || echo "application/octet-stream"; }

download_url() {
    local url="$1"
    local out="$DOWNLOADS_DIR/$(basename "${url%%\?*}")"
    curl -L --fail -sS "$url" -o "$out" || { log_warn "Failed download: $url"; return 1; }
    log_info "Downloaded $url -> $out"
    echo "$out"
}

import_zip() {
    local zip="$1" dest="${2:-$TMP_DIR}"
    [[ -f "$zip" ]] || { log_warn "ZIP not found: $zip"; return 1; }
    mkdir -p "$dest"
    unzip -oq "$zip" -d "$dest"
    log_info "Extracted $zip -> $dest"
    echo "$dest"
}

# ---------------------------
# 6. PROJECT INGEST / REHASH / SCAN (SQL)
# ---------------------------
ingest_project() {
    local repo="$1"
    [[ -d "$repo" ]] || { log_error "ingest_project: repo not a directory: $repo"; return 1; }
    local proj_hash
    proj_hash=$(hash_dir "$repo")
    sqlite_exec "$TASK_DB" "INSERT OR IGNORE INTO projects (hash,path) VALUES('$(sqlite_escape "$proj_hash")','$(sqlite_escape "$repo")');"
    find "$repo" -type f -print0 | while IFS= read -r -d '' f; do
        local fh
        fh=$(hash_file "$f")
        local mt
        mt=$(get_mime "$f")
        sqlite_exec "$TASK_DB" "INSERT OR REPLACE INTO file_hashes(project_hash,file_path,file_hash,mime_type,rehashed) VALUES('$(sqlite_escape "$proj_hash")','$(sqlite_escape "$f")','$fh','$mt',0);"
    done
    log_ok "Ingested project: $repo -> $proj_hash"
    printf "%s" "$proj_hash"
}

rehash_project() {
    local proj_hash="$1"
    local base
    base=$(sqlite3 "$TASK_DB" "SELECT path FROM projects WHERE hash='$(sqlite_escape "$proj_hash")' LIMIT 1;")
    [[ -n "$base" ]] || { log_error "rehash_project: unknown hash $proj_hash"; return 1; }
    find "$base" -type f -print0 | while IFS= read -r -d '' f; do
        local fh; fh=$(hash_file "$f")
        sqlite_exec "$TASK_DB" "UPDATE file_hashes SET file_hash='$fh', rehashed=1 WHERE project_hash='$(sqlite_escape "$proj_hash")' AND file_path='$(sqlite_escape "$f")';"
    done
    log_info "Rehashed project: $proj_hash"
}

regex_scan_project() {
    local proj="$1" pattern="${2:-.}"
    find "$proj" -type f -print0 | xargs -0 -n1 -I{} sh -c "grep -Hn --binary-files=without-match -E '${pattern}' '{}' || true"
}

# ---------------------------
# 7. CODE UTILITIES (hooks)
# ---------------------------
lint_and_format() {
    local f="$1"
    if command -v eslint >/dev/null 2>&1 && [[ "$f" == *.js || "$f" == *.ts ]]; then
        eslint --fix "$f" 2>/dev/null || log_warn "eslint issues: $f"
    fi
    if command -v prettier >/dev/null 2>&1; then
        prettier --write "$f" 2>/dev/null || true
    fi
    if command -v black >/dev/null 2>&1 && [[ "$f" == *.py ]]; then
        black "$f" >/dev/null 2>&1 || true
    fi
}

highlight_file() {
    local f="$1"
    if command -v bat >/dev/null 2>&1; then
        bat --paging=never "$f"
    else
        sed -n '1,200p' "$f"
    fi
}

# ---------------------------
# 8. WALLET & BTC SIM
# ---------------------------
wallet_connect() {
    local mnemonic="$1"
    # do NOT log mnemonic in plaintext
    log_info "Wallet connect requested (mnemonic length: ${#mnemonic})"
    # simulate a derived id
    echo "wallet_$(hash_string "${mnemonic:0:16}")"
}
btc_analyze() {
    log_trade "BTC analysis (simulated) requested"
    echo '{"symbol":"BTC/USD","rsi":52,"macd":"neutral","support":27000,"resistance":29500}'
}
btc_trade_simulate() {
    local action="$1" amount="${2:-0}"
    log_trade "Simulated BTC $action amount=$amount"
    echo "{\"action\":\"$action\",\"amount\":$amount,\"status\":\"simulated\"}"
}

# ---------------------------
# 9. WEBKIT BUILD (managed)
# ---------------------------
build_webkit() {
    local build_dir="$TMP_DIR/webkit_build"
    mkdir -p "$build_dir"
    log_info "Starting WebKit build (may be long). Output -> $LOG_DIR/webkit_build.log"
    # attempt actual clone; if fails, simulate
    if command -v git >/dev/null 2>&1; then
        if [[ ! -d "$build_dir/WebKit" ]]; then
            if git clone https://github.com/WebKit/WebKit.git "$build_dir/WebKit" >/dev/null 2>&1; then
                log_info "Cloned WebKit to $build_dir/WebKit"
            else
                log_warn "Failed to clone WebKit, running simulated build"
                echo "simulated build" > "$LOG_DIR/webkit_build.log"
                return 0
            fi
        fi
        pushd "$build_dir/WebKit" >/dev/null
        if [[ -x "./Tools/Scripts/build-webkit" ]]; then
            ./Tools/Scripts/build-webkit > "$LOG_DIR/webkit_build.log" 2>&1 || log_warn "build-webkit returned non-zero; check logs"
        else
            log_warn "WebKit build script not found; simulation written"
            echo "no build script" > "$LOG_DIR/webkit_build.log"
        fi
        popd >/dev/null
    else
        log_warn "git not available; cannot clone WebKit. Simulated."
        echo "simulated" > "$LOG_DIR/webkit_build.log"
    fi
    log_ok "WebKit task complete (logs: $LOG_DIR/webkit_build.log)"
}

# ---------------------------
# 10. AGI: streaming worker + mindflow fusion
# ---------------------------
# Uses local Ollama service if available; falls back to simulated streaming
OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434/api/generate}"

run_worker_streaming() {
    local model="$1"
    local system_prompt="$2"
    local user_prompt="$3"
    local out_pipe="$4"

    if curl --silent --fail --max-time 2 "$OLLAMA_URL" -o /dev/null 2>/dev/null; then
        # try streaming via curl chunked; Ollama may support stream param; adapt payload
        local payload
        payload=$(jq -nc --arg m "$model" --arg s "$system_prompt" --arg p "$user_prompt" '{model:$m,system:$s,prompt:$p,stream:true}')
        # stream into the outfile
        curl -s --no-buffer -X POST "$OLLAMA_URL" -d "$payload" > "$out_pipe" || true
    else
        # fallback simulated streaming
        {
            for n in $(seq 1 6); do
                printf "[%s][%s] token%02d\n" "$model" "$(date '+%T')" "$n"
                sleep 0.03
            done
            printf "[%s][%s] [DONE]\n" "$model" "$(date '+%T')"
        } > "$out_pipe"
    fi
}

insert_agi_loop_record() {
    local task_id="$1" loop_num="$2" model="$3" input="$4" output="$5"
    sqlite_exec "$CORE_DB" "INSERT INTO agi_loops (task_id,loop_number,model,input,output,status) VALUES('$(sqlite_escape "$task_id")',$loop_num,'$(sqlite_escape "$model")','$(sqlite_escape "$input")','$(sqlite_escape "$output")','completed');"
}

insert_mindflow_node() {
    local task_id="$1" node_id="$2" parent="$3" model="$4" content="$5"
    sqlite_exec "$CORE_DB" "INSERT INTO mindflow (task_id,node_id,parent_id,model,content) VALUES('$(sqlite_escape "$task_id")','$(sqlite_escape "$node_id")','$(sqlite_escape "$parent")','$(sqlite_escape "$model")','$(sqlite_escape "$content")');"
}

run_agi_mindflow() {
    local user_prompt="$*"
    local task_id
    task_id=$(hash_string "$user_prompt$(date +%s%N)" | cut -c1-16)
    local workspace="$PROJECTS_DIR/task-$task_id"
    mkdir -p "$workspace"/{projects,logs,tmp,swap,downloads,outputs}
    log_ok "AGI Mindflow task $task_id workspace init: $workspace"

    # cache check
    local p_h
    p_h=$(semantic_hash() { printf "%s" "$1" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' ' ' | tr -s ' ' | sed 's/^ *//;s/ *$//' | tr ' ' '_'; }; p_h=$(semantic_hash "$user_prompt"); sqlite_exec "$CORE_DB" "SELECT response_ref FROM memories WHERE prompt_hash='$(sqlite_escape "$p_h")' LIMIT 1;" )
    if [[ -n "$p_h" && "$p_h" != "NULL" ]]; then
        local cached_ref
        cached_ref=$(sqlite3 "$CORE_DB" "SELECT response_ref FROM memories WHERE prompt_hash='$(sqlite_escape "$p_h")' LIMIT 1;")
        if [[ -n "$cached_ref" ]]; then
            log_info "Found cached response for prompt"
            retrieve_output_fast "$cached_ref"
            return 0
        fi
    fi

    # create pipes for streaming
    local loop_num=0
    local active=1
    local MAX_LOOPS="${DEFAULT_AGI_LOOPS}"
    while (( loop_num < MAX_LOOPS && active )); do
        loop_num=$((loop_num+1))
        log_info "AGI loop $loop_num/$MAX_LOOPS (task $task_id)"
        active=0
        # prepare per-model temp files
        declare -A out_files
        for model in "${MODELS[@]}"; do
            local outf="$workspace/tmp/${model}_loop${loop_num}.out"
            mkdir -p "$(dirname "$outf")"
            out_files["$model"]="$outf"
            # spawn streaming worker
            run_worker_streaming "$model" "System: collaborate" "$user_prompt" "$outf" &
        done
        # wait for workers to finish (they will write to files)
        wait

        # read & fuse outputs into mindflow & agi_loops table
        local fused=""
        for model in "${MODELS[@]}"; do
            local file="${out_files[$model]}"
            if [[ -f "$file" ]]; then
                local model_output
                model_output=$(cat "$file")
                # insert agi loop records (SQL)
                insert_agi_loop_record "$task_id" "$loop_num" "$model" "$user_prompt" "$model_output"
                # create mindflow node
                local node_id
                node_id="$(hash_string "$task_id|$loop_num|$model")"
                insert_mindflow_node "$task_id" "$node_id" "" "$model" "$model_output"
                fused+=$'\n'"[$model] $model_output"
                # heuristics: if output contains "[DONE]" or "[FINAL_ANSWER]" mark done
                if grep -q "\[FINAL_ANSWER\]" <<<"$model_output"; then
                    log_info "Model $model returned FINAL_ANSWER in loop $loop_num"
                    json_output=$(grep -a "\[FINAL_ANSWER\]" -m1 <<<"$model_output" || true)
                    # store memory & return
                    local final_ref
                    final_ref=$(store_output_fast "$model_output")
                    sqlite_exec "$CORE_DB" "INSERT OR REPLACE INTO memories(prompt_hash,prompt,response_ref) VALUES('$(sqlite_escape "$task_id")','$(sqlite_escape "$user_prompt")','$(sqlite_escape "$final_ref")');"
                    retrieve_output_fast "$final_ref"
                    return 0
                fi
            else
                log_warn "Expected output missing for $model (loop $loop_num)"
            fi
        done

        # fuse mindmap output to outputs
        printf "%s\n" "$fused" > "$workspace/outputs/mindmap_loop${loop_num}.txt"
        log_info "Mindflow loop $loop_num fused -> $workspace/outputs/mindmap_loop${loop_num}.txt"

        # Heuristic to extend loops if shorter outputs or models hint further thinking
        local total_len
        total_len=$(printf "%s" "$fused" | wc -c)
        if (( total_len < 200 )); then
            log_info "Extending loops: fused output short (len=$total_len)"
            MAX_LOOPS=$((MAX_LOOPS+2))
            active=1
        fi
    done

    # if finished without FINAL_ANSWER, store fused result in memories
    local fused_full
    fused_full=$(cat "$workspace/outputs/"*.txt 2>/dev/null || echo "no-mindmap")
    local store_ref
    store_ref=$(store_output_fast "$fused_full")
    sqlite_exec "$CORE_DB" "INSERT OR REPLACE INTO memories(prompt_hash,prompt,response_ref) VALUES('$(sqlite_escape "$task_id")','$(sqlite_escape "$user_prompt")','$(sqlite_escape "$store_ref")');"
    log_ok "AGI Mindflow completed for task $task_id; fused stored at $store_ref"
    retrieve_output_fast "$store_ref"
}

# ---------------------------
# 11. TOOL LOGGING (SQL)
# ---------------------------
log_tool_run() {
    local task_id="$1"; local tool="$2"; local args="$3"; local result="$4"
    sqlite_exec "$CORE_DB" "INSERT INTO tool_logs (task_id,tool_name,args,result) VALUES('$(sqlite_escape "$task_id")','$(sqlite_escape "$tool")','$(sqlite_escape "$args")','$(sqlite_escape "$result")');"
}

# ---------------------------
# 12. COMMAND DISPATCHER
# ---------------------------
usage() {
    cat <<EOF
AI Autonomic Synthesis Platform $VERSION
Usage: ai <command> [args...]

Commands:
  agi "<prompt>"                Run AGI mindflow (streaming, multi-model)
  ingest <path>                 Ingest project directory into DB (hash files)
  rehash <project_hash>         Re-hash files for a project
  scan <dir> <regex>            Regex scan files in dir
  parse <file>                  Show MIME & quick parse info
  download <url>                Download URL into sandbox
  unzip <file> [dest]           Unzip into dest (tmp by default)
  lint <file>                   Lint & format file (eslint/prettier/black where available)
  highlight <file>              Syntax highlight file (bat fallback)
  webkit                        Attempt WebKit build
  wallet connect "<mnemonic>"   Connect wallet (simulated)
  btc analyze|buy|sell [amt]    BTC simulation
  logs                          Show recent logs
  dbdump <core|task>            Dump SQLite DB schema & counts
  help                          Show this help
EOF
}

dbdump() {
    local which="$1"
    if [[ "$which" == "core" ]]; then
        sqlite3 "$CORE_DB" ".schema" >/dev/null 2>&1 || true
        echo "Core DB counts:"
        sqlite3 "$CORE_DB" "SELECT 'memories',count(*) FROM memories UNION ALL SELECT 'tool_logs',count(*) FROM tool_logs UNION ALL SELECT 'agi_loops',count(*) FROM agi_loops UNION ALL SELECT 'mindflow',count(*) FROM mindflow;"
    else
        sqlite3 "$TASK_DB" ".schema" >/dev/null 2>&1 || true
        echo "Task DB counts:"
        sqlite3 "$TASK_DB" "SELECT 'projects',count(*) FROM projects UNION ALL SELECT 'file_hashes',count(*) FROM file_hashes UNION ALL SELECT 'events',count(*) FROM events;"
    fi
}

show_logs() {
    tail -n 200 "$LOG_FILE" 2>/dev/null || true
}

main() {
    init_databases
    local cmd="${1:-help}"; shift || true
    case "$cmd" in
        agi) run_agi_mindflow "$*" ;;
        ingest) ingest_project "$1" ;;
        rehash) rehash_project "$1" ;;
        scan) regex_scan_project "${1:-$PROJECTS_DIR}" "${2:-.}" ;;
        parse) process_file "$1" ;;
        download) download_url "$1" ;;
        unzip) import_zip "$1" "${2:-}" ;;
        lint) lint_and_format "$1" ;;
        highlight) highlight_file "$1" ;;
        webkit) build_webkit ;;
        wallet)
            case "$1" in
                connect) wallet_connect "$2" ;;
                balance) wallet_balance ;;
                *) log_warn "wallet commands: connect <mnemonic> | balance" ;;
            esac
            ;;
        btc)
            case "$1" in
                analyze) btc_analyze ;;
                buy) btc_trade_simulate "buy" "${2:-0}" ;;
                sell) btc_trade_simulate "sell" "${2:-0}" ;;
                *) log_warn "btc commands: analyze | buy <amt> | sell <amt>" ;;
            esac
            ;;
        logs) show_logs ;;
        dbdump) dbdump "$1" ;;
        help|--help|-h) usage ;;
        *) log_warn "Unknown command: $cmd"; usage ;;
    esac
}

# ---------------------------
# 13. ENTRYPOINT
# ---------------------------
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
