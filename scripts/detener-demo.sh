#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEMO_DIR="$ROOT_DIR/.demo"
DEMO_ENV="$DEMO_DIR/.env"
COMPOSE_PROJECT="teknopipe-demo"

stop_process_tree() {
  local pid="$1"
  local children child
  children="$(pgrep -P "$pid" 2>/dev/null || true)"
  for child in $children; do
    stop_process_tree "$child"
  done
  kill -TERM "$pid" >/dev/null 2>&1 || true
}

stop_service() {
  local label="$1"
  local pid_file="$2"
  local expected="$3"
  local pid command
  if [ ! -s "$pid_file" ]; then
    return
  fi
  pid="$(cat "$pid_file")"
  if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" >/dev/null 2>&1; then
    command="$(ps -p "$pid" -o command= 2>/dev/null || true)"
    if [[ "$command" == *npm*"$expected"* ]]; then
      stop_process_tree "$pid"
      for attempt in $(seq 1 10); do
        kill -0 "$pid" >/dev/null 2>&1 || break
        sleep 0.2
      done
      if kill -0 "$pid" >/dev/null 2>&1; then
        kill -KILL "$pid" >/dev/null 2>&1 || true
      fi
      echo "$label detenido."
    else
      echo "Se conserva un proceso ajeno al servicio demo (PID $pid)."
    fi
  fi
  : > "$pid_file"
}

stop_service "Frontend" "$DEMO_DIR/frontend.pid" "start"
stop_service "Backend" "$DEMO_DIR/backend.pid" "run dev"

if [ -f "$DEMO_ENV" ] && docker info >/dev/null 2>&1; then
  docker compose --env-file "$DEMO_ENV" --project-name "$COMPOSE_PROJECT" down
elif [ -f "$DEMO_ENV" ]; then
  echo "Docker no está corriendo; el servicio de base de datos ya está detenido."
fi

echo "Demo detenida. Los datos locales se conservan para el siguiente inicio."
