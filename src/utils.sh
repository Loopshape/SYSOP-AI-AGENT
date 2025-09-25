#!/usr/bin/env bash

# --- COLORS & LOGGING ---
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; PURPLE='\033[0;35m'; CYAN='\033[0;36m'; NC='\033[0m'
log() { printf "${BLUE}[%s]${NC} %s\n" "$(date '+%T')" "$*"; }
log_success() { log "${GREEN}$*${NC}"; }
log_warn() { log "${YELLOW}WARN: $*${NC}"; }
log_error() { log "${RED}ERROR: $*${NC}"; exit 1; }
log_info() { log "${CYAN}$*${NC}"; }
log_phase() {
    echo -e "\n${PURPLE}▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓${NC}"
    log "${PURPLE}$*${NC}"
}

# --- HELP TEXT ---
show_help() {
    cat <<EOF
${GREEN}SYSOP-AI-AGENT v10.0 - The Grand Unification Edition${NC}

A unified AI agent that can act as an autonomous software developer or as a
direct-action Git Assistant.

${CYAN}MODES OF OPERATION:${NC}
  ${GREEN}ai agent${NC} "prompt"             (Default) Activates the Coder-AGI to build & test a solution.
  ${GREEN}ai triumvirate${NC} "prompt"     Activates the conceptual Triumvirate Mind agent.
  ${GREEN}ai git${NC} <op> [path]            Acts as a Git assistant. Ops: status, pull, push.

${CYAN}UTILITY COMMANDS:${NC}
  ${GREEN}ai config${NC} <view|get|set>     Manage agent configuration.
  ${GREEN}ai memory${NC} <search|clear>     Manage the agent's long-term memory.
  ${GREEN}ai --setup${NC}                    Run the installer to setup dependencies and config.
  ${GREEN}ai --help${NC}                     Show this help message.

${CYAN}EXAMPLE:${NC}
  ai "Create a Python Flask API with a single route that returns a JSON message"
EOF
}