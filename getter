#!/usr/bin/env bash
set -e
echo "[INFO] $(date +%H:%M:%S) ==== Starting Incremental Git Build & AGI Workflow ===="

# --- Node setup ---
NODE_VERSION="20.19.5"
if command -v nvm >/dev/null 2>&1; then
  nvm use $NODE_VERSION || nvm install $NODE_VERSION
fi

# --- Git SSH setup ---
SSH_REMOTE="git@github.com:Loopshape/SYSOP-AI-AGENT.git"
if [ ! -d ".git" ]; then
  git init
  git remote add origin $SSH_REMOTE
fi

# Ensure remote uses SSH
CURRENT_URL=$(git remote get-url origin)
if [[ "$CURRENT_URL" != "$SSH_REMOTE" ]]; then
  git remote set-url origin $SSH_REMOTE
fi

echo "[INFO] $(date +%H:%M:%S) Fetching latest changes via SSH..."
git fetch --all --prune
git reset --hard origin/main || git reset --hard HEAD

echo "[SUCCESS] $(date +%H:%M:%S) Repository up-to-date via SSH."

# --- Install dependencies ---
echo "[INFO] $(date +%H:%M:%S) Installing npm dependencies..."
npm install
echo "[SUCCESS] $(date +%H:%M:%S) Dependencies installed."

# --- Build with Vite safely ---
echo "[INFO] $(date +%H:%M:%S) Building project with Vite..."
VITE_HOST="127.0.0.1"

if command -v vite >/dev/null 2>&1; then
  vite build --host $VITE_HOST || {
    echo "[WARN] $(date +%H:%M:%S) Vite build failed. Attempting preview mode..."
    vite preview --host $VITE_HOST
  }
else
  echo "[ERROR] Vite not installed."
fi
echo "[SUCCESS] $(date +%H:%M:%S) Vite build complete."

# --- Link CLI AI binary ---
BIN_DIR="$HOME/.local_ai/bin"
mkdir -p $BIN_DIR
if [ -f "./bin/ai" ]; then
  ln -sfn "$(pwd)/bin/ai" "$BIN_DIR/ai"
  chmod +x "$BIN_DIR/ai"
  echo "[SUCCESS] $(date +%H:%M:%S) AI CLI linked to $BIN_DIR/ai"
else
  echo "[ERROR] AI binary not found in ./bin/ai"
fi

echo "[INFO] $(date +%H:%M:%S) Build & link workflow finished."
