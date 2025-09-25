#!/usr/bin/env bash

set -euo pipefail
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
source "$SCRIPT_DIR/src/utils.sh"

log_phase "SYSOP-AI-AGENT Installer"

# 1. Check Dependencies
log_info "Checking for required system dependencies..."
if ! command -v sqlite3 &>/dev/null || ! command -v git &>/dev/null || ! command -v tree &>/dev/null || ! command -v jq &>/dev/null || ! command -v curl &>/dev/null || ! command -v ollama &>/dev/null; then
    log_warn "One or more dependencies (sqlite3, git, tree, jq, curl, ollama) are missing."
    if command -v apt-get &>/dev/null; then
        log_info "Attempting to install via apt-get..."
        sudo apt-get update && sudo apt-get install -y sqlite3 git tree jq curl
    elif command -v brew &>/dev/null; then
        log_info "Attempting to install via Homebrew..."
        brew install sqlite git tree jq curl
    else
        log_error "Please install the missing dependencies manually."
    fi
    # Ollama requires a separate installation step
    if ! command -v ollama &>/dev/null; then
        log_error "Ollama is not installed. Please install it from https://ollama.ai"
    fi
else
    log_success "All system dependencies are present."
fi


# 2. Create Default Config
CONFIG_DIR="$SCRIPT_DIR/config"
CONFIG_FILE="$CONFIG_DIR/config.json"
mkdir -p "$CONFIG_DIR"
if [[ ! -f "$CONFIG_FILE" ]]; then
    log_info "Creating default configuration file at $CONFIG_FILE..."
    jq -n \
      --arg agent "llama3.1:8b" \
      --arg coder "codellama:7b" \
      --arg reviewer "2244-1" \
      --arg tester "deepseek-coder:6.7b-instruct" \
      --arg messenger "gemma3:1b" \
      --arg combinator "deepseek-r1:1.5b" \
      --arg trader "2244-1" \
      --arg ollama_bin "$(command -v ollama)" \
      '{
        "models": {
          "agent": $agent,
          "coder": $coder,
          "reviewer": $reviewer,
          "tester": $tester,
          "messenger": $messenger,
          "combinator": $combinator,
          "trader": $trader
        },
        "ollama_bin": $ollama_bin
      }' > "$CONFIG_FILE"
    log_success "Default config created."
else
    log_info "Configuration file already exists."
fi

# 3. Initialize Databases
log_info "Initializing data directories and databases..."
bash "$SCRIPT_DIR/bin/ai" config > /dev/null # This will trigger init_db via the main script

# 4. Create Symlink
INSTALL_PATH="${HOME}/.local/bin"
mkdir -p "$INSTALL_PATH"
if [[ -L "$INSTALL_PATH/ai" && "$(readlink "$INSTALL_PATH/ai")" == "$SCRIPT_DIR/bin/ai" ]]; then
    log_info "Symlink 'ai' already exists in $INSTALL_PATH."
else
    ln -sf "$SCRIPT_DIR/bin/ai" "$INSTALL_PATH/ai"
    log_success "Created symlink: $INSTALL_PATH/ai"
fi


# 5. Final Instructions
log_phase "Installation Complete!"
echo
log_info "The 'ai' command is now available."
log_warn "Please ensure '$INSTALL_PATH' is in your shell's PATH."
echo "You can add it to your .bashrc or .zshrc with:"
echo -e "${CYAN}echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc && source ~/.bashrc${NC}"
echo
log_info "You can now run the agent from anywhere, for example:"
echo -e "${CYAN}ai \"Create a python script that prints hello world\"${NC}"