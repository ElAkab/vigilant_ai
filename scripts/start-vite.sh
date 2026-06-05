#!/bin/bash
cd /workspace/vigilant_ai
exec /home/hermeswebui/.hermes/home/.local/bin/bun x vite --host 0.0.0.0 --port 5173 2>&1
