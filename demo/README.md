# shipit-gate — Live Demo

Run the walkthrough on your own machine in **10 seconds, no API key required**:

```bash
npx shipit-gate demo:run
```

Or from this repo:

```bash
cd demo
./run.sh
```

## What it shows

Three back-to-back scenarios, each running the real CLI against a real (throwaway) git repo:

1. 🟢 **Safe deploy** — small typo fix on a Tuesday morning
2. 🟡 **Risky deploy** — biggish diff, dirty working tree
3. 🔴 **Blocked deploy** — Friday 5pm, migration + payments code touched

Each run prints the same colored report you'd see in production — with a mock Jev verdict so you can see the block/pass logic without a TypeSafe API key.

## Files

- `run.sh` — the driver script (creates scenarios in `/tmp/shipit-demo-*`, runs `shipit check --mock=<scenario>`)
- `scenarios/safe.sh` — sets up a boring, safe change
- `scenarios/risky.sh` — sets up a chunky, uncommitted change
- `scenarios/blocked.sh` — sets up the "Friday 5pm migration" nightmare
- `record.sh` — record the demo as a GIF via [vhs](https://github.com/charmbracelet/vhs) (optional)

## Recording your own GIF

Install [vhs](https://github.com/charmbracelet/vhs) then:

```bash
./demo/record.sh
```

Outputs `demo/shipit-gate.gif` — perfect for the README, X, or Product Hunt.
