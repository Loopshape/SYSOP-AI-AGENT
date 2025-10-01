#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

CLI_HOME="${CLI_HOME:-$HOME/.local/cli}"
DB="${DB:-$CLI_HOME/cli.sqlite}"
SNAPSHOT_DIR="${SNAPSHOT_DIR:-$CLI_HOME/snapshots}"
VERBOSE=${VERBOSE:-1}
DRY_RUN=0

mkdir -p "$CLI_HOME" "$SNAPSHOT_DIR"

log() { local level="$1"; shift; [[ $VERBOSE -ge $level ]] && echo "[ai] $*"; }
error() { echo "[ai][ERROR] $*" >&2; }
sql_escape() { printf "%s" "$1" | sed "s/'/''/g"; }
run_sql() { local sql="$1"; [[ $DRY_RUN -eq 1 ]] && log 2 "DRY-RUN SQL: $sql" || sqlite3 "$DB" "$sql"; }
sha256_file() { sha256sum "$1" | awk '{print $1}'; }

# ------------------------
# DB init
# ------------------------
init_db() {
  log 1 "Initializing DB: $DB"
  [[ $DRY_RUN -eq 1 ]] && return
  sqlite3 "$DB" <<SQL
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS projects(id INTEGER PRIMARY KEY, path TEXT, hash TEXT UNIQUE, snapshot TEXT, ts DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS file_hashes(id INTEGER PRIMARY KEY, project_hash TEXT, file_path TEXT, file_hash TEXT, context TEXT);
CREATE TABLE IF NOT EXISTS ai_data(id INTEGER PRIMARY KEY, repo_hash TEXT, layer TEXT, data_hash TEXT, storage_path TEXT, content TEXT, ts DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_ai_repo_layer ON ai_data(repo_hash,layer);
SQL
}

# ------------------------
# Resolve refs & extract
# ------------------------
resolve_ref_to_abs() { local base="$1"; local ref="$2"
  [[ -z "$ref" ]] && echo "" && return
  ref=$(echo "$ref" | sed -E "s/^['\"]|['\"]$//g;s/^\s+|\s+$//g")
  [[ "$ref" =~ ^(https?:|//|data:|mailto:) ]] && echo "" && return
  [[ "$ref" == /* ]] && echo "$(readlink -f "$ref")" && return
  echo "$(readlink -f "$base/$ref" 2>/dev/null || echo "")"
}

extract_refs_from_file() { local file="$1"; [[ -f "$file" ]] || return
  local ext="${file##*.}"; local base="$(dirname "$file")"
  case "$ext" in
    sh|bash) grep -E "^(source|\.)[[:space:]]+" "$file" | awk '{print $2}'; grep -E "# *ref:" "$file" | sed -E 's/.*# *ref:[ ]*//';;
    json) grep -Eo '"(\\$ref|import)"\s*:\s*"[^"]+"' "$file" | sed -E 's/.*:\s*"([^"]+)"/\1/';;
    yml|yaml) grep -E "(^|\s)(include|import|\\$ref):" "$file" | sed -E 's/.*: *"?([^" ]+)"?.*/\1/';;
    html|htm) grep -Eoi '<(script|link|img|iframe|source)[^>]+(src|href)="[^"]+"' "$file" | sed -E 's/.*(src|href)="([^"]+)".*/\2/';;
    js) grep -Eo "import[^;]+from\s+['\"][^'\"]+['\"]" "$file" | sed -E 's/.*from\s+["\']([^"\']+)["\'].*/\1/'; grep -Eo "require\(['\"][^'\"]+['\"]\)" "$file" | sed -E 's/require\(['\"]([^'\"]+)['\"]\).*/\1/';;
    *) grep -Eo "(src|href)=[\"'][^\"']+[\"']" "$file" | sed -E 's/.*=[\"']([^\"']+)[\"'].*/\1/';;
  esac
}

# ------------------------
# Analyze file context
# ------------------------
analyze_context() {
  local file="$1"; [[ -f "$file" ]] || echo "" && return
  local ext="${file##*.}"
  local ctx=""
  case "$ext" in
    sh|bash) ctx=$(grep -E "function|alias|source" "$file" | tr '\n' ';') ;;
    py) ctx=$(grep -E "def |class |import " "$file" | tr '\n' ';') ;;
    js) ctx=$(grep -E "function |class |import " "$file" | tr '\n' ';') ;;
    html|htm) ctx=$(grep -Eo "<(script|link|img|iframe)[^>]+" "$file" | tr '\n' ';') ;;
    css) ctx=$(grep -Eo "[^{}]+\{" "$file" | tr '\n' ';') ;;
    *) ctx=$(head -n 10 "$file" | tr '\n' ';') ;;
  esac
  echo "$ctx"
}

# ------------------------
# Follow refs + dynamic write analysis
# ------------------------
follow_refs_write() {
  local start="$1"; local visited="$(mktemp)"; trap 'rm -f "$visited"' EXIT
  [[ -d "$start" ]] && find "$start" -type f -print0 | while IFS= read -r -d $'\0' f; do echo "$(readlink -f "$f")" >> "$visited"; done
  [[ -f "$start" ]] && echo "$(readlink -f "$start")" >> "$visited"
  local idx=1
  while true; do
    [[ $idx -gt $(wc -l < "$visited") ]] && break
    local cur=$(sed -n "${idx}p" "$visited"); idx=$((idx+1))
    [[ -f "$cur" ]] || continue
    # Extract references
    while IFS= read -r ref; do
      [[ -z "$ref" ]] && continue
      local abs=$(resolve_ref_to_abs "$(dirname "$cur")" "$ref")
      [[ -n "$abs" && -f "$abs" ]] && ! grep -qxF "$abs" "$visited" && echo "$abs" >> "$visited"
    done < <(extract_refs_from_file "$cur")
    # Analyze context + hash + dynamic write
    local ctx=$(analyze_context "$cur")
    local h=$(sha256_file "$cur")
    run_sql "INSERT OR REPLACE INTO file_hashes(project_hash,file_path,file_hash,context) VALUES('$(sql_escape "$h")','$(sql_escape "$cur")','$(sql_escape "$h")','$(sql_escape "$ctx")');"
    log 2 "Analyzed $cur -> $h"
  done
  cat "$visited"
}

# ------------------------
# CLI
# ------------------------
show_help() { cat <<EOF
Usage: ai <command> [args...]
Commands:
  init-db
  follow-refs-write <start-path>
  reloop <start-path> [passes]
  execute-prompt <prompt>
  fetch <url> [method] [data] [headers]
  -v, -vv, -vvv
  --dry-run
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in --dry-run) DRY_RUN=1; shift ;; -v) VERBOSE=1; shift ;; -vv) VERBOSE=2; shift ;; -vvv) VERBOSE=3; shift ;; --) shift; break ;; *) break ;; esac
done

[[ $# -lt 1 ]] && show_help && exit 1
cmd="$1"; shift
case "$cmd" in
  init-db) init_db ;;
  follow-refs-write) [[ $# -ge 1 ]] && follow_refs_write "$1" ;;
  reloop) [[ $# -ge 1 ]] && { passes="${2:-2}"; for ((i=1;i<=passes;i++)); do follow_refs_write "$1"; done } ;;
  execute-prompt) [[ $# -ge 1 ]] && execute_prompt "$*" ;;
  fetch) [[ $# -ge 1 ]] && fetch_api "$1" "${2:-GET}" "${3:-}" "${4:-}" ;;
  -h|--help) show_help ;;
  *) error "unknown command: $cmd"; show_help; exit 1 ;;
esac
