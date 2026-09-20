#!/usr/bin/env bash
# Record the demo as a GIF using vhs (https://github.com/charmbracelet/vhs).
set -e

if ! command -v vhs >/dev/null 2>&1; then
  echo "vhs not found. Install with: brew install vhs"
  exit 1
fi

cat > /tmp/shipit-gate.tape <<'EOF'
Output demo/shipit-gate.gif
Set FontSize 14
Set Width 1000
Set Height 700
Set Theme "Dracula"

Type "./demo/run.sh"
Enter
Sleep 30s
EOF

vhs /tmp/shipit-gate.tape
echo "✓ wrote demo/shipit-gate.gif"
