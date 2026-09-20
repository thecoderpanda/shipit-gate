#!/usr/bin/env bash
# Setup: a tiny typo fix. Boring. Safe.
set -e
DIR="$1"
cd "$DIR"

git init -q -b main
git config user.email "demo@shipit.dev"
git config user.name  "Demo"

cat > README.md <<'EOF'
# hello-shipit
A tiny demo project.
EOF
git add . && git commit -q -m "chore: initial commit"

# The change: fix a typo in the README.
sed -i.bak 's/tiny demo project/tiny demo project (typo fix)/' README.md && rm README.md.bak
git add README.md && git commit -q -m "docs: fix typo in README"
