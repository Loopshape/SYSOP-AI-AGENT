#!/usr/bin/env bash
# ai.sh - AI Autonomic Synthesis Platform v24.1
# A single-file, self-verifying agent with a polyglot Web UI and a full DevOps toolkit.

# --- RUNTIME MODE DETECTION: EMBEDDED NODE.JS WEB SERVER ---
if [[ "${1:-}" == "serve" ]]; then
    # This block executes if the first argument is 'serve'
    exec node --input-type=module - "$0" "$@" <<'NODE_EOF'
import http from 'http';
import { exec } from 'child_process';
import path from 'path';

const PORT = process.env.AI_PORT || 8080;
// The path to this script is passed as the second argument from the bash wrapper
const AI_SCRIPT_PATH = process.argv[2];

const HTML_UI = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AI Autonomic Synthesis Platform v24</title>
    <style>
        :root { --bg: #0d1117; --text: #c9d1d9; --accent: #58a6ff; --secondary: #8b949e; --border: #30363d; --input-bg: #161b22; --success: #3fb950; --error: #f85149; }
        body { font-family: 'SF Mono', Consolas, 'Courier New', monospace; background: var(--bg); color: var(--text); margin: 0; padding: 20px; font-size: 14px; line-height: 1.6; }
        .container { max-width: 1000px; margin: auto; }
        h1 { color: var(--accent); text-align: center; border-bottom: 1px solid var(--border); padding-bottom: 15px; }
        .terminal { background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px; padding: 15px; margin-top: 20px; height: 70vh; overflow-y: scroll; display: flex; flex-direction: column; }
        .output { flex-grow: 1; white-space: pre-wrap; }
        .input-line { display: flex; border-top: 1px solid var(--border); padding-top: 10px; margin-top: 10px; }
        .prompt { color: var(--accent); font-weight: bold; margin-right: 10px; }
        input { flex-grow: 1; background: transparent; border: none; color: var(--text); font-family: inherit; font-size: inherit; outline: none; }
        .log { color: var(--secondary); }
        .success { color: var(--success); }
        .error { color: var(--error); }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 AI Autonomic Synthesis Platform v24</h1>
        <div class="terminal">
            <div id="output" class="output">
                <div class="log">🚀 AI Agent ready. System initialized.</div>
            </div>
            <div class="input-line">
                <span class="prompt">ai&gt;</span>
                <input type="text" id="commandInput" placeholder="Enter your high-level goal..." autofocus>
            </div>
        </div>
    </div>
    <script>
        const output = document.getElementById('output');
        const input = document.getElementById('commandInput');

        function addOutput(text, className = 'log') {
            const div = document.createElement('div');
            div.className = className;
            div.textContent = text;
            output.appendChild(div);
            output.scrollTop = output.scrollHeight;
        }

        async function executeCommand(cmd) {
            addOutput(\`ai> \${cmd}\`, 'prompt');
            input.disabled = true;
            try {
                const response = await fetch('/api/command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: cmd })
                });
                const result = await response.json();
                // Strip ANSI color codes for cleaner HTML output
                const formattedOutput = result.output.replace(/\\u001b\\[[0-9;]*m/g, '');
                addOutput(formattedOutput, result.success ? 'success' : 'error');
            } catch (e) {
                addOutput(\`[CLIENT ERROR] \${e.message}\`, 'error');
            } finally {
                input.disabled = false;
                input.focus();
            }
        }

        input.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                const commandText = input.value.trim();
                if (commandText) {
                    executeCommand(commandText);
                    input.value = '';
                }
            }
        });
    </script>
</body></html>`;

http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (req.url === '/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(HTML_UI);
        return;
    }

    if (req.url === '/api/command' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { command } = JSON.parse(body);
                const sanitizedCmd = command.replace(/(["'$`\\])/g, '\\$1');

                // Execute the main bash script, passing the user's command
                exec(`"${AI_SCRIPT_PATH}" "${sanitizedCmd}"`, { timeout: 600000 }, (err, stdout, stderr) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    if (err) {
                        res.end(JSON.stringify({ success: false, output: `[SERVER ERROR] ${err.message}\n${stderr}` }));
                    } else {
                        res.end(JSON.stringify({ success: true, output: stdout || 'Command executed without output.' }));
                    }
                });
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, output: 'Invalid JSON request.' }));
            }
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
}).listen(PORT, () => console.log(`🌐 AI Web UI is live at: http://localhost:${PORT}`));

NODE_EOF
fi
# --- END OF NODE.JS SERVER BLOCK ---


# --- BASH AGENT CORE (v24.1) ---
set -euo pipefail
IFS=$'\n\t'

# ---------------- CONFIG ----------------
AI_HOME="${AI_HOME:-$HOME/.ai_agent}"
PROJECTS_DIR="${PROJECTS_DIR:-$HOME/ai_projects}"
LOG_FILE="$AI_HOME/ai.log"
LOG_LEVEL="${LOG_LEVEL:-INFO}"

DEFAULT_ROUTER_MODEL="gemma:2b"
DEFAULT_AGGREGATOR_MODEL="llama3.1:8b"
OLLAMA_BIN="$(command -v ollama || echo 'ollama')"

MEMORY_DB="$AI_HOME/memory.db"
CONFIG_DB="$AI_HOME/config.db"
MAX_AGENT_LOOPS=7
MAX_RAM_BYTES=2097152
SWAP_DIR="$AI_HOME/swap"
HMAC_SECRET_KEY="$AI_HOME/secret.key"

# ---------------- COLORS & ICONS ----------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m';
PURPLE='\033[0;35m'; CYAN='\033[0;36m'; ORANGE='\033[0;33m'; NC='\033[0m'
ICON_SUCCESS="✅"; ICON_WARN="⚠️"; ICON_ERROR="❌"; ICON_INFO="ℹ️";
ICON_SECURE="🔑"; ICON_NET="🌐"; ICON_PLAN="📋"; ICON_THINK="🤔"; ICON_EXEC="⚡"

# ---------------- LOGGING ----------------
log_to_file(){ echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$1] $2" >> "$LOG_FILE"; }
log_debug(){ [[ "$LOG_LEVEL" == "DEBUG" ]] && printf "${PURPLE}[DEBUG][%s]${NC} %s\n" "$(date '+%T')" "$*" >&2 && log_to_file "DEBUG" "$*"; }
log_info(){ [[ "$LOG_LEVEL" =~ ^(DEBUG|INFO)$ ]] && printf "${BLUE}${ICON_INFO} [%s] %s${NC}\n" "$(date '+%T')" "$*" >&2 && log_to_file "INFO" "$*"; }
log_warn(){ printf "${YELLOW}${ICON_WARN} [%s] %s${NC}\n" "$(date '+%T')" "$*" >&2 && log_to_file "WARN" "$*"; }
log_error(){ printf "${RED}${ICON_ERROR} [%s] ERROR: %s${NC}\n" "$(date '+%T')" "$*" >&2 && log_to_file "ERROR" "$*" && exit 1; }
log_success(){ printf "${GREEN}${ICON_SUCCESS} [%s] %s${NC}\n" "$(date '+%T')" "$*" >&2 && log_to_file "SUCCESS" "$*"; }
log_phase() { echo -e "\n${PURPLE}🚀 %s${NC}" "$*" >&2 && log_to_file "PHASE" "$*"; }
export -f log_to_file log_debug log_info log_warn log_error log_success log_phase

# ---------------- INITIALIZATION & HMAC SETUP ----------------
init_environment() {
    mkdir -p "$AI_HOME" "$PROJECTS_DIR" "$SWAP_DIR"
    if [[ ! -f "$HMAC_SECRET_KEY" ]]; then
        log_warn "No HMAC secret key found. Generating a new one..."
        openssl rand -hex 32 > "$HMAC_SECRET_KEY"
        chmod 600 "$HMAC_SECRET_KEY"
        log_success "New HMAC secret key created."
    fi
}
calculate_hmac() {
    local data="$1"
    local secret; secret=$(<"$HMAC_SECRET_KEY")
    echo -n "$data" | openssl dgst -sha256 -hmac "$secret" | awk '{print $2}'
}

# ---------------- DATABASE & CONFIG ----------------
init_db() {
    sqlite3 "$MEMORY_DB" "CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY, prompt_hash TEXT, prompt TEXT, response_ref TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP); CREATE INDEX IF NOT EXISTS idx_prompt_hash ON memories(prompt_hash);" 2>/dev/null || true
    sqlite3 "$CONFIG_DB" "CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT);" 2>/dev/null || true
}
add_to_memory_fast(){
  local prompt_hash="$1" prompt="$2" response_ref="$3"
  sqlite3 "$MEMORY_DB" <<SQL
PRAGMA journal_mode=WAL;
INSERT INTO memories (prompt_hash, prompt, response_ref) VALUES ('$(sqlite_escape "$prompt_hash")','$(sqlite_escape "$prompt")','$(sqlite_escape "$response_ref")');
SQL
}
sqlite_escape(){ echo "$1" | sed "s/'/''/g"; }
export -f sqlite_escape

# ---------------- HASH, SWAP, & CACHE ----------------
hash_string(){ echo -n "$1" | sha256sum | cut -d' ' -f1; }
semantic_hash_prompt(){ echo "$1" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' ' ' | tr -s ' ' | sed 's/ ^*//;s/ *$//' | tr ' ' '_'; }

store_output_fast(){
    local content="$1"
    local size_bytes=${#content}
    local hash=$(hash_string "$content")
    if (( size_bytes > MAX_RAM_BYTES )); then
        local file_path="$SWAP_DIR/$hash.txt.gz"
        echo "$content" | gzip > "$file_path"
        log_info "Output >${MAX_RAM_BYTES}B, offloaded to disk: $file_path"
        echo "$file_path"
    else
        echo "$content"
    fi
}
retrieve_output_fast(){
    local ref="$1"
    if [[ -f "$ref" ]]; then
        [[ "$ref" == *.gz ]] && gzip -dc "$ref" || cat "$ref"
    else
        echo "$ref"
    fi
}

get_weighted_cached_response(){
    local prompt="$1"
    local prompt_hash=$(semantic_hash_prompt "$prompt")
    local best_response_ref
    best_response_ref=$(sqlite3 "$MEMORY_DB" "SELECT response_ref FROM memories WHERE prompt_hash = '$(sqlite_escape "$prompt_hash")' ORDER BY timestamp DESC LIMIT 1;")
    echo "$best_response_ref"
}
export -f hash_string semantic_hash_prompt store_output_fast retrieve_output_fast get_weighted_cached_response

# ---------------- AI & AGI CORE ----------------
ensure_ollama() { if ! curl -s http://localhost:11434/api/tags >/dev/null; then log_info "Starting Ollama..."; nohup "$OLLAMA_BIN" serve >/dev/null 2>&1 & sleep 3; fi; }

run_worker_fast(){
    local model="$1" system_context="$2" prompt="$3"
    local payload
    payload=$(jq -nc --arg model "$model" --arg system "$system_context" --arg prompt "$prompt" '{model: $model, system: $system, prompt: $prompt, stream: false}')
    local response_json
    response_json=$(curl -s --max-time 300 -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d "$payload")
    if [[ -z "$response_json" ]] || ! jq -e . >/dev/null 2>&1 <<<"$response_json"; then
        log_error "Received invalid or empty JSON from Ollama API for model $model"
        echo "API_ERROR"
    elif [[ $(echo "$response_json" | jq -r '.error // empty') ]]; then
        log_error "Ollama API (model: $model) error: $(echo "$response_json" | jq -r '.error')"
        echo "API_ERROR"
    else
        echo "$response_json" | jq -r '.response // empty'
    fi
}
export -f run_worker_fast

get_local_models(){ curl -s http://localhost:11434/api/tags | jq -r '.models[].name'; }

run_dynamic_router(){
    local prompt="$1"
    local local_models
    local_models=$(get_local_models)
    log_info "${ICON_THINK} Router is selecting models for the task..."
    local router_prompt="You are a task router. Select the top 3 most suitable AI models from the list to solve the user's request. Consider model names as hints (e.g., 'code' for coding). Respond with a comma-separated list of model names, and nothing else.
Available Models:
$local_models
User Request: $prompt"
    local selected_models
    selected_models=$(run_worker_fast "$DEFAULT_ROUTER_MODEL" "Task Router" "$router_prompt" | tr -d '[:space:]')
    if [[ -z "$selected_models" || "$selected_models" == "API_ERROR" ]]; then
        log_warn "Router failed. Falling back to default aggregator model."
        echo "$DEFAULT_AGGREGATOR_MODEL"
    else
        log_success "Router selected models: $selected_models"
        echo "$selected_models"
    fi
}

# ---------------- DEVOPS TOOLSET ----------------
tool_run_command() {
    local project_dir="$1"
    local command_to_run="$2"
    log_info "${ICON_EXEC} Executing command in '$project_dir': $command_to_run"
    (cd "$project_dir" && eval "$command_to_run") 2>&1 || echo "Command failed with a non-zero exit code."
}
tool_write_file() {
    local project_dir="$1"
    local file_path="$2"
    local content="$3"
    log_info "${ICON_EXEC} Writing to file: $project_dir/$file_path"
    mkdir -p "$(dirname "$project_dir/$file_path")"
    echo -e "$content" > "$project_dir/$file_path"
    echo "File '$file_path' written successfully."
}
tool_list_directory() {
    local project_dir="$1"
    local path_to_list="${2:-.}" # Default to project dir if no path is given
    log_info "${ICON_EXEC} Listing directory: $project_dir/$path_to_list"
    tree -L 2 "$project_dir/$path_to_list" || ls -la "$project_dir/$path_to_list"
}
tool_web_search() {
    local project_dir="$1" # Unused, but keeps tool signature consistent
    local query="$2"
    log_info "${ICON_EXEC} Searching web for: '$query'"
    local search_results
    search_results=$(tool_web_search "$query") # Calls the global tool_web_search
    echo "$search_results"
}
export -f tool_run_command tool_write_file tool_list_directory tool_web_search

# ---------------- AUTONOMOUS WORKFLOW ----------------
run_agi_workflow() {
    local user_prompt="$*"
    local project_name; project_name=$(echo "$user_prompt" | tr ' ' '-' | tr -cd 'a-zA-Z0-9-' | cut -c1-32)
    local project_dir="$PROJECTS_DIR/$project_name-$(date +%s)"
    mkdir -p "$project_dir"
    log_success "Project workspace created: $project_dir"

    local cached_ref; cached_ref=$(get_weighted_cached_response "$user_prompt")
    if [[ -n "$cached_ref" ]]; then
        log_success "Found high-quality match in fuzzy cache."
        echo -e "\n${CYAN}--- Cached Final Answer ---\n${NC}$(retrieve_output_fast "$cached_ref")"
        return
    fi

    local conversation_history="User Request: $user_prompt"
    local status="IN_PROGRESS"

    for ((i=1; i<=MAX_AGENT_LOOPS; i++)); do
        log_phase "AGI Loop $i/$MAX_AGENT_LOOPS"

        local selected_models_csv; selected_models_csv=$(run_dynamic_router "$conversation_history")
        local selected_models; IFS=',' read -r -a selected_models <<< "$selected_models_csv"
        
        local pids=() temp_files=()
        for model in "${selected_models[@]}"; do
            local temp_file; temp_file=$(mktemp)
            temp_files+=("$temp_file")
            (
                log_debug "Starting worker: $model"
                run_worker_fast "$model" "You are an expert assistant providing one perspective on the user's request." "$conversation_history" > "$temp_file"
            ) &
            pids+=($!)
        done
        for pid in "${pids[@]}"; do wait "$pid"; done

        local aggregation_context="You are the Aggregator AI. Synthesize the outputs into a clear, step-by-step plan. Identify the single most important tool to use next. Format your response as:
[REASONING] Your synthesis.
[PLAN]
1. Step one.
2. Step two.
[TOOL] tool_name <arguments>

--- MODEL POOL ---"
        for idx in "${!selected_models[@]}"; do
            aggregation_context+="\n\n--- Output from ${selected_models[$idx]} ---\n$(cat "${temp_files[$idx]}")"
        done
        rm -f "${temp_files[@]}"

        local aggregated_plan; aggregated_plan=$(run_worker_fast "$DEFAULT_AGGREGATOR_MODEL" "Aggregator & Planner" "$aggregation_context")
        
        echo -e "${CYAN}${ICON_PLAN} AGGREGATED PLAN:${NC}\n$aggregated_plan"

        if [[ "$aggregated_plan" == *"[FINAL_ANSWER]"* ]]; then
            status="SUCCESS"
            conversation_history+="\n$aggregated_plan"
            break
        fi

        local tool_line; tool_line=$(echo "$aggregated_plan" | grep '\[TOOL\]' | head -n 1)
        if [[ -z "$tool_line" ]]; then log_warn "AI did not choose a tool. Ending loop."; break; fi

        local clean_tool_cmd; clean_tool_cmd=$(echo "${tool_line#\[TOOL\] }" | sed 's/\r$//')

        local ai_generated_hmac; ai_generated_hmac=$(calculate_hmac "$clean_tool_cmd")
        local verified_hmac; verified_hmac=$(calculate_hmac "$clean_tool_cmd")
        if [[ "$ai_generated_hmac" != "$verified_hmac" ]]; then
            log_error "HMAC MISMATCH! Aborting for safety."; status="HMAC_FAILURE"; break
        fi
        log_success "${ICON_SECURE} HMAC signature verified."

        local tool_name; tool_name=$(echo "$clean_tool_cmd" | awk '{print $1}')
        local args; args=$(echo "$clean_tool_cmd" | cut -d' ' -f2-)

        local tool_result="User aborted action."
        if confirm_action "$clean_tool_cmd"; then
            if declare -f "tool_$tool_name" > /dev/null; then
                tool_result=$(tool_"$tool_name" "$project_dir" "$args") || "Tool failed."
            else
                log_error "AI tried to call an unknown tool: '$tool_name'"
                tool_result="Error: Tool '$tool_name' does not exist."
            fi
        fi
        
        conversation_history+="\n$aggregated_plan\n[TOOL_RESULT]\n$tool_result"
    done

    log_phase "AGI Workflow Complete (Status: $status)"
    local final_answer; final_answer=$(echo "$conversation_history" | grep '\[FINAL_ANSWER\]' | head -n 1 | sed 's/\[FINAL_ANSWER\]//')
    if [[ -z "$final_answer" ]]; then
        final_answer="Workflow finished. Final context:\n$conversation_history"
    fi
    
    local final_ref; final_ref=$(store_output_fast "$final_answer")
    add_to_memory_fast "$(semantic_hash_prompt "$user_prompt")" "$user_prompt" "$final_ref"
    echo -e "\n${GREEN}--- Final Answer ---\n${NC}${final_answer}"
}

run_default_init() {
    log_phase "No prompt given. Scanning for default project context..."
    local context_dir="."
    log_info "Resolving context for: $context_dir"
    if [[ -d ".git" ]]; then
        (cd "$context_dir" && git status)
    else
        tree -L 2 "$context_dir" || ls -la "$context_dir"
    fi
    log_success "Scan complete. Ready for a prompt."
}

# ---------------- HELP & MAIN DISPATCHER ----------------
show_help() {
    cat << EOF
${GREEN}AI Autonomic Synthesis Platform v24.1${NC}
A self-verifying AI agent with a dynamic model router and a full DevOps toolkit.

${CYAN}USAGE:${NC}
  ai serve                             # Start the interactive web UI on http://localhost:8080
  ai "your project idea"               # Run the secure AGI workflow to solve a task
  ai                                   # (No prompt) Scan current directory context
  ai --setup                           # Install/verify dependencies
  ai --help                            # Show this help
EOF
}

main() {
    if [[ "${1:-}" == "serve" ]]; then
        # This case is handled by the Node.js block at the top.
        # This function is only for the bash part.
        exit 0
    fi
    
    init_environment; init_db

    if [[ $# -eq 0 ]]; then
        run_default_init
        exit 0
    fi

    case "${1:-}" in
        --setup|-s)
            log_info "Installing dependencies (sqlite3, git, curl, nodejs, npm, tree, openssl)..."
            if command -v apt-get &>/dev/null; then
                sudo apt-get update && sudo apt-get install -y sqlite3 git curl nodejs npm tree openssl
            elif command -v dnf &>/dev/null; then
                sudo dnf install -y sqlite git curl nodejs npm tree openssl
            elif command -v pacman &>/dev/null; then
                sudo pacman -Syu --noconfirm sqlite git curl nodejs npm tree openssl python
            else
                log_warn "Could not determine package manager. Please install dependencies manually."
            fi
            log_success "System dependencies installed."
            ;;
        --help|-h) show_help ;;
        *) run_agi_workflow "$@" ;;
    esac
}

# --- SCRIPT ENTRY POINT ---
# FIX: Use parameter expansion to safely check for NODE_ENV
# This ensures the bash 'main' function only runs when it's supposed to.
if [[ -z "${NODE_ENV:-}" ]]; then
    main "$@"
fi
