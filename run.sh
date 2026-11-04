#!/usr/bin/env bash
# Run the Workbench app.
#
#   ./run.sh            # development server with hot reload (default)
#   ./run.sh dev        # same as above
#   ./run.sh prod       # production build, then serve it
#   ./run.sh build      # production build only
#   ./run.sh check      # typecheck + production build
#
# Options (environment variables):
#   PORT=4000 ./run.sh  # listen on a different port (default 3000)
set -euo pipefail

cd "$(dirname "$0")"

MODE="${1:-dev}"
export PORT="${PORT:-3000}"
REQUIRED_NODE_MAJOR=20
REQUIRED_NODE_MINOR=9

log() { printf '\033[1;34m▸\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

check_node() {
  command -v node >/dev/null 2>&1 || fail "Node.js is not installed. Install Node ${REQUIRED_NODE_MAJOR}.${REQUIRED_NODE_MINOR}+ first."
  local version major minor
  version="$(node -p 'process.versions.node')"
  major="${version%%.*}"
  minor="$(echo "$version" | cut -d. -f2)"
  if (( major < REQUIRED_NODE_MAJOR || (major == REQUIRED_NODE_MAJOR && minor < REQUIRED_NODE_MINOR) )); then
    fail "Node $version found; Node ${REQUIRED_NODE_MAJOR}.${REQUIRED_NODE_MINOR}+ is required."
  fi
  log "Node $version"
}

check_pnpm() {
  if ! command -v pnpm >/dev/null 2>&1; then
    command -v corepack >/dev/null 2>&1 || fail "pnpm is not installed. Run: npm install -g pnpm"
    log "pnpm not found; enabling it through corepack"
    corepack enable pnpm
  fi
  log "pnpm $(pnpm --version)"
}

install_deps() {
  # Reinstall when node_modules is missing or older than package.json / the lockfile.
  if [[ ! -d node_modules ]] \
    || [[ package.json -nt node_modules/.modules.yaml ]] \
    || [[ pnpm-lock.yaml -nt node_modules/.modules.yaml ]]; then
    log "Installing dependencies"
    pnpm install --frozen-lockfile
  fi
}

check_port() {
  if command -v ss >/dev/null 2>&1 && ss -ltn "sport = :$PORT" | grep -q LISTEN; then
    fail "Port $PORT is already in use. Stop that process or run: PORT=<other> ./run.sh $MODE"
  fi
}

check_node
check_pnpm
install_deps

case "$MODE" in
  dev)
    check_port
    log "Starting development server on http://localhost:$PORT"
    exec pnpm dev
    ;;
  prod | start)
    check_port
    log "Building for production"
    pnpm build
    log "Serving production build on http://localhost:$PORT"
    exec pnpm start
    ;;
  build)
    log "Building for production"
    exec pnpm build
    ;;
  check)
    log "Typechecking"
    pnpm typecheck
    log "Building for production"
    exec pnpm build
    ;;
  *)
    fail "Unknown mode '$MODE'. Use: dev | prod | build | check"
    ;;
esac
