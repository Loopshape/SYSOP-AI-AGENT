#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# ------------------------
# AI CLI v38: multipurpose automation
# ------------------------

CLI_HOME="${CLI_HOME:-$HOME/.local/cli}"
DB="${DB:-$CLI_HOME/cli.sqlite}"
SNAPSHOT_DIR="${SNAPSHOT_DIR:-$CLI_HOME/snapshots}"
VERBOSE=${VERBOSE:-1}
DRY_RUN=0

mkdir -p "$CLI_HOME" "$SNAPSHOT_DIR"

log(){ local lvl="$1"; shift; [[ $VERBOSE -ge $lvl ]] && echo "[ai] $*"; }
error(){ echo "[ai][ERROR] $*" >&2; }
sql_escape(){ printf "%s" "$1" | sed "s/'/''/g"; }
sha256_file(){ sha256sum "$1" | awk '{print $1}'; }
run_sql(){ [[ $DRY_RUN -eq 1 ]] && log 2 "DRY-RUN SQL: $1" || sqlite3 "$DB" "$1"; }

# ------------------------
# DB Init
# ------------------------
init_db(){
  log 1 "Initializing DB..."
  run_sql "PRAGMA journal_mode=WAL;"
  run_sql "CREATE TABLE IF NOT EXISTS projects(id INTEGER PRIMARY KEY, hash TEXT UNIQUE, path TEXT, snapshot TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP);"
  run_sql "CREATE TABLE IF NOT EXISTS file_hashes(id INTEGER PRIMARY KEY, project_hash TEXT, file_path TEXT, file_hash TEXT);"
  run_sql "CREATE TABLE IF NOT EXISTS ai_data(id INTEGER PRIMARY KEY, repo_hash TEXT, layer TEXT, data_hash TEXT, storage_path TEXT, content TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP);"
  run_sql "CREATE INDEX IF NOT EXISTS idx_ai_repo_layer ON ai_data(repo_hash,layer);"
}

# ------------------------
# Reference Parsing
# ------------------------
resolve_ref_to_abs(){
  local base="$1"; local ref="$2"
  [[ -z "$ref" ]] && { echo ""; return; }
  ref=$(echo "$ref" | sed -E "s/^['\"]|['\"]$//g; s/^\s+|\s+$//g")
  [[ "$ref" =~ ^(https?:|//|data:|mailto:) ]] && { echo ""; return; }
  [[ "$ref" == /* ]] && { echo "$(readlink -f "$ref" 2>/dev/null || echo "")"; return; }
  echo "$(readlink -f "$base/$ref" 2>/dev/null || echo "")"
}

extract_refs_from_file(){
  local file="$1"; [[ -f "$file" ]] || return 0
  local ext="${file##*.}"
  local base_dir="$(dirname "$file")"
  case "$ext" in
    sh|bash)
      grep -E "^(source|\.)[[:space:]]+" "$file" 2>/dev/null | awk '{print $2}' || true
      grep -E "# *ref:" "$file" 2>/dev/null | sed -E 's/.*# *ref: *//g' || true
      ;;
    json) grep -Eo '"(\\$ref|import)"\s*:\s*"[^"]+"' "$file" 2>/dev/null | sed -E 's/.*:\s*"([^"]+)"/\1/' || true ;;
    yml|yaml) grep -E "(^|\s)(include|import|\\$ref):" "$file" 2>/dev/null | sed -E 's/.*: *"?([^" ]+)"?.*/\1/' || true ;;
    ini|cfg|conf|toml) grep -E "^[[:space:]]*include[[:space:]]*=" "$file" 2>/dev/null | sed -E 's/.*=[[:space:]]*"?([^" ]+)"?.*/\1/' || true ;;
    html|htm) grep -Eoi '<(script|link|img|iframe|source)[^>]+(src|href)="[^"]+"' "$file" 2>/dev/null | sed -E 's/.*(src|href)="([^"]+)".*/\2/' || true ;;
    css) grep -Eo '@import[[:space:]]+"[^"]+"' "$file" 2>/dev/null | sed -E 's/.*"([^"]+)".*/\1/' || true ;;
    xml|xhtml|svg) grep -Eo '(href|xlink:href)="[^"]+"' "$file" 2>/dev/null | sed -E 's/.*="([^"]+)".*/\1/' || true ;;
    js)
      grep -Eo "import[^;]+from[[:space:]]+['\"][^'\"]+['\"]" "$file" 2>/dev/null | sed -E "s/.*from[[:space:]]+['\"]([^'\"]+)['\"].*/\1/" || true
      grep -Eo "require\(['\"][^'\"]+['\"]\)" "$file" 2>/dev/null | sed -E "s/require\(['\"]([^'\"]+)['\"]\).*/\1/" || true
      ;;
    php) grep -Eo "(include|include_once|require|require_once)\s*\(?\s*['\"][^'\"]+['\"]\s*\)?\s*;" "$file" 2>/dev/null | sed -E "s/.*['\"]([^'\"]+)['\"].*/\1/" || true ;;
    twig) grep -Eo "\{\%[[:space:]]*include[[:space:]]+['\"][^'\"]+['\"]" "$file" 2>/dev/null | sed -E "s/.*include[[:space:]]+['\"]([^'\"]+)['\"].*/\1/" || true ;;
    mustache|hbs|handlebars) grep -Eo "\{\{>[[:space:]]*[a-zA-Z0-9_./-]+[[:space:]]*\}\}" "$file" 2>/dev/null | sed -E 's/.*\{\{>[[:space:]]*([^ }]+).*/\1/' || true ;;
    *) grep -Eo "(src|href)=[\"'][^\"']+[\"']" "$file" 2>/dev/null | sed -E "s/.*=[\"']([^\"']+)[\"'].*/\1/" || true ;;
  esac
}

follow_refs(){
  local start="$1"
  local visited_file="$(mktemp)"; trap 'rm -f "$visited_file"' EXIT
  _enqueue(){ echo "$1" >> "$visited_file"; }
  [[ -d "$start" ]] && find "$start" -type f -print0 | while IFS= read -r -d $'\0' f; do _enqueue "$(readlink -f "$f")"; done
  [[ -f "$start" ]] && _enqueue "$(readlink -f "$start")"
  local idx=1
  while true; do
    local total=$(wc -l < "$visited_file")
    [[ $idx -gt $total ]] && break
    local current=$(sed -n "${idx}p" "$visited_file")
    idx=$((idx+1))
    [[ -f "$current" ]] || continue
    log 2 "parsing: $current"
    while IFS= read -r ref; do
      [[ -z "$ref" ]] && continue
      local absref="$(resolve_ref_to_abs "$(dirname "$current")" "$ref")"
      [[ -n "$absref" && -f "$absref" ]] && ! grep -qxF "$absref" "$visited_file" && echo "$absref" >> "$visited_file" && log 2 "discovered: $absref"
    done < <(extract_refs_from_file "$current")
  done
  cat "$visited_file"
}

# ------------------------
# Rehash / store AI files
# ------------------------
store_ai_file(){
  local file="$1"; local repo_hash="$2"; local layer="${3:-default}"
  local fhash=$(sha256_file "$file")
  local storage="$SNAPSHOT_DIR/${fhash}"
  [[ $DRY_RUN -eq 0 ]] && cp "$file" "$storage"
  run_sql "INSERT OR IGNORE INTO file_hashes(project_hash,file_path,file_hash) VALUES('$(sql_escape "$repo_hash")','$(sql_escape "$file")','$(sql_escape "$fhash")');"
  run_sql "INSERT INTO ai_data(repo_hash,layer,data_hash,storage_path,content) VALUES('$(sql_escape "$repo_hash")','$(sql_escape "$layer")','$(sql_escape "$fhash")','$(sql_escape "$storage")','');"
  log 1 "Stored AI file: $file -> $storage"
}

reloop(){
  local start="$1"; local layer="${2:-default}"
  follow_refs "$start" | while read -r f; do store_ai_file "$f" "repo-auto" "$layer"; done
}

# ------------------------
# Web / API
# ------------------------
fetch_rest(){ local url="$1"; local out="${2:-$SNAPSHOT_DIR/$(sha256_file <(echo "$url")).json}"; [[ $DRY_RUN -eq 0 ]] && curl -sSL "$url" -o "$out"; log 1 "REST fetched: $url -> $out"; }
fetch_soap(){ local endpoint="$1"; local body="$2"; local out="${3:-$SNAPSHOT_DIR/$(sha256_file <(echo "$body")).xml}"; [[ $DRY_RUN -eq 0 ]] && curl -sSL -H 'Content-Type: text/xml' -d "$body" "$endpoint" -o "$out"; log 1 "SOAP fetched: $endpoint -> $out"; }

# ------------------------
# CLI parsing
# ------------------------
show_help(){
cat <<EOF
Usage: ai <command> [args...]

Commands:
  init-db
  follow-refs <start-path>
  reloop <start-path> [layer]
  fetch-rest <url> [out.json]
  fetch-soap <endpoint> <body> [out.xml]
  -v, -vv, -vvv
  --dry-run
EOF
}

while [[ $# -gt 0 ]]; do case "$1" in --dry-run) DRY_RUN=1; shift;; -v) VERBOSE=1; shift;; -vv) VERBOSE=2; shift;; -vvv) VERBOSE=3; shift;; --) shift; break;; esac; done
[[ $# -lt 1 ]] && show_help && exit 1
cmd="$1"; shift

case "$cmd" in
  init-db) init_db ;;
  follow-refs) follow_refs "${1:-.}" ;;
  reloop) reloop "${1:-.}" "${2:-default}" ;;
  fetch-rest) fetch_rest "$1" "${2:-}" ;;
  fetch-soap) fetch_soap "$1" "$2" "${3:-}" ;;
  -h|--help) show_help ;;
  *) error "unknown command: $cmd"; show_help; exit 1 ;;
esac
