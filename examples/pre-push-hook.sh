#!/usr/bin/env bash
# Install into .git/hooks/pre-push to gate every push.
# chmod +x .git/hooks/pre-push
set -e

if ! command -v shipit >/dev/null 2>&1; then
  echo "shipit not installed. Run: npm i -g shipit-gate"
  exit 0
fi

shipit check || {
  echo ""
  echo "Jev blocked this push. Fix the issues or push with:"
  echo "  git push --no-verify   # bypass shipit-gate (you own it)"
  exit 1
}
