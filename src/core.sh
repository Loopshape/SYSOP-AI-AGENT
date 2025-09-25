#!/usr/bin/env bash

# --- AI MODEL INTERACTION ---
ensure_ollama_server() {
    if ! command -v "$OLLAMA_BIN" &> /dev/null; then log_error "Ollama not found at '$OLLAMA_BIN'. Check config.json."; fi
    if ! pgrep -f "ollama serve" >/dev/null; then
        log "Ollama server starting in background..."
        nohup "$OLLAMA_BIN" serve >/dev/null 2>&1 &
        sleep 3
    fi
}

run_model_streaming() {
    local model="$1" prompt="$2"
    ensure_ollama_server
    if ! "$OLLAMA_BIN" list | grep -q "^${model}"; then
        log_warn "Model '$model' not found locally. Pulling..."
        "$OLLAMA_BIN" pull "$model"
    fi
    log_info "Querying model ${CYAN}$model${NC}... Output will stream below."
    echo -e "${GREEN}--- AI Response (Live Stream) ---${NC}"
    
    # Use process substitution to capture the full response while streaming
    local full_response
    full_response=$("$OLLAMA_BIN" run "$model" "$prompt" | tee /dev/tty)
    echo "$full_response"
}

# --- CODER-AGI WORKFLOW (Default Agent Mode) ---
run_coder_agi_agent() {
    local user_prompt="$*"
    local project_name; project_name=$(echo "$user_prompt" | tr ' ' '-' | tr -cd 'a-zA-Z0-9-' | cut -c1-32)
    local project_dir="$PROJECTS_DIR/$project_name"
    mkdir -p "$project_dir"; cd "$project_dir"
    log_success "Created project workspace: $project_dir"

    local language; language=$(run_model_streaming "$AGENT_MODEL" "Detect programming language from prompt (e.g., python, javascript). Output ONLY the name. Prompt: $user_prompt")
    local main_file="main.${language/javascript/js}"; local test_file="test_main.${language/javascript/js}"
    log_info "Detected language: $language. Main file will be '$main_file'"

    local code="" review="" tests="" test_output="" status="IN_PROGRESS"
    for (( i=1; i<=MAX_AGENT_LOOPS; i++ )); do
        log_phase "Coder-AGI Loop $i/$MAX_AGENT_LOOPS - STATUS: $status"
        # 1. Coder
        local coder_prompt="You are CODER. Write a complete script for '$main_file'. Output ONLY code. Request: $user_prompt. Feedback: ${review:-None}. Test Errors: ${test_output:-None}"
        code=$(run_model_streaming "$CODER_MODEL" "$coder_prompt"); echo "$code" > "$main_file"; log_success "Coder wrote v$i of '$main_file'."
        # 2. Reviewer
        review=$(run_model_streaming "$REVIEWER_MODEL" "You are REVIEWER. Critique this code. If perfect, respond ONLY with 'LGTM'. Code:\n$code"); log_success "Reviewer provided feedback."
        # 3. Refinement
        if [[ "$review" != "LGTM" ]]; then
            code=$(run_model_streaming "$CODER_MODEL" "You are CODER. Refactor based on review. Output ONLY code.\nReview:\n$review\nCode:\n$code"); echo "$code" > "$main_file"; log_success "Coder refined '$main_file'."
        fi
        # 4. Tester
        tests=$(run_model_streaming "$TESTER_MODEL" "You are TESTER. Write a test script for '$test_file' to validate the code. Output ONLY code.\nCode:\n$code"); echo "$tests" > "$test_file"; log_success "Tester wrote '$test_file'."
        # 5. Verification
        log_phase "VERIFICATION"; if ! confirm_action "Run the generated tests ('$test_file')?"; then status="MANUAL_VERIFICATION"; break; fi
        local test_cmd=""; case "$language" in python) test_cmd="pip install pytest > /dev/null && python3 -m pytest $test_file";; javascript) test_cmd="npm install jest > /dev/null && npx jest $test_file";; *) status="MANUAL_VERIFICATION"; break;; esac
        test_output=$(tool_run_command "$project_dir" "$test_cmd")
        if [[ $? -eq 0 && ! "$test_output" =~ "failed" ]]; then log_success "All tests passed!"; status="SUCCESS"; break;
        else log_warn "Tests failed. Retrying."; echo -e "${RED}--- TEST OUTPUT ---${NC}\n$test_output"; status="TESTS_FAILED"; fi
    done
    add_memory "agent" "$user_prompt" "Project: $project_name" "$status"
    log_phase "AGENT FINISHED - FINAL STATUS: $status"; log_info "All artifacts are in: $project_dir"
}

# --- TRIUMVIRATE AGENT MODE ---
run_triumvirate_agent() {
    log_phase "Activating Triumvirate Agent"
    log_warn "This is a conceptual agent mode for high-level planning."
    # Placeholder for the advanced logic from v8.1 (with tools, loops, etc.)
    run_model_streaming "$TRADER_MODEL" "Act as an expert agent. The user's request is: $*"
}