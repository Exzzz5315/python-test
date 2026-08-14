#!/bin/zsh
set -e
cd "$(dirname "$0")"

URL="http://127.0.0.1:4173"
if curl --silent --fail "$URL/api/health" >/dev/null 2>&1; then
  open "$URL"
  exit 0
fi

node server.js &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM

for _ in 1 2 3 4 5; do
  if curl --silent --fail "$URL/api/health" >/dev/null 2>&1; then
    open "$URL"
    wait "$SERVER_PID"
    exit $?
  fi
  sleep 1
done

echo "课堂启动失败，请确认 Node.js 可用且 4173 端口未被占用。"
exit 1
