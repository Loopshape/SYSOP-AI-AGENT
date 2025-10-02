#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# ------------------------
# AI CLI v37: multipurpose automated
# ------------------------
CLI_HOME="${CLI_HOME:-$HOME/.local/cli}"
DB="${DB:-$CLI_HOME/cli.sqlite}"
SNAPSHOT_DIR="${SNAPSHOT_DIR:-$CLI_HOME/snapshots}"
VERBOSE=${VERBOSE:-1}
DRY_RUN=0

mkdir -p "$CLI_HOME" "$SNAPSHOT_DIR"

log() { local lvl="$1"; shift; [[ $VERBOSE -ge $lvl ]] && echo "[ai] $*"; }
error() { echo "[ai][ERROR] $*" >&2; }
sql_escape() { printf "%s" "$1" | sed "s/'/''/g"; }
run_sql() { local sql="$1"; [[ $DRY_RUN -eq 1 ]] && log 2 "DRY-RUN SQL: $sql" || sqlite3 "$DB" "$sql"; }
sha256_file() { sha256sum "$1" | awk '{print $1}'; }

# ------------------------
# DB init
# ------------------------
init_db() {
  log 1 "Initializing DB..."
  run_sql "PRAGMA journal_mode=WAL;"
  run_sql "CREATE TABLE IF NOT EXISTS ai_data(
    id INTEGER PRIMARY KEY,
    repo_hash TEXT,
    layer TEXT,
    data_hash TEXT,
    storage_path TEXT,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );"
  run_sql "CREATE INDEX IF NOT EXISTS idx_ai_repo_layer ON ai_data(repo_hash,layer);"
  run_sql "CREATE TABLE IF NOT EXISTS ai_semantics(
    id INTEGER PRIMARY KEY,
    file_path TEXT UNIQUE,
    data_hash TEXT,
    semantic_json TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );"
  log 2 "DB initialized"
}

# ------------------------
# Semantic analysis
# ------------------------
analyze_file_semantics() {
  local f="$1"
  [[ ! -f "$f" ]] && return
  local h=$(sha256_file "$f")
  local tmp="$(mktemp)"
  case "${f##*.}" in
    sh|bash|py|c|cpp|java|js) grep -Eo '(^| )((def|function|class|import|include)[[:space:]]+[a-zA-Z0-9_]+)' "$f" >"$tmp" || true ;;
    html|htm|xhtml|xml|svg) grep -Eo '<[a-zA-Z0-9]+[^>]*>' "$f" >"$tmp" || true ;;
    css) grep -Eo '[.#]?[a-zA-Z0-9_-]+\s*\{' "$f" >"$tmp" || true ;;
    json|yml|yaml|ini|toml) grep -Eo '"?[a-zA-Z0-9_-]+"?\s*:' "$f" >"$tmp" || true ;;
    *) head -n 100 "$f" >"$tmp" ;;
  esac
  local semantic_json=$(jq -R -s -c 'split("\n")[:-1]' <"$tmp")
  rm -f "$tmp"
  run_sql "INSERT INTO ai_semantics(file_path,data_hash,semantic_json)
           VALUES('$(sql_escape "$f")','$h','$(sql_escape "$semantic_json")')
           ON CONFLICT(file_path) DO UPDATE SET
           data_hash=excluded.data_hash, semantic_json=excluded.semantic_json, timestamp=CURRENT_TIMESTAMP;"
}

# ------------------------
# Reference parser
# ------------------------
resolve_ref_to_abs() {
  local base="$1"; local ref="$2"
  [[ -z "$ref" ]] && { echo ""; return; }
  ref=$(echo "$ref" | sed -E "s/^['\"]|['\"]$//g; s/^\s+|\s+$//g")
  [[ "$ref" =~ ^(https?:|//|data:|mailto:) ]] && { echo ""; return; }
  [[ "$ref" == /* ]] && { echo "$(readlink -f "$ref" 2>/dev/null || echo "")"; return; }
  echo "$(readlink -f "$base/$ref" 2>/dev/null || echo "")"
}

extract_refs_from_file() {
  local file="$1"; [[ ! -f "$file" ]] && return
  local base="$(dirname "$file")"
  case "${file##*.}" in
    sh|bash) grep -E "^(source|\.)[[:space:]]+" -n "$file" 2>/dev/null | sed -E "s/^[0-9]+:[^ ]+[ ]+//" | awk '{print $2}' || true ;;
    html|htm) grep -Eoi '<(script|link|img|iframe|source)[^>]+(src|href)="[^"]+"' "$file" 2>/dev/null | sed -E 's/.*(src|href)="([^"]+)".*/\2/' || true ;;
    js) grep -Eo "import[^;]+from[[:space:]]+['\"][^'\"]+['\"]" "$file" 2>/dev/null | sed -E "s/.*from[[:space:]]+['\"]([^'\"]+)['\"].*/\1/" || true; grep -Eo "require\(['\"][^'\"]+['\"]\)" "$file" 2>/dev/null | sed -E "s/require\(['\"]([^'\"]+)['\"]\).*/\1/" || true ;;
    *) grep -Eo "(src|href)=[\"'][^\"']+[\"']" "$file" 2>/dev/null | sed -E "s/.*=[\"']([^\"']+)[\"'].*/\1/" || true ;;
  esac
}

follow_refs() {
  local start="$1"
  local visited="$(mktemp)"; trap 'rm -f "$visited"' EXIT
  _enqueue() { echo "$1" >>"$visited"; }
  _dequeued_exists() { grep -qxF "$1" "$visited" 2>/dev/null; }

  if [[ -d "$start" ]]; then
    while IFS= read -r -d $'\0' f; do _enqueue "$(readlink -f "$f")"; done < <(find "$start" -type f -print0)
  elif [[ -f "$start" ]]; then _enqueue "$(readlink -f "$start")"; else error "Start path not found"; return 1; fi

  local idx=1
  while true; do
    local total=$(wc -l <"$visited")
    [[ $idx -gt $total ]] && break
    local current=$(sed -n "${idx}p" "$visited"); idx=$((idx+1))
    [[ -f "$current" ]] || continue
    log 2 "parsing: $current"
    while IFS= read -r ref; do
      [[ -z "$ref" ]] && continue
      local absref=$(resolve_ref_to_abs "$(dirname "$current")" "$ref")
      [[ -n "$absref" && -f "$absref" && ! $(_dequeued_exists "$absref") ]] && echo "$absref" >>"$visited"
    done < <(extract_refs_from_file "$current")
  done
  cat "$visited"
}

# ------------------------
# Rehash / reloop / store
# ------------------------
store_ai_file() {
  local f="$1"; local repo_hash="$2"; local layer="$3"
  local data_hash=$(sha256_file "$f")
  local dest="$SNAPSHOT_DIR/$data_hash"
  [[ $DRY_RUN -eq 0 ]] && cp "$f" "$dest"
  local content=""
  if file "$f" | grep -qi text; then content=$(head -c 4096 "$f" | sed "s/'/''/g"); fi
  run_sql "INSERT INTO ai_data(repo_hash,layer,data_hash,storage_path,content)
           VALUES('$(sql_escape "$repo_hash")','$(sql_escape "$layer")','$data_hash','$(sql_escape "$dest")','$(sql_escape "$content")');"
  analyze_file_semantics "$f"
}

reloop() {
  local start="$1"; local layer="${2:-default}"
  follow_refs "$start" | while read -r f; do [[ -f "$f" ]] && store_ai_file "$f" "repo-auto" "$layer"; done
}

# ------------------------
# CLI
# ------------------------
show_help() {
  cat <<EOF
Usage: ai <command> [args...]
Commands:
  init-db
  follow-refs <start-path>
  reloop <start-path> [layer]
  --dry-run
  -v, -vv, -vvv
  -h, --help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    -v) VERBOSE=1; shift ;;
    -vv) VERBOSE=2; shift ;;
    -vvv) VERBOSE=3; shift ;;
    --) shift; break ;;
    init-db|follow-refs|reloop|-h|--help) break ;;
    *) break ;;
  esac
done

[[ $# -lt 1 ]] && show_help && exit 1
cmd="$1"; shift
case "$cmd" in
  init-db) init_db ;;
  follow-refs) follow_refs "${1:-.}" ;;
  reloop) reloop "${1:-.}" "${2:-default}" ;;
  -h|--help) show_help ;;
  *) error "Unknown command: $cmd"; show_help; exit 1 ;;
esac
