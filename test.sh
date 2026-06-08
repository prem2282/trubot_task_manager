#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-unit}"

usage() {
  cat <<EOF
Usage: ./test.sh [command]

Commands:
  unit          Run client + server unit tests (default)
  client        Run client unit tests only
  server        Run server unit tests only
  integration   Run server API integration tests (in-memory MongoDB)
  all           Run unit + integration test suites

Examples:
  ./test.sh
  ./test.sh unit
  ./test.sh server
  ./test.sh integration
EOF
}

log() {
  printf '%s\n' "$*"
}

require_node_version() {
  local required_major=20
  if [[ -f "$ROOT_DIR/.nvmrc" ]]; then
    required_major="$(tr -d '[:space:]' < "$ROOT_DIR/.nvmrc" | sed 's/^v//')"
  fi

  if ! command -v node >/dev/null 2>&1; then
    log "Error: Node.js is not installed."
    log "Install Node ${required_major}+ (e.g. nvm install ${required_major}) and retry."
    exit 1
  fi

  local current_major
  current_major="$(node -p "process.versions.node.split('.')[0]")"
  if (( current_major < required_major )); then
    log "Error: Node.js >= ${required_major} required (found $(node -v))."
    log "Vite/Vitest need modern Node crypto APIs; older Node causes:"
    log "  TypeError: crypto.getRandomValues is not a function"
    log ""
    log "Fix: cd $ROOT_DIR && nvm use"
    log "  (or: nvm install ${required_major} && nvm use ${required_major})"
    exit 1
  fi
}

run_client_unit_tests() {
  log "Running client unit tests..."
  npm run test:run --prefix "$ROOT_DIR/client"
}

run_server_unit_tests() {
  log "Running server unit tests..."
  npm run test:run --prefix "$ROOT_DIR/server"
}

run_unit_tests() {
  run_client_unit_tests
  run_server_unit_tests
}

run_integration_tests() {
  log "Running server integration tests..."
  npm run test:integration --prefix "$ROOT_DIR/server"
}

require_node_version

case "$MODE" in
  unit)
    run_unit_tests
    ;;
  client)
    run_client_unit_tests
    ;;
  server)
    run_server_unit_tests
    ;;
  integration)
    run_integration_tests
    ;;
  all)
    run_unit_tests
    run_integration_tests
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    log "Unknown command: $MODE"
    usage
    exit 1
    ;;
esac

log "Done."
