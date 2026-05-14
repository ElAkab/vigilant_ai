#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 user@bastion [local_port]"
  echo "Example: $0 bastion.example.com 8443"
  exit 2
fi

REMOTE="$1"
LOCAL_PORT="${2:-8443}"

echo "Opening SSH local tunnel: localhost:${LOCAL_PORT} -> api.openrouter.ai:443 via ${REMOTE}"
echo "Run in background (CTRL-C to stop)."

ssh -N -L "${LOCAL_PORT}:api.openrouter.ai:443" "${REMOTE}"
