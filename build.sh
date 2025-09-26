#!/usr/bin/env bash
# build.sh - A Shell-Based Bundler for Node.js Applications (ESM Compatible)
# This script packages a Node.js app (including node_modules) into a single,
# self-extracting, executable shell script.

set -euo pipefail
IFS=$'\n\t'

# --- CONFIGURATION ---
APP_ENTRY_POINT="server.js"
PUBLIC_DIR="public"
OUTPUT_FILE="ai-server.sh"
TEMP_ARCHIVE="app.tar.gz"

# --- COLORS & ICONS ---
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ICON_SUCCESS="✅"; ICON_INFO="ℹ️"; ICON_ERROR="❌"

# --- LOGGING ---
log() { printf "${BLUE}${ICON_INFO} %s${NC}\n" "$*"; }
log_success() { printf "${GREEN}${ICON_SUCCESS} %s${NC}\n" "$*"; }
log_error() { printf "${RED}${ICON_ERROR} ERROR: %s${NC}\n" "$*"; exit 1; }

# --- MAIN BUNDLER LOGIC ---
main() {
    log "Starting the application bundler..."

    # 1. --- Prerequisite Checks ---
    log "Checking for required tools (node, npm, tar, base64)..."
    command -v node >/dev/null || log_error "Node.js is not installed. Please install it to continue."
    command -v npm >/dev/null || log_error "npm is not installed. Please install it to continue."
    command -v tar >/dev/null || log_error "tar is not installed."
    command -v base64 >/dev/null || log_error "base64 is not installed."
    
    log "Checking for required application files..."
    [[ -f "$APP_ENTRY_POINT" ]] || log_error "Application entry point '$APP_ENTRY_POINT' not found."
    [[ -d "$PUBLIC_DIR" ]] || log_error "Public directory '$PUBLIC_DIR' not found."

    # 2. --- Install/Verify Dependencies ---
    log "Ensuring all dependencies are installed locally..."
    if [[ ! -d "node_modules/express" || ! -d "node_modules/sqlite3" ]]; then
        log "Dependencies missing. Running 'npm install express sqlite3'..."
        npm install express sqlite3
    else
        log "Dependencies already exist."
    fi

    # 3. --- Create Temporary Archive ---
    log "Creating a compressed archive of the application..."
    # We also need package.json for module resolution
    tar -czf "$TEMP_ARCHIVE" "$APP_ENTRY_POINT" "$PUBLIC_DIR" "node_modules" "package.json" "package-lock.json"
    log_success "Archive '$TEMP_ARCHIVE' created."

    # 4. --- Build the Self-Extracting Script ---
    log "Building the single-file executable: '$OUTPUT_FILE'..."

    # Create the header of the final script. This is the "runner" logic.
    cat > "$OUTPUT_FILE" <<'EOF'
#!/usr/bin/env bash
set -e

# --- Self-Extracting Runner ---
export AI_APP_TEMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'ai-app')

cleanup() {
    printf "\nCleaning up temporary files...\n"
    rm -rf "$AI_APP_TEMP_DIR"
}
trap cleanup EXIT

PAYLOAD_LINE=$(awk '/^__PAYLOAD_BELOW__/ {print NR + 1; exit 0; }' "$0")

tail -n +$PAYLOAD_LINE "$0" | base64 --decode | tar -xzf - -C "$AI_APP_TEMP_DIR"

echo "Starting AI DevOps Platform (ESM)..."
# --- MODIFICATION FOR ESM ---
# We now tell Node.js to treat the entry point as an ES Module.
node --input-type=module --eval "import('./$AI_APP_TEMP_DIR/server.js')"

exit 0

# Do not edit below this line
__PAYLOAD_BELOW__
EOF

    # 5. --- Append the Archive Payload ---
    log "Encoding and appending the application archive..."
    base64 "$TEMP_ARCHIVE" >> "$OUTPUT_FILE"

    # 6. --- Finalize ---
    log "Cleaning up temporary files..."
    rm "$TEMP_ARCHIVE"
    chmod +x "$OUTPUT_FILE"

    log_success "Build complete!"
    echo -e "\n${YELLOW}Your self-contained ESM application is ready: ./${OUTPUT_FILE}${NC}"
    echo "You can now copy this single file to any machine with Node.js and run it."
}

# --- ENTRY POINT ---
main
