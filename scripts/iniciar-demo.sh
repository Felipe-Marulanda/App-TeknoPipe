#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEMO_DIR="$ROOT_DIR/.demo"
DEMO_ENV="$DEMO_DIR/.env"
COMPOSE_PROJECT="teknopipe-demo"
BACKEND_PID_FILE="$DEMO_DIR/backend.pid"
FRONTEND_PID_FILE="$DEMO_DIR/frontend.pid"

fail_cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "No se pudo iniciar la demo. Revisa los registros en .demo/."
    bash "$ROOT_DIR/scripts/detener-demo.sh" || true
  fi
}
trap fail_cleanup EXIT

if ! docker info >/dev/null 2>&1; then
  echo "Docker no está corriendo. Inicia Docker Desktop o el servicio Docker y vuelve a ejecutar npm run demo." >&2
  exit 1
fi

mkdir -p "$DEMO_DIR"
if [ ! -f "$DEMO_ENV" ]; then
  python3 - "$ROOT_DIR/.env.example" "$DEMO_ENV" <<'PY'
from pathlib import Path
import secrets
import sys

_, sample_path, demo_path = sys.argv
sample = Path(sample_path).read_text().splitlines()
values = {
    'POSTGRES_DB': 'teknopipe_demo',
    'POSTGRES_USER': 'teknopipe',
    'POSTGRES_PASSWORD': secrets.token_hex(18),
    'POSTGRES_PORT': '5433',
    'DATABASE_URL': '',
    'NODE_ENV': 'development',
    'PORT': '3000',
    'CORS_ORIGIN': 'http://localhost:4200',
    'SEED_ADMIN_EMAIL': 'admin@teknopipe.test',
    'SEED_ADMIN_PASSWORD': 'DemoPipe2026Admin',
    'SEED_ADMIN_NAME': 'Administración TEKNOPIPE',
    'JWT_ACCESS_SECRET': secrets.token_hex(32),
}
values['DATABASE_URL'] = (
    f"postgresql://{values['POSTGRES_USER']}:{values['POSTGRES_PASSWORD']}"
    f"@localhost:{values['POSTGRES_PORT']}/{values['POSTGRES_DB']}?schema=public"
)
known = {line.split('=', 1)[0] for line in sample if '=' in line}
missing = set(values) - known
if missing:
    raise SystemExit(f'Faltan variables en .env.example: {", ".join(sorted(missing))}')
# Double quotes are accepted by both dotenv and shell sourcing; the admin name contains spaces.
Path(demo_path).write_text('\n'.join(f'{key}="{value}"' for key, value in values.items()) + '\n')
Path(demo_path).chmod(0o600)
PY
fi

set -a
# shellcheck disable=SC1090
source "$DEMO_ENV"
set +a

compose() {
  docker compose --env-file "$DEMO_ENV" --project-name "$COMPOSE_PROJECT" "$@"
}

if [ -s "$BACKEND_PID_FILE" ] || [ -s "$FRONTEND_PID_FILE" ]; then
  bash "$ROOT_DIR/scripts/detener-demo.sh"
fi

if [ ! -x "$ROOT_DIR/backend/node_modules/.bin/prisma" ]; then
  npm --prefix "$ROOT_DIR/backend" ci
fi
if [ ! -x "$ROOT_DIR/frontend/node_modules/.bin/ng" ]; then
  npm --prefix "$ROOT_DIR/frontend" ci
fi

npm --prefix "$ROOT_DIR/backend" run prisma:generate
compose up -d

postgres_ready=false
for attempt in $(seq 1 30); do
  if compose exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    postgres_ready=true
    break
  fi
  sleep 2
done
if [ "$postgres_ready" != true ]; then
  echo "PostgreSQL no estuvo listo en 60 segundos." >&2
  exit 1
fi

npm --prefix "$ROOT_DIR/backend" run prisma:deploy
npm --prefix "$ROOT_DIR/backend" run prisma:seed
npm --prefix "$ROOT_DIR/backend" run prisma:seed:demo

(
  cd "$ROOT_DIR/backend"
  nohup npm run dev > "$DEMO_DIR/backend.log" 2>&1 < /dev/null &
  echo $! > "$BACKEND_PID_FILE"
)
(
  cd "$ROOT_DIR/frontend"
  PORT=4200 nohup npm start -- --host 127.0.0.1 > "$DEMO_DIR/frontend.log" 2>&1 < /dev/null &
  echo $! > "$FRONTEND_PID_FILE"
)

api_ready=false
for attempt in $(seq 1 30); do
  if curl -fsS http://localhost:3000/api/v1/health >/dev/null 2>&1 && \
    curl -fsS http://localhost:3000/api-docs/openapi.yaml | grep -q 'openapi: 3.'; then
    api_ready=true
    break
  fi
  sleep 1
done
if [ "$api_ready" != true ]; then
  echo "La API no estuvo lista. Revisa .demo/backend.log." >&2
  exit 1
fi

frontend_ready=false
for attempt in $(seq 1 60); do
  if curl -fsS http://localhost:4200/ 2>/dev/null | grep -q '<app-root'; then
    frontend_ready=true
    break
  fi
  sleep 1
done
if [ "$frontend_ready" != true ]; then
  echo "Angular no estuvo listo. Revisa .demo/frontend.log." >&2
  exit 1
fi

trap - EXIT
echo
echo "Demo TEKNOPIPE lista."
echo "Aplicación: http://localhost:4200"
echo "Swagger: http://localhost:3000/api-docs/"
echo "Usuario administrador: $SEED_ADMIN_EMAIL"
echo "Contraseña de demo: $SEED_ADMIN_PASSWORD"
echo "Para detenerla: npm run demo:stop"
