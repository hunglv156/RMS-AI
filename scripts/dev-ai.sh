#!/usr/bin/env bash
# Chạy Ollama và ai-service native (xem docs/adr/0001). Chỉ bind 127.0.0.1.
set -euo pipefail
cd "$(dirname "$0")/.."
if ! curl -fs http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  OLLAMA_HOST=127.0.0.1:11434 ollama serve >/tmp/rms-ollama.log 2>&1 &
  trap 'kill $! 2>/dev/null || true' EXIT
  sleep 2
fi
cd apps/ai-service
exec uv run uvicorn app.main:create_app --factory --host 127.0.0.1 --port "${AI_PORT:-8000}" --reload
