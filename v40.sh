# ------------------------
# AI Prompt Executor
# ------------------------
execute_prompt(){
  local prompt="$1"
  log 1 "Executing prompt: $prompt"

  # Example heuristics (expandable)
  if [[ "$prompt" =~ ingest\ (.+) ]]; then
    local path="${BASH_REMATCH[1]}"
    init_db
    reloop "$path" "default"
  elif [[ "$prompt" =~ fetch\ REST\ (.+) ]]; then
    local url="${BASH_REMATCH[1]}"
    fetch_rest "$url"
  elif [[ "$prompt" =~ fetch\ SOAP\ (.+)\ (.+) ]]; then
    local endpoint="${BASH_REMATCH[1]}"
    local body="${BASH_REMATCH[2]}"
    fetch_soap "$endpoint" "$body"
  elif [[ "$prompt" =~ compile\ (.+) ]]; then
    compile_source "${BASH_REMATCH[1]}"
  elif [[ "$prompt" =~ debug\ (.+) ]]; then
    debug_source "${BASH_REMATCH[1]}"
  elif [[ "$prompt" =~ qeval\ (.+) ]]; then
    eval_qbit_expr "${BASH_REMATCH[1]}"
  else
    log 1 "Prompt not recognized: running generic ingest and reloop"
    local tmpdir="$(mktemp -d)"
    echo "$prompt" > "$tmpdir/prompt.txt"
    reloop "$tmpdir" "prompt-layer"
  fi
}
