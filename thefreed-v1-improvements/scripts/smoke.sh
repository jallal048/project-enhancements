#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"

echo "Smoke: GET /api/feed"
RES=$(curl -sS -w "\n%{http_code}" "$BASE_URL/api/feed")
BODY=$(echo "$RES" | head -n -1)
CODE=$(echo "$RES" | tail -n1)

if [[ "$CODE" != "200" ]]; then
  echo "FAIL: status $CODE" && exit 1
fi

echo "$BODY" | grep -q '"items"' || { echo "FAIL: items missing"; exit 1; }
echo "$BODY" | grep -q '"mode":"chronological"' || { echo "FAIL: mode missing"; exit 1; }

echo "OK"
