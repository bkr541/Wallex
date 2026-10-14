#!/bin/bash
set -euo pipefail

# =========================================================
# Wallex Local Launcher
# Starts the Vite dev server (port 3000), then opens the
# app inside an Electron window pointed at it.
# =========================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Finder-launched shells often miss Homebrew/nvm paths; load the login profile.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  source "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
fi

# A Homebrew upgrade can leave its node unable to start (a missing library). Use the first node that actually runs.
if ! node --version >/dev/null 2>&1; then
  for candidate in /usr/local/bin /opt/homebrew/opt/node@22/bin /opt/homebrew/opt/node@20/bin /usr/bin; do
    if [[ -x "$candidate/node" ]] && "$candidate/node" --version >/dev/null 2>&1; then
      export PATH="$candidate:$PATH"
      echo "Note: the default node is broken, using $candidate/node instead."
      break
    fi
  done
fi

# If this is set (e.g. inherited from a VS Code terminal), Electron behaves
# like plain Node and the app never opens.
unset ELECTRON_RUN_AS_NODE

# Wallex's dev server prefers port 3000, but that port may belong to another project. Wallex never stops a process it did not
# start: if the port is taken by something else, it uses the next free one.
PORT=3000
APP_URL=""
LOG_DIR="$DIR/logs"
FRONTEND_LOG="$LOG_DIR/frontend.log"
ELECTRON_LOG="$LOG_DIR/electron.log"
ELECTRON_BIN="$DIR/node_modules/.bin/electron"

FRONTEND_PID=""
ELECTRON_PID=""

cleanup() {
  trap - EXIT INT TERM
  echo ""
  echo "Shutting down Wallex..."
  [[ -n "${ELECTRON_PID:-}" ]] && kill "$ELECTRON_PID" 2>/dev/null || true
  if [[ -n "${FRONTEND_PID:-}" ]]; then
    # npm spawns vite as a child; kill the whole tree.
    pkill -P "$FRONTEND_PID" 2>/dev/null || true
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

port_free() { ! lsof -ti :"$1" >/dev/null 2>&1; }

# True when the process is a leftover Wallex dev server: its working folder is this project.
is_wallex_process() {
  local cwd
  cwd="$(lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1)"
  [[ -n "$cwd" && "$cwd" == "$DIR"* ]]
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_cmd node
require_cmd npm
require_cmd curl
require_cmd lsof

mkdir -p "$LOG_DIR"

# ── Preflight checks ─────────────────────────────────────────────

if [[ ! -f "$DIR/package.json" ]]; then
  echo "ERROR: package.json not found. Run this from the Wallex repo root."
  exit 1
fi

# ── Choose a port without touching other projects ───────────────

echo "Checking port $PORT..."
while ! port_free "$PORT"; do
  stale=""
  for pid in $(lsof -ti :"$PORT" 2>/dev/null); do
    if is_wallex_process "$pid"; then
      echo "Stopping an old Wallex server (pid $pid) on port $PORT."
      kill "$pid" 2>/dev/null || true
      stale="yes"
    fi
  done
  if [[ -n "$stale" ]]; then sleep 1; port_free "$PORT" && break; fi
  echo "Port $PORT is used by another program, leaving it alone."
  PORT=$((PORT + 1))
  if (( PORT > 3100 )); then echo "No free port found between 3000 and 3100."; exit 1; fi
done
APP_URL="http://127.0.0.1:$PORT"
echo "Using port $PORT."

# ── Install and verify frontend/Electron dependencies ───────────

install_dependencies() {
  echo "Installing dependencies (including Electron)..."
  # Electron is a devDependency. --include=dev overrides npm configs such as
  # NODE_ENV=production or omit=dev that would otherwise silently skip it.
  npm install --include=dev
}

if [[ ! -d "$DIR/node_modules" || ! -x "$ELECTRON_BIN" ]]; then
  install_dependencies
fi

# A cancelled Electron download can leave the npm package and .bin shim in
# place without a usable native runtime. Rebuild once if the smoke test fails.
if ! "$ELECTRON_BIN" --version >/dev/null 2>&1; then
  echo "Electron is present but incomplete; repairing its native runtime..."
  npm rebuild electron
fi

if [[ ! -x "$ELECTRON_BIN" ]] || ! "$ELECTRON_BIN" --version >/dev/null 2>&1; then
  echo "ERROR: Electron could not be installed or started from $ELECTRON_BIN."
  echo "Try the following from the Wallex repo root:"
  echo "  rm -rf node_modules/electron node_modules/.bin/electron"
  echo "  npm install --include=dev"
  echo ""
  echo "Node version: $(node --version 2>/dev/null || echo unavailable)"
  echo "npm omit setting: $(npm config get omit 2>/dev/null || echo unavailable)"
  exit 1
fi

# ── Start frontend ────────────────────────────────────────────────

echo "--- Starting frontend (Vite 127.0.0.1:$PORT) ---"
: > "$FRONTEND_LOG"

npx vite --port="$PORT" --host=127.0.0.1 --strictPort > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

echo "Waiting for frontend..."
for _ in {1..90}; do
  if curl -sf "$APP_URL" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "Frontend exited unexpectedly. Last 40 lines of $FRONTEND_LOG:"
    tail -n 40 "$FRONTEND_LOG" || true
    exit 1
  fi
  sleep 1
done

if ! curl -sf "$APP_URL" >/dev/null 2>&1; then
  echo "Frontend did not become reachable on port $PORT."
  tail -n 40 "$FRONTEND_LOG" || true
  exit 1
fi

# ── Start Electron shell ───────────────────────────────────────────

echo "--- Starting Electron desktop app ---"
: > "$ELECTRON_LOG"
ELECTRON_RENDERER_URL="$APP_URL" "$ELECTRON_BIN" "$DIR" > "$ELECTRON_LOG" 2>&1 &
ELECTRON_PID=$!

sleep 2
if ! kill -0 "$ELECTRON_PID" 2>/dev/null; then
  echo "Electron exited unexpectedly. Last 40 lines of $ELECTRON_LOG:"
  tail -n 40 "$ELECTRON_LOG" || true
  exit 1
fi

echo ""
echo "Wallex desktop is running:"
echo "   Renderer  $APP_URL"
echo ""
echo "   Frontend log: $FRONTEND_LOG"
echo "   Electron log: $ELECTRON_LOG"
echo ""
echo "Running. Close the Wallex window or press Ctrl+C to stop."

# Exit (and clean up the dev server) when the Electron window is closed.
wait "$ELECTRON_PID" 2>/dev/null || true
