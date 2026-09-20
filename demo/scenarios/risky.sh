#!/usr/bin/env bash
# Setup: a chunky refactor with a dirty working tree.
set -e
DIR="$1"
cd "$DIR"

git init -q -b main
git config user.email "demo@shipit.dev"
git config user.name  "Demo"

mkdir -p src
for i in $(seq 1 30); do
  echo "export const feature${i} = () => 'v1';" > "src/feature${i}.ts"
done
git add . && git commit -q -m "feat: initial 30 features"

# Refactor pass — rewrite everything.
for i in $(seq 1 30); do
  cat > "src/feature${i}.ts" <<EOF
export function feature${i}(input: string): string {
  const prefix = 'refactored:';
  return prefix + input.trim().toLowerCase();
}
EOF
done
git add . && git commit -q -m "refactor: rewrite all 30 features to new API"

# And leave the tree dirty — a last-minute edit.
echo "// TODO: finish this before shipping" >> src/feature1.ts
