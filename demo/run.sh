#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BOLD=$(tput bold 2>/dev/null || echo '')
DIM=$(tput dim 2>/dev/null || echo '')
RESET=$(tput sgr0 2>/dev/null || echo '')
CYAN=$(tput setaf 6 2>/dev/null || echo '')
YELLOW=$(tput setaf 3 2>/dev/null || echo '')
GREEN=$(tput setaf 2 2>/dev/null || echo '')
RED=$(tput setaf 1 2>/dev/null || echo '')

banner() {
  echo ""
  echo "${BOLD}${CYAN}━━━ $1 ━━━${RESET}"
  echo "${DIM}$2${RESET}"
  echo ""
}

pause() { sleep "${DEMO_PAUSE:-1.2}"; }

run_shipit() {
  # Prefer the built CLI, else fall back to tsx for local dev.
  if [ -x "$REPO_ROOT/dist/cli.js" ]; then
    node "$REPO_ROOT/dist/cli.js" "$@"
  else
    (cd "$REPO_ROOT" && npx --no-install tsx src/cli.ts "$@") 2>/dev/null || \
      (cd "$REPO_ROOT" && npx tsx src/cli.ts "$@")
  fi
}

run_scenario() {
  local name="$1"; shift
  local scenario_flag="$1"; shift
  local desc="$1"; shift

  local workdir
  workdir=$(mktemp -d "/tmp/shipit-demo-${name}-XXXX")
  bash "$SCRIPT_DIR/scenarios/${name}.sh" "$workdir" >/dev/null
  (
    cd "$workdir"
    banner "$name" "$desc  ${DIM}(cwd: $workdir)${RESET}"
    pause
    echo "${BOLD}\$ shipit check --mock=${scenario_flag}${RESET}"
    pause
    run_shipit check --mock="$scenario_flag" --base HEAD~1 || true
  )
  pause
}

echo ""
echo "${BOLD}${CYAN}shipit-gate — live demo${RESET}"
echo "${DIM}Three deploys, evaluated by (mocked) Jev in real time.${RESET}"
pause

run_scenario "safe"    "safe"    "${GREEN}🟢 Safe deploy${RESET} — small typo fix, Tuesday morning."
run_scenario "risky"   "risky"   "${YELLOW}🟡 Risky deploy${RESET} — 30-file refactor, dirty working tree."
run_scenario "blocked" "blocked" "${RED}🔴 Blocked deploy${RESET} — Friday 5pm, migration + payments code."

echo ""
echo "${BOLD}${GREEN}✓ Demo complete.${RESET}"
echo "${DIM}Get a real API key at https://typesafe.ai to run this on your own repo.${RESET}"
echo ""
