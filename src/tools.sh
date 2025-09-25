#!/usr/bin/env bash

# --- CORE AGENT TOOLS ---
confirm_action() {
    echo -e "\n${YELLOW}PROPOSED ACTION:${NC} ${CYAN}$1${NC}"
    read -p "Approve? [y/N] " -n 1 -r c; echo
    [[ "$c" =~ ^[Yy]$ ]]
}

tool_read_file() {
    if [[ -f "$1" ]]; then cat "$1"; else echo "Error: File not found."; fi
}

tool_list_directory() {
    tree -L 2 "${1:-.}"
}

tool_write_file() {
    local path="$1" content="$2"
    if confirm_action "Write to file: $path"; then
        mkdir -p "$(dirname "$path")"
        echo -e "$content" > "$path"
        echo "Success: File written."
    else
        echo "User aborted."
    fi
}

tool_run_command() {
    local cwd="$1" cmd="$2"
    if confirm_action "Run command in '$cwd': $cmd"; then
        (cd "$cwd" && eval "$cmd") 2>&1 || true
    else
        echo "User aborted."
    fi
}


# --- GIT & SSH ASSISTANT TOOLS ---
setup_ssh_key() {
    local key_content="$1"
    echo -e "$key_content" > "$GIT_SSH_KEY"; chmod 600 "$GIT_SSH_KEY"
    printf '%s\n' \
        "Host *" \
        "    IdentityFile $GIT_SSH_KEY" \
        "    IdentitiesOnly yes" \
        > "$SSH_DIR/config"
    chmod 600 "$SSH_DIR/config"; log_success "SSH key configured."
}

git_operation() {
    local op="$1" repo_path="${2:-.}"
    if [[ ! -d "$repo_path/.git" ]]; then log_error "Not a git repository: $repo_path"; fi
    cd "$repo_path"; log_phase "Git $op"
    case "$op" in
        status) git status;;
        pull) GIT_SSH_COMMAND="ssh -i $GIT_SSH_KEY" git pull;;
        push)
            git add .
            read -p "Commit message: " msg
            git commit -m "${msg:-ai: auto-commit}"
            GIT_SSH_COMMAND="ssh -i $GIT_SSH_KEY" git push
            ;;
        *) log_error "Unknown git op: $op";;
    esac
}