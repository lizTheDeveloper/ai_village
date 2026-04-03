#!/usr/bin/env bash
# MVEE: The End of Eternity — One-command publish
# Builds production bundle, deploys to play.multiversestudios.xyz/mvee/, and verifies.
#
# Usage: ./publish.sh [--skip-tests] [--force] [--paperclip MUL-NNNN]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GAMES_DIR="$(dirname "$SCRIPT_DIR")"
ENGINE_DIR="$SCRIPT_DIR/custom_game_engine"
DEPLOY_HOST="hetzner"
DEPLOY_PATH="/opt/mvee"
CONTAINER="mvee-game"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[publish]${NC} $*"; }
warn() { echo -e "${YELLOW}[publish]${NC} $*"; }
err()  { echo -e "${RED}[publish]${NC} $*"; }

SKIP_TESTS=false
FORCE=false
PAPERCLIP_ISSUE=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-tests) SKIP_TESTS=true; shift ;;
        --force) FORCE=true; shift ;;
        --paperclip) PAPERCLIP_ISSUE="${2:-}"; shift 2 ;;
        *) err "Unknown arg: $1"; exit 1 ;;
    esac
done

cd "$ENGINE_DIR"

# --- Step 0a: Dirty-tree guard ---
# v0.4.79 incident: we published a build from a dirty working tree where one side of a
# cross-package type change had been edited but not committed. The build succeeded locally
# because Vite/tsc saw the unstaged file, but the deployed tag was missing the fix, causing
# 6.5 hours of downtime. Publishing MUST only happen from a clean, committed state.
if [ "$FORCE" = false ]; then
    if ! git diff --quiet HEAD || ! git diff --cached --quiet HEAD; then
        err "Dirty working tree detected — uncommitted changes present."
        err "Commit or stash all changes before publishing."
        err "To bypass this check (dangerous), re-run with --force."
        exit 1
    fi
    log "Working tree is clean."
else
    warn "--force passed: skipping dirty-tree guard. This bypasses a v0.4.79 incident safeguard."
fi

# --- Step 0b: Quality Gate ---
if [ "$SKIP_TESTS" = false ]; then
    log "Running quality gate..."
    if ! "$GAMES_DIR/quality-gate.sh" mvee; then
        err "Quality gate FAILED — publish blocked."
        exit 1
    fi
    log "Quality gate passed."
else
    warn "Skipping quality gate (--skip-tests)."
fi

# --- Step 3: Production bundle (clean-archive build) ---
# v0.4.79 incident: building directly from the working tree means any uncommitted edits
# (or files not part of the current HEAD commit) can silently influence the output. We now
# build exclusively from a `git archive` of HEAD, so the build reflects exactly what is
# committed. If the tag/commit is missing one side of a cross-package change, tsc will
# catch it here with a TypeScript error — before anything is deployed.
BUILD_TMPDIR="$(mktemp -d)"
trap 'log "Cleaning up build temp dir..."; rm -rf "$BUILD_TMPDIR"' EXIT

log "Extracting clean git archive of HEAD to $BUILD_TMPDIR..."
# git repo root is games/mvee/, so archive contains custom_game_engine/ as a subdirectory
git archive HEAD | tar -x -C "$BUILD_TMPDIR"

log "Installing dependencies in clean archive..."
(cd "$BUILD_TMPDIR/custom_game_engine" && npm ci --silent)

log "Stubbing folkfork-bridge (file: dep lives outside this repo)..."
# git archive strips the custom_game_engine/ prefix, so typings are at $BUILD_TMPDIR/packages/
# but npm ci runs from $BUILD_TMPDIR/custom_game_engine/, so node_modules is there
FOLKFORK_PKG="$BUILD_TMPDIR/custom_game_engine/node_modules/@multiverse-studios/folkfork-bridge"
mkdir -p "$FOLKFORK_PKG"
cp "$BUILD_TMPDIR/packages/core/src/typings/folkfork-bridge.d.ts" "$FOLKFORK_PKG/index.d.ts"
echo '{"name":"@multiverse-studios/folkfork-bridge","version":"0.0.0","types":"index.d.ts","main":"index.js"}' > "$FOLKFORK_PKG/package.json"
echo 'module.exports = {};' > "$FOLKFORK_PKG/index.js"
log "folkfork-bridge stubbed."

log "Building production bundle from clean archive..."
(cd "$BUILD_TMPDIR/custom_game_engine" && npm run build:prod)

log "Copying demo/dist/ from clean archive back to working tree..."
rm -rf demo/dist/
cp -r "$BUILD_TMPDIR/custom_game_engine/demo/dist/" demo/dist/

log "Production bundle ready at demo/dist/ (built from clean git archive)"

# --- Step 3b: Copy sprite assets into dist ---
# Vite copies demo/public/ to dist/, but pixellab sprites live in
# packages/renderer/assets/ and are served by dev middleware only.
# Production needs them in dist/ for express.static to serve.
log "Copying sprite assets into dist..."
rm -rf demo/dist/assets/sprites/pixellab
cp -r packages/renderer/assets/sprites/pixellab demo/dist/assets/sprites/pixellab
log "Sprite assets copied (pixellab: $(ls demo/dist/assets/sprites/pixellab | wc -l) folders)"

# --- Step 4: Sync to Hetzner ---
log "Syncing build artifacts to $DEPLOY_HOST:$DEPLOY_PATH..."

ssh "$DEPLOY_HOST" "mkdir -p $DEPLOY_PATH/demo"

rsync -avz --delete \
    demo/dist/ \
    "$DEPLOY_HOST:$DEPLOY_PATH/demo/dist/"

rsync -avz \
    demo/server/ \
    "$DEPLOY_HOST:$DEPLOY_PATH/demo/server/"

rsync -avz \
    demo/src/ \
    "$DEPLOY_HOST:$DEPLOY_PATH/demo/src/"

rsync -avz \
    data/ \
    "$DEPLOY_HOST:$DEPLOY_PATH/data/"

# Server code imports package sources via tsx at runtime
rsync -avz --delete \
    --include='*/' --include='*.ts' --include='*.json' --include='*.js' \
    --exclude='__tests__/' --exclude='dist/' --exclude='node_modules/' \
    --exclude='assets/' \
    packages/ \
    "$DEPLOY_HOST:$DEPLOY_PATH/packages/"

rsync -avz \
    package.json package-lock.json tsconfig.json \
    Dockerfile.prebuilt docker-compose.prod.yml .dockerignore \
    "$DEPLOY_HOST:$DEPLOY_PATH/"

# Sync server-side deploy script
rsync -avz \
    scripts/server-deploy.sh \
    "$DEPLOY_HOST:$DEPLOY_PATH/deploy.sh"
ssh "$DEPLOY_HOST" "chmod +x $DEPLOY_PATH/deploy.sh"

# --- Step 5: Deploy on server (with rollback support) ---
log "Deploying on $DEPLOY_HOST (server-side deploy.sh with auto-rollback)..."
ssh "$DEPLOY_HOST" "cd $DEPLOY_PATH && ./deploy.sh"

# --- Step 6: Verify deployment (HTTP) ---
log "Verifying deployment (HTTP checks)..."
VERIFY_ARGS="mvee"
if [ -n "$PAPERCLIP_ISSUE" ]; then
    VERIFY_ARGS="$VERIFY_ARGS --paperclip $PAPERCLIP_ISSUE"
fi
"$GAMES_DIR/scripts/verify-deploy.sh" $VERIFY_ARGS

# --- Step 7: Browser smoke test (zero JS errors) ---
log "Running browser smoke test..."
SMOKE_DIR="$GAMES_DIR/scripts"
if [ -f "$SMOKE_DIR/node_modules/.package-lock.json" ] || (cd "$SMOKE_DIR" && npm install --silent 2>/dev/null); then
    if node "$SMOKE_DIR/smoke-test.mjs" mvee; then
        log "Browser smoke test PASSED."
    else
        err "Browser smoke test FAILED — JS errors detected in production!"
        exit 1
    fi
else
    warn "Playwright not installed in scripts/ — skipping browser smoke test."
    warn "Run: cd $SMOKE_DIR && npm install && npx playwright install chromium"
fi

# --- Step 8: Notify Nova to write devlog (MUL-5056) ---
"$GAMES_DIR/scripts/notify-devlog.sh" "MVEE" "$(git rev-parse --short HEAD)" || true

log "MVEE published to https://play.multiversestudios.xyz/mvee/"
