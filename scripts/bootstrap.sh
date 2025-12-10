#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

missing=()
need_cmd() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    missing+=("$name")
  fi
}

install_rust() {
  if ! command -v curl >/dev/null 2>&1; then
    printf 'curl is required to install Rust via rustup.\n' >&2
    missing+=("curl")
    return
  fi

  printf '\n==> Installing Rust toolchain via rustup...\n'
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y >/dev/null
  if [ -f "$HOME/.cargo/env" ]; then
    # shellcheck disable=SC1090
    . "$HOME/.cargo/env"
  else
    export PATH="$HOME/.cargo/bin:$PATH"
  fi
}

ensure_cargo() {
  if command -v cargo >/dev/null 2>&1; then
    return
  fi

  install_rust

  if ! command -v cargo >/dev/null 2>&1; then
    missing+=("cargo")
  fi
}

ensure_sqlx() {
  if command -v sqlx >/dev/null 2>&1; then
    return
  fi

  printf '\n==> Installing sqlx-cli (used for database tooling)...\n'
  cargo install sqlx-cli --locked --features native-tls,postgres >/dev/null

  if ! command -v sqlx >/dev/null 2>&1; then
    missing+=("sqlx-cli")
  fi
}

need_cmd git
need_cmd docker
if ! docker compose version >/dev/null 2>&1; then
  missing+=("docker compose")
fi
need_cmd node
need_cmd npm
ensure_cargo
ensure_sqlx

if [ ${#missing[@]} -gt 0 ]; then
  printf 'Missing required commands: %s\n' "${missing[*]}" >&2
  printf 'Install the missing tools, then re-run scripts/bootstrap.sh\n' >&2
  exit 1
fi

printf '\n==> Initializing git submodules...\n'
git -C "$REPO_ROOT" submodule update --init --recursive

ENV_FILE="$REPO_ROOT/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  printf '\n==> Creating backend/.env with local defaults...\n'
  cat >"$ENV_FILE" <<'ENVEOF'
DATABASE_URL=postgres://postgres:password@localhost:5432/agreed_time
ALLOWED_ORIGINS=http://localhost:4321
PORT=3000
HOST=0.0.0.0
ENVEOF
  printf 'Created %s (edit as needed).\n' "$ENV_FILE"
else
  printf '\n==> backend/.env already exists, leaving it untouched.\n'
fi

printf '\n==> Starting database container via docker compose...\n'
docker compose -f "$REPO_ROOT/docker-compose.yml" up -d
printf '\n==> Waiting for PostgreSQL to accept connections...\n'
until docker exec agreed_time_db pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done
printf 'PostgreSQL is ready.\n'

printf '\n==> Running database migrations (sqlx migrate run)...\n'
(
  cd "$REPO_ROOT/backend"
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
  sqlx migrate run
)

printf '\n==> Running cargo check (compiles backend)...\n'
(
  cd "$REPO_ROOT/backend"
  cargo check
)

printf '\n==> Installing frontend npm dependencies...\n'
(
  cd "$REPO_ROOT/frontend"
  npm install
)

printf '\n==> Building frontend (npm run build)...\n'
(
  cd "$REPO_ROOT/frontend"
  npm run build
)

printf '\nBootstrap complete. Backend verified with `cargo check`, frontend built successfully.\n'
