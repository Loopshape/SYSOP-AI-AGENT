#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# ------------------------
# ai.sh v40 - full-featured multipurpose AI CLI
# ------------------------

CLI_HOME="${CLI_HOME:-$HOME/.local/cli}"
DB="${DB:-$CLI_HOME/cli.sqlite}"
SNAPSHOT_DIR="${SNAPSHOT_DIR:-$CLI_HOME/snapshots}"
VERBOSE=${VERBOSE:-1}
DRY_RUN=0

mkdir -p "$CLI_HOME" "$SNAPSHOT_DIR"

# ------------------------
# Utilities
# ------------------------
log() { local level="$1"; shift; [[ $VERBOSE -ge $level ]] && echo "[cli] $*"; }
error() { echo "[cli][ERROR] $*" >&2; }
sql_escape() { printf "%s" "$1" | sed "s/'/''/g"; }
run_sql() { local sql="$1"; if [[ $DRY_RUN -eq 1 ]]; then log 2 "DRY-RUN SQL: $sql"; else sqlite3 "$DB" "$sql"; fi }

# ------------------------
# Database init
# ------------------------
init_db() {
  log 1 "Initializing DB: $DB"
  sqlite3 "$DB" <<SQL
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS projects(
  id INTEGER PRIMARY KEY,
  hash TEXT UNIQUE,
  path TEXT,
  snapshot_path TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS file_hashes(
  id INTEGER PRIMARY KEY,
  project_hash TEXT,
  file_path TEXT,
  file_hash TEXT
);
CREATE TABLE IF NOT EXISTS ai_data(
  id INTEGER PRIMARY KEY,
  repo_hash TEXT,
  layer TEXT,
  data_hash TEXT,
  storage_path TEXT,
  content TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_repo_layer ON ai_data(repo_hash, layer);
SQL
  log 2 "DB initialized"
}

# ------------------------
# Hashing
# ------------------------
sha256_file() { sha256sum "$1" | awk '{print $1}'; }
compute_repo_hash_from_listing() {
  local path="$1"
  find "$path" -type f -print0 | sort -z | xargs -0 sha256sum 2>/dev/null | sha256sum | awk '{print $1}'
}

# ------------------------
# File parsing & references
# ------------------------
resolve_ref_to_abs() {
  local base="$1"; local ref="$2"
  [[ -z "$ref" ]] && echo "" && return
  ref=$(echo "$ref" | sed -E "s/^['\"]|['\"]$//g; s/^\s+|\s+$//g")
  [[ "$ref" =~ ^(https?:|//|data:|mailto:) ]] && echo "" && return
  [[ "$ref" == /* ]] && echo "$(readlink -f "$ref" 2>/dev/null || echo "")" && return
  echo "$(readlink -f "$base/$ref" 2>/dev/null || echo "")"
}

extract_refs_from_file() {
  local file="$1"
  local base_dir="$(dirname "$file")"
  [[ -f "$file" ]] || return 0
  case "${file##*.}" in
    sh|bash)
      grep -E "^(source|\.)[[:space:]]+" -n "$file" 2>/dev/null | sed -E "s/^[0-9]+:[^ ]+[ ]+//" | awk '{print $2}' || true
      grep -E "# *ref:" -n "$file" 2>/dev/null | sed -E 's/^[0-9]+:.*# *ref:[ ]*//'
      ;;
    json)
      grep -Eo '"(\\$ref|import)"\s*:\s*"[^"]+"' "$file" 2>/dev/null | sed -E 's/.*:\s*"([^"]+)"/\1/' || true
      ;;
    yaml|yml)
      grep -E "(^|\s)(include|import|\\$ref):" -n "$file" 2>/dev/null | sed -E 's/^[0-9]+:.*: *"?([^" ]+)"?.*/\1/' || true
      ;;
    ini|cfg|conf|toml)
      grep -E "^[[:space:]]*include[[:space:]]*=" -n "$file" 2>/dev/null | sed -E 's/^[0-9]+:.*=[[:space:]]*"?([^" ]+)"?.*/\1/' || true
      ;;
    html|htm)
      grep -Eoi '<(script|link|img|iframe|source)[^>]+(src|href)="[^"]+"' "$file" 2>/dev/null | sed -E 's/.*(src|href)="([^"]+)".*/\2/' || true
      ;;
    css)
      grep -Eo '@import[[:space:]]+"[^"]+"' "$file" 2>/dev/null | sed -E 's/.*"([^"]+)".*/\1/' || true
      ;;
    xml|xhtml|svg)
      grep -Eo '(href|xlink:href)="[^"]+"' "$file" 2>/dev/null | sed -E 's/.*="([^"]+)".*/\1/' || true
      ;;
    js)
      grep -Eo "import[^;]+from[[:space:]]+['\"][^'\"]+['\"]" "$file" 2>/dev/null | sed -E "s/.*from[[:space:]]+['\"]([^'\"]+)['\"].*/\1/" || true
      grep -Eo "require\(['\"][^'\"]+['\"]\)" "$file" 2>/dev/null | sed -E "s/require\(['\"]([^'\"]+)['\"]\).*/\1/" || true
      ;;
    php)
      grep -Eo "(include|include_once|require|require_once)\s*\(?\s*['\"][^'\"]+['\"]\s*\)?\s*;" "$file" 2>/dev/null | sed -E "s/.*['\"]([^'\"]+)['\"].*/\1/" || true
      ;;
    twig)
      grep -Eo "\{\%[[:space:]]*include[[:space:]]+['\"][^'\"]+['\"]" "$file" 2>/dev/null | sed -E "s/.*include[[:space:]]+['\"]([^'\"]+)['\"].*/\1/" || true
      ;;
    mustache|hbs|handlebars)
      grep -Eo "\{\{>[[:space:]]*[a-zA-Z0-9_./-]+[[:space:]]*\}\}" "$file" 2>/dev/null | sed -E 's/.*\{\{>[[:space:]]*([^ }]+).*/\1/' || true
      ;;
    *)
      grep -Eo "(src|href)=[\"'][^\"']+[\"']" "$file" 2>/dev/null | sed -E "s/.*=[\"']([^\"']+)[\"'].*/\1/" || true
      ;;
  esac
}

# ------------------------
# Recursive follow references
# ------------------------
follow_refs() {
  local start="$1"
  local visited_file="$(mktemp)"
  trap 'rm -f "$visited_file"' EXIT
  _enqueue() { echo "$1" >> "$visited_file"; }
  _dequeued_exists() { grep -qxF "$1" "$visited_file" 2>/dev/null; }

  if [[ -d "$start" ]]; then
    while IFS= read -r -d $'\0' f; do _enqueue "$(readlink -f "$f")"; done < <(find "$start" -type f -print0)
  elif [[ -f "$start" ]]; then
    _enqueue "$(readlink -f "$start")"
  else
    error "start path not found: $start"; return 1
  fi

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
      local absref=$(resolve_ref_to_abs "$(dirname "$current")" "$ref")
      if [[ -n "$absref" && -f "$absref" && ! _dequeued_exists "$absref" ]]; then
        _enqueue "$absref"
        log 2 "discovered: $absref"
      fi
    done < <(extract_refs_from_file "$current")
  done

  cat "$visited_file"
}

# ------------------------
# Rehashing + indexing + DB store
# ------------------------
reloop() {
  local start="$1"
  local layer="${2:-default}"
  init_db
  local files=($(follow_refs "$start"))
  local project_hash=$(compute_repo_hash_from_listing "$start")
  local snapshot_file="$SNAPSHOT_DIR/snap-$project_hash-$(date +%s).tar.gz"
  tar -czf "$snapshot_file" -C "$start" . || error "tar failed"

  run_sql "INSERT OR IGNORE INTO projects(hash,path,snapshot_path) VALUES('$(sql_escape "$project_hash")','$(sql_escape "$start")','$(sql_escape "$snapshot_file")');"

  for f in "${files[@]}"; do
    local fhash=$(sha256_file "$f")
    run_sql "INSERT INTO file_hashes(project_hash,file_path,file_hash) VALUES('$(sql_escape "$project_hash")','$(sql_escape "$f")','$(sql_escape "$fhash")');"
  done

  log 1 "Reloop complete: $project_hash"
}

# ------------------------
# AI / Qbit DSL evaluator
# ------------------------
eval_qbit_expr() {
  local expr="$1"
  python3 - <<PY - "$expr"
import sys,math,json
expr=sys.argv[1]
from collections import defaultdict
def token_state(tok): return {tok:1.0}
def add_states(a,b): out=defaultdict(float); [out.update({k:a.get(k,0)+v}) for k,v in b.items()]; return dict(out)
def normalize(st): s=sum(abs(v)**2 for v in st.values()); return {k:v/math.sqrt(s) for k,v in st.items()} if s>0 else st
parts=expr.split(); out={}
for p in parts: out=add_states(out, token_state(p))
print(json.dumps({"expr":expr,"normalized":normalize(out)}, indent=2))
PY
}

# ------------------------
# Prompt executor
# ------------------------
execute_prompt() {
  local prompt="$1"
  log 1 "Executing prompt: $prompt"

  if [[ "$prompt" =~ ingest\ (.+) ]]; then
    reloop "${BASH_REMATCH[1]}" "default"
  elif [[ "$prompt" =~ compile\ (.+) ]]; then
    compile_source "${BASH_REMATCH[1]}"
  elif [[ "$prompt" =~ debug\ (.+) ]]; then
    debug_source "${BASH_REMATCH[1]}"
  elif [[ "$prompt" =~ qeval\ (.+) ]]; then
    eval_qbit_expr "${BASH_REMATCH[1]}"
  else
    local tmpdir="$(mktemp -d)"
    echo "$prompt" > "$tmpdir/prompt.txt"
    reloop "$tmpdir" "prompt-layer"
  fi
}

# ------------------------
# CLI dispatcher
# ------------------------
show_help() {
  cat <<EOF
Usage: ai <command> [args...]

Commands:
  init-db
  reloop <dir>                Recursively ingest, hash, snapshot
  follow-refs <start-path>    Recursively follow references
  qeval <expr>                Evaluate qbit DSL
  prompt <text>               Execute task by natural language prompt
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
    *) break ;;
  esac
done

[[ $# -lt 1 ]] && show_help && exit 1
cmd="$1"; shift

case "$cmd" in
  init-db) init_db ;;
  reloop) [[ $# -lt 1 ]] && error "path required" && exit 1; reloop "$1" ;;
  follow-refs) [[ $# -lt 1 ]] && error "start-path required" && exit 1; follow_refs "$1" ;;
  qeval) [[ $# -lt 1 ]] && error "expr required" && exit 1; eval_qbit_expr "$*" ;;
  prompt) [[ $# -lt 1 ]] && error "prompt required" && exit 1; execute_prompt "$*" ;;
  -h|--help) show_help ;;
  *) error "unknown command: $cmd"; show_help; exit 1 ;;
esac
