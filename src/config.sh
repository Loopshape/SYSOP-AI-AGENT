#!/usr/bin/env bash

# --- CONFIG & DB PATHS ---
AI_HOME="${AI_HOME:-$HOME/.ai_agent}"
PROJECTS_DIR="${PROJECTS_DIR:-$HOME/ai_projects}"
CONFIG_DIR="$PROJECT_ROOT/config"
CONFIG_FILE="$CONFIG_DIR/config.json"
DATA_DIR="$PROJECT_ROOT/data"
MEMORY_DB="$DATA_DIR/memory.db"
SSH_DIR="$HOME/.ssh"
GIT_SSH_KEY="$SSH_DIR/id_ai_agent"
OLLAMA_BIN="${OLLAMA_BIN:-$(command -v ollama || true)}"
MAX_AGENT_LOOPS=5

# --- Config & DB Variables ---
AGENT_MODEL=""
CODER_MODEL=""
REVIEWER_MODEL=""
TESTER_MODEL=""
MESSENGER_MODEL=""
COMBINATOR_MODEL=""
TRADER_MODEL=""


# --- DATABASE & CONFIG ---
init_db() {
    mkdir -p "$DATA_DIR"
    if ! command -v sqlite3 &> /dev/null; then log_error "sqlite3 is required."; fi
    sqlite3 "$MEMORY_DB" "CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY, timestamp DATETIME, mode TEXT, prompt TEXT, result TEXT, status TEXT);" 2>/dev/null || true
}

load_config_values() {
    if [[ ! -f "$CONFIG_FILE" ]]; then return 1; fi
    AGENT_MODEL=$(jq -r '.models.agent' "$CONFIG_FILE")
    CODER_MODEL=$(jq -r '.models.coder' "$CONFIG_FILE")
    REVIEWER_MODEL=$(jq -r '.models.reviewer' "$CONFIG_FILE")
    TESTER_MODEL=$(jq -r '.models.tester' "$CONFIG_FILE")
    MESSENGER_MODEL=$(jq -r '.models.messenger' "$CONFIG_FILE")
    COMBINATOR_MODEL=$(jq -r '.models.combinator' "$CONFIG_FILE")
    TRADER_MODEL=$(jq -r '.models.trader' "$CONFIG_FILE")
    OLLAMA_BIN=$(jq -r '.ollama_bin' "$CONFIG_FILE")
}

config_operation() {
    local op="$1" key="$2" value="$3"
    case "$op" in
        view) jq . "$CONFIG_FILE";;
        get) jq -r ".$key" "$CONFIG_FILE";;
        set)
            local temp_file; temp_file=$(mktemp)
            jq ".$key = \"$value\"" "$CONFIG_FILE" > "$temp_file" && mv "$temp_file" "$CONFIG_FILE"
            log_success "Config updated: $key -> $value"
            ;;
        *) log_error "Unknown config op. Use view, get, set.";;
    esac
}

# --- MEMORY SYSTEM ---
add_memory() {
    sqlite3 "$MEMORY_DB" "INSERT INTO memories (mode,prompt,result,status) VALUES ('$1','$(sqlite_escape "$2")','$(sqlite_escape "$3")','$4');" 2>/dev/null
}
memory_operation() {
    local op="$1" query="$2"
    case "$op" in
        search) sqlite3 -header -column "$MEMORY_DB" "SELECT * FROM memories WHERE prompt LIKE '%$(sqlite_escape "$query")%' ORDER BY timestamp DESC LIMIT 5;";;
        clear) if confirm_action "Clear ALL memory data?"; then sqlite3 "$MEMORY_DB" "DELETE FROM memories;"; log_success "Memory cleared."; fi;;
        *) log_error "Unknown memory op. Use search, clear.";;
    esac
}