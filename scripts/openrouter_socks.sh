#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 user@bastion [local_socks_port]"
  echo "Example: $0 bastion.example.com 1080"
  exit 2
fi

REMOTE="$1"
SOCKS_PORT="${2:-1080}"

echo "Opening SSH SOCKS proxy on localhost:${SOCKS_PORT} via ${REMOTE}" 
echo "Set HTTPS_PROXY=socks5h://localhost:${SOCKS_PORT} to route HTTPS requests through the remote host."

ssh -N -D "${SOCKS_PORT}" "${REMOTE}"
