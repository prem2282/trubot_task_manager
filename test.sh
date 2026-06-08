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
