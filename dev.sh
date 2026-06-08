#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_DIR="$ROOT_DIR/.dev"
SERVER_PID="$DEV_DIR/server.pid"
CLIENT_PID="$DEV_DIR/client.pid"
SERVER_LOG="$DEV_DIR/server.log"
CLIENT_LOG="$DEV_DIR/client.log"

SERVER_PORT="${SERVER_PORT:-5000}"
CLIENT_PORT="${CLIENT_PORT:-5173}"

usage() {
  cat <<EOF
Usage: ./dev.sh <command>

Commands:
  start    Start Colima (if needed), MongoDB, API, and UI
  stop     Stop API, UI, and MongoDB containers
  restart  stop then start
  status   Show running services
  logs     Tail API and UI logs (Ctrl+C to exit)

Examples:
  ./dev.sh start
  ./dev.sh stop
  ./dev.sh logs
EOF
}

log() {
  printf '%s\n' "$*"
}

ensure_dev_dir() {
  mkdir -p "$DEV_DIR"
}

load_nvm() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
  fi
}

ensure_node_version() {
  local required_major=20

  load_nvm

  if [ -f "$ROOT_DIR/.nvmrc" ] && type nvm >/dev/null 2>&1; then
    if ! nvm use --silent 2>/dev/null; then
      log "Installing Node.js from .nvmrc..."
      nvm install
      nvm use --silent
    fi
  fi

  if ! command -v node >/dev/null 2>&1; then
    log "Error: Node.js is not installed."
    log "Install Node.js ${required_major}+ (e.g. nvm install 20) and retry."
    exit 1
  fi

  local node_major
  node_major="$(node -p "Number(process.versions.node.split('.')[0])")"

  if [ "$node_major" -lt "$required_major" ]; then
    log "Error: Node.js ${required_major}+ required (current: $(node -v))."
    log "Run: nvm install 20 && nvm use 20"
    log "Or from project root: nvm use"
    exit 1
  fi

  log "Using Node $(node -v)"
}

start_docker_runtime() {
  if command -v colima >/dev/null 2>&1; then
    if ! colima status >/dev/null 2>&1; then
      log "Starting Colima..."
      colima start
    fi
  fi

  if ! docker info >/dev/null 2>&1; then
    log "Error: Docker is not available."
    log "Start Docker Desktop or run: colima start"
    exit 1
  fi
}

start_mongo() {
  log "Starting MongoDB..."
  cd "$ROOT_DIR"
  docker compose up -d

  log "Waiting for MongoDB replica set (~20s)..."
  local retries=30
  while [ "$retries" -gt 0 ]; do
    if docker compose exec -T mongo mongosh --quiet --eval "rs.status().ok" 2>/dev/null | grep -q '^1$'; then
      log "MongoDB is ready."
      return 0
    fi
    sleep 2
    retries=$((retries - 1))
  done

  log "Error: MongoDB did not become ready in time."
  log "Check logs: docker compose logs mongo"
  exit 1
}

ensure_env_files() {
  if [ ! -f "$ROOT_DIR/server/.env" ]; then
    cp "$ROOT_DIR/server/.env.example" "$ROOT_DIR/server/.env"
    log "Created server/.env from .env.example"
  fi

  if [ ! -f "$ROOT_DIR/client/.env" ]; then
    cp "$ROOT_DIR/client/.env.example" "$ROOT_DIR/client/.env"
    log "Created client/.env from .env.example"
  fi
}

ensure_dependencies() {
  if [ ! -d "$ROOT_DIR/server/node_modules" ]; then
    log "Installing server dependencies..."
    npm install --prefix "$ROOT_DIR/server"
  fi

  if [ ! -d "$ROOT_DIR/client/node_modules" ]; then
    log "Installing client dependencies..."
    npm install --prefix "$ROOT_DIR/client"
  fi
}

is_pid_running() {
  local pid="$1"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

stop_pid_file() {
  local pid_file="$1"
  local label="$2"

  if [ ! -f "$pid_file" ]; then
    return 0
  fi

  local pid
  pid="$(cat "$pid_file")"

  if is_pid_running "$pid"; then
    log "Stopping $label (PID $pid)..."
    kill "$pid" 2>/dev/null || true
    pkill -P "$pid" 2>/dev/null || true

    local wait_count=0
    while is_pid_running "$pid" && [ "$wait_count" -lt 10 ]; do
      sleep 1
      wait_count=$((wait_count + 1))
    done

    if is_pid_running "$pid"; then
      kill -9 "$pid" 2>/dev/null || true
      pkill -9 -P "$pid" 2>/dev/null || true
    fi
  fi

  rm -f "$pid_file"
}

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti ":$port" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null || true
  fi
}

start_server() {
  if [ -f "$SERVER_PID" ] && is_pid_running "$(cat "$SERVER_PID")"; then
    log "API already running (PID $(cat "$SERVER_PID"))."
    return 0
  fi

  rm -f "$SERVER_PID"
  : >"$SERVER_LOG"

  log "Starting API on http://localhost:$SERVER_PORT ..."
  (
    cd "$ROOT_DIR/server"
    nohup npm run dev >>"$SERVER_LOG" 2>&1 &
    echo $! >"$SERVER_PID"
  )

  sleep 2
  if ! is_pid_running "$(cat "$SERVER_PID")"; then
    log "Error: API failed to start. See $SERVER_LOG"
    exit 1
  fi

  log "API started (PID $(cat "$SERVER_PID"))."
}

start_client() {
  if [ -f "$CLIENT_PID" ] && is_pid_running "$(cat "$CLIENT_PID")"; then
    log "UI already running (PID $(cat "$CLIENT_PID"))."
    return 0
  fi

  rm -f "$CLIENT_PID"
  : >"$CLIENT_LOG"

  log "Starting UI on http://localhost:$CLIENT_PORT ..."
  (
    cd "$ROOT_DIR/client"
    nohup npm run dev >>"$CLIENT_LOG" 2>&1 &
    echo $! >"$CLIENT_PID"
  )

  sleep 2
  if ! is_pid_running "$(cat "$CLIENT_PID")"; then
    log "Error: UI failed to start. See $CLIENT_LOG"
    if grep -q "getRandomValues is not a function" "$CLIENT_LOG" 2>/dev/null; then
      log "Hint: Vite requires Node.js 20+. Run: nvm use"
    fi
    exit 1
  fi

  log "UI started (PID $(cat "$CLIENT_PID"))."
}

cmd_start() {
  ensure_dev_dir
  ensure_node_version
  start_docker_runtime
  start_mongo
  ensure_env_files
  ensure_dependencies
  start_server
  start_client

  log ""
  log "All services started."
  log "  App:     http://localhost:$CLIENT_PORT"
  log "  API:     http://localhost:$SERVER_PORT"
  log "  Swagger: http://localhost:$SERVER_PORT/api-docs"
  log "  Mailpit: http://localhost:8025 (local emails)"
  log "  Logs:    ./dev.sh logs"
  log "  Stop:    ./dev.sh stop"
}

cmd_stop() {
  log "Stopping local stack..."
  stop_pid_file "$CLIENT_PID" "UI"
  stop_pid_file "$SERVER_PID" "API"
  kill_port "$CLIENT_PORT"
  kill_port "$SERVER_PORT"

  cd "$ROOT_DIR"
  if docker compose ps -q mongo 2>/dev/null | grep -q .; then
    log "Stopping MongoDB containers..."
    docker compose down
  fi

  log "Stopped API, UI, and MongoDB."
  log "Colima/Docker Desktop was left running (shared with other projects)."
}

cmd_status() {
  log "Local stack status:"
  log ""

  if command -v colima >/dev/null 2>&1; then
    if colima status >/dev/null 2>&1; then
      log "  Colima: running"
    else
      log "  Colima: stopped"
    fi
  fi

  if docker info >/dev/null 2>&1; then
    log "  Docker: available"
  else
    log "  Docker: unavailable"
  fi

  cd "$ROOT_DIR"
  if docker compose ps -q mongo 2>/dev/null | grep -q .; then
    log "  MongoDB: running ($(docker compose ps --format '{{.Status}}' mongo 2>/dev/null || echo 'up'))"
  else
    log "  MongoDB: stopped"
  fi

  if [ -f "$SERVER_PID" ] && is_pid_running "$(cat "$SERVER_PID")"; then
    log "  API: running (PID $(cat "$SERVER_PID"), port $SERVER_PORT)"
  else
    log "  API: stopped"
  fi

  if [ -f "$CLIENT_PID" ] && is_pid_running "$(cat "$CLIENT_PID")"; then
    log "  UI: running (PID $(cat "$CLIENT_PID"), port $CLIENT_PORT)"
  else
    log "  UI: stopped"
  fi

  if command -v node >/dev/null 2>&1; then
    log "  Node: $(node -v)"
  else
    log "  Node: not found"
  fi
}

cmd_logs() {
  ensure_dev_dir
  touch "$SERVER_LOG" "$CLIENT_LOG"
  tail -f "$SERVER_LOG" "$CLIENT_LOG"
}

main() {
  local command="${1:-}"

  case "$command" in
    start)
      cmd_start
      ;;
    stop)
      cmd_stop
      ;;
    restart)
      cmd_stop
      cmd_start
      ;;
    status)
      cmd_status
      ;;
    logs)
      cmd_logs
      ;;
    -h | --help | help)
      usage
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
