# shipit-gate 🛑🚀

> **The AI deploy gate.** Ask [Jev](https://typesafe.ai) if it's safe to ship — *before* you push.
> Blocks scary Friday deploys. In ~200ms. For $0.

Powered by **TypeSafe AI's Jev** — a System One model that returns typed, calibrated decisions instead of text.
No hallucinated JSON. No "let me think step by step". Just a boolean, a confidence score, and a verdict.

---

## See it in action (10 seconds, no API key)

```bash
git clone https://github.com/thecoderpanda/shipit-gate.git
cd shipit-gate && npm install && npm run build
./demo/run.sh
```

Runs three back-to-back deploys — safe ✅, risky 🟡, blocked 🛑 — against real throwaway git repos, with a mocked Jev verdict. See `./demo/README.md`.

## The demo

```
$ shipit check

→ collecting deploy signals...
→ asking jev...

────────────────────────────────────────────────────────────
  🛑 BLOCKED  — Jev has evaluated your deploy
────────────────────────────────────────────────────────────

  Verdict:  Migration + late hour — high rollback risk, wait for business hours.

  Signals
    time         Friday 17:42 America/Los_Angeles
    branch       feat/new-billing @ 4a9b21c (dirty)
    diff         37 files, +2140 -318
    risky areas  migrations, payments
    tests        pass

  Jev decision
    deploy_confidence  ████░░░░░░░░░░░░░░░░  0.21
    rollback_risk      ████████████████░░░░  0.82
    blast_radius       critical
    reason_category    timing

  Why blocked:
    • Jev says block
    • deploy_confidence 0.21 < 0.50
    • rollback_risk 0.82 > 0.70
    • blast_radius = critical

  Override with: shipit check --force (not recommended on Friday)
```

Exit code: `1` → your CI job fails → your deploy is blocked.

---

## Install

```bash
npm install -g shipit-gate
```

You'll need a TypeSafe AI API key:

```bash
export TYPESAFE_API_KEY=sk_...
```

---

## Usage

### One-off check

```bash
shipit check
```

### Scaffold config

```bash
shipit init
```

Creates a `.shipitrc.json` you can commit.

### Run tests before asking Jev

```bash
shipit check --test-command "npm test"
```

### Machine-readable output (for CI)

```bash
shipit check --json > shipit-report.json
```

### Emergency override

```bash
shipit check --force
```

---

## Install as a git pre-push hook

```bash
cp node_modules/shipit-gate/examples/pre-push-hook.sh .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

Now every `git push` is gated by Jev.

---

## Install as a GitHub Action

```yaml
- name: Ask Jev if it is safe to ship
  env:
    TYPESAFE_API_KEY: ${{ secrets.TYPESAFE_API_KEY }}
  run: |
    npm install -g shipit-gate
    shipit check --base origin/${{ github.base_ref }}
```

The step fails if Jev blocks — your merge is blocked.

---

## Config: `.shipitrc.json`

```json
{
  "target": "production",
  "baseRef": "origin/main",
  "testCommand": "npm test",
  "model": "typesafe-ai/jev",
  "blockOn": {
    "shouldBlock": true,
    "minConfidence": 0.5,
    "maxRollbackRisk": 0.7,
    "blockBlastRadius": ["critical"]
  }
}
```

| Field | Default | Meaning |
|---|---|---|
| `target` | `production` | Deploy target name passed to Jev |
| `baseRef` | `origin/main` | Base ref for diff signal |
| `testCommand` | `null` | If set, shipit runs it and passes result to Jev |
| `model` | `typesafe-ai/jev` | Model id (via Vercel AI Gateway) |
| `blockOn.shouldBlock` | `true` | Honor Jev's boolean verdict |
| `blockOn.minConfidence` | `0.5` | Fail if `deploy_confidence` below this |
| `blockOn.maxRollbackRisk` | `0.7` | Fail if `rollback_risk` above this |
| `blockOn.blockBlastRadius` | `["critical"]` | Fail if blast_radius in this list |

---

## What signals does shipit send to Jev?

- **Time** — weekday, hour, timezone, is-Friday, after-hours
- **Git** — branch, HEAD, dirty tree, recent commits, ahead/behind upstream
- **Diff** — files changed, insertions/deletions, whether it touches infra / migrations / auth / payments / config
- **Tests** — pass/fail + last 4KB of output
- **Env** — deploy target, CI system detected

Jev returns:

```ts
{
  should_block: boolean,
  deploy_confidence: number,   // 0..1
  rollback_risk: number,       // 0..1
  blast_radius: 'low' | 'medium' | 'high' | 'critical',
  reason_category: 'timing' | 'diff_risk' | 'tests' | 'dirty_tree' | 'safe' | 'other',
  human_summary: string,
  confidence: { [field]: number },
}
```

All in a **single Jev call**, ~200ms, ~$0.0001.

---

## Why this exists

Every SRE team has the same unwritten rule: **no deploys on Friday afternoon.**
Everyone breaks it anyway.

`shipit-gate` gives you a machine that never forgets. It has no ego, no deadline pressure, and it knows what a migration to a payments table on a Friday at 5pm looks like.

If Jev says wait, wait.

---

## FAQ

**Does this replace my CI?**
No. It's one more step. Think "spellcheck for deploys".

**Does it need internet?**
Yes — it calls Jev's API. Rejects fail closed (exit code 2).

**Can I self-host?**
Not yet. Jev is currently API-only. Pluggable models are on the roadmap.

**How do I bypass it in an emergency?**
`shipit check --force` or `git push --no-verify`. You own the pager.

---

## Roadmap

- [ ] Slack notification on block
- [ ] Datadog / Sentry incident context as extra signal
- [ ] `shipit history` — track how often overrides preceded incidents
- [ ] Plug-in signal collectors
- [ ] Self-hosted mode with local classifier fallback

---

## Contributing

PRs welcome. Add a signal, tighten the prompt, ship a demo repo.

## License

MIT
