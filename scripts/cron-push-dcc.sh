#!/usr/bin/env bash
# Cron wrapper for D_cc metric push to Folkfork.
#
# Install (every 10 minutes):
#   crontab -e
#   */10 * * * * /path/to/games/mvee/scripts/cron-push-dcc.sh >> /var/log/mvee-dcc-push.log 2>&1
#
# Required env vars (set in crontab or sourced from .env):
#   FOLKFORK_STUDIO_API_KEY — Folkfork API auth token
#
# Optional env vars:
#   FOLKFORK_API_URL — override default Folkfork URL

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Source .env if present (for FOLKFORK_STUDIO_API_KEY)
if [ -f "$SCRIPT_DIR/../.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "$SCRIPT_DIR/../.env"
    set +a
fi

exec python3 "$SCRIPT_DIR/push-dcc-metrics.py" --window 30
