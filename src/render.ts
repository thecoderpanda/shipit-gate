import kleur from 'kleur';
import type { JevDecision } from './jev.js';
import type { DeploySignals } from './signals/index.js';

function bar(value: number, width = 20): string {
  const filled = Math.round(value * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function colorScore(v: number): string {
  const s = v.toFixed(2);
  if (v >= 0.8) return kleur.green(s);
  if (v >= 0.5) return kleur.yellow(s);
  return kleur.red(s);
}

function colorRisk(v: number): string {
  const s = v.toFixed(2);
  if (v <= 0.2) return kleur.green(s);
  if (v <= 0.5) return kleur.yellow(s);
  return kleur.red(s);
}

function colorBlast(v: string): string {
  switch (v) {
    case 'low': return kleur.green(v);
    case 'medium': return kleur.yellow(v);
    case 'high': return kleur.magenta(v);
    case 'critical': return kleur.red().bold(v);
    default: return v;
  }
}

export function renderReport(
  signals: DeploySignals,
  decision: JevDecision,
  gate: { block: boolean; reasons: string[] },
): string {
  const lines: string[] = [];
  const header = gate.block
    ? kleur.red().bold('🛑 BLOCKED')
    : kleur.green().bold('🚀 CLEARED FOR TAKEOFF');

  lines.push('');
  lines.push(kleur.gray('─'.repeat(60)));
  lines.push(`  ${header}  ${kleur.dim('— Jev has evaluated your deploy')}`);
  lines.push(kleur.gray('─'.repeat(60)));
  lines.push('');
  lines.push(`  ${kleur.bold('Verdict:')}  ${decision.human_summary}`);
  lines.push('');
  lines.push(`  ${kleur.bold('Signals')}`);
  lines.push(`    time         ${signals.time.weekday} ${signals.time.hour24}:00 ${kleur.dim(signals.time.timezone)}`);
  lines.push(`    branch       ${signals.git.branch} @ ${signals.git.headSha}${signals.git.isDirty ? kleur.red(' (dirty)') : ''}`);
  lines.push(`    diff         ${signals.diff.filesChanged} files, +${signals.diff.insertions} -${signals.diff.deletions}`);
  const risky = [
    signals.diff.touchesInfra && 'infra',
    signals.diff.touchesMigrations && 'migrations',
    signals.diff.touchesAuth && 'auth',
    signals.diff.touchesPayments && 'payments',
    signals.diff.touchesConfig && 'config',
  ].filter(Boolean).join(', ') || 'none';
  lines.push(`    risky areas  ${risky}`);
  lines.push(`    tests        ${signals.tests.ran ? (signals.tests.passed ? kleur.green('pass') : kleur.red('FAIL')) : kleur.dim('not run')}`);
  lines.push('');
  lines.push(`  ${kleur.bold('Jev decision')}`);
  lines.push(`    deploy_confidence  ${bar(decision.deploy_confidence)}  ${colorScore(decision.deploy_confidence)}`);
  lines.push(`    rollback_risk      ${bar(decision.rollback_risk)}  ${colorRisk(decision.rollback_risk)}`);
  lines.push(`    blast_radius       ${colorBlast(decision.blast_radius)}`);
  lines.push(`    reason_category    ${decision.reason_category}`);
  lines.push('');
  if (gate.block) {
    lines.push(`  ${kleur.bold().red('Why blocked')}`);
    lines.push('');
    lines.push(`    ${kleur.bold("Jev's read:")} ${decision.human_summary}`);
    lines.push(
      `    ${kleur.dim('category:')} ${categoryLabel(decision.reason_category)}   ` +
        `${kleur.dim('confidence:')} ${(decision.confidence.human_summary ?? 0).toFixed(2)}`,
    );
    lines.push('');

    const evidence = buildEvidence(signals, decision);
    if (evidence.length) {
      lines.push(`    ${kleur.bold('What Jev saw:')}`);
      for (const e of evidence) lines.push(`      • ${e}`);
      lines.push('');
    }

    lines.push(`    ${kleur.bold('Gates tripped by your policy:')}`);
    for (const r of gate.reasons) lines.push(`      • ${r}`);
    lines.push('');
    lines.push(kleur.dim('  Override with: shipit check --force (not recommended on Friday)'));
  } else {
    lines.push(kleur.green('  All gates green. Ship it. 🚢'));
  }
  lines.push('');
  return lines.join('\n');
}

function categoryLabel(c: JevDecision['reason_category']): string {
  switch (c) {
    case 'timing': return 'timing (day/hour makes this risky)';
    case 'diff_risk': return 'diff_risk (change itself is risky)';
    case 'tests': return 'tests (failing or missing)';
    case 'dirty_tree': return 'dirty_tree (branch state unclear)';
    case 'safe': return 'safe';
    default: return 'other';
  }
}

function buildEvidence(signals: DeploySignals, decision: JevDecision): string[] {
  const ev: string[] = [];

  if (signals.time.isFriday && signals.time.hour24 >= 15)
    ev.push(`Friday ${signals.time.hour24}:00 — late-week deploy window`);
  else if (signals.time.isWeekend)
    ev.push(`${signals.time.weekday} deploy — no one on call`);
  else if (signals.time.isAfterHours)
    ev.push(`After-hours (${signals.time.weekday} ${signals.time.hour24}:00)`);

  if (signals.tests.ran && !signals.tests.passed)
    ev.push(`Tests failed (exit ${signals.tests.exitCode ?? '?'})`);
  else if (!signals.tests.ran)
    ev.push('No tests were run before shipping');

  if (signals.git.isDirty)
    ev.push(`Working tree dirty (${signals.git.dirtyFiles} uncommitted file${signals.git.dirtyFiles === 1 ? '' : 's'})`);

  const risky: string[] = [];
  if (signals.diff.touchesMigrations) risky.push('migrations');
  if (signals.diff.touchesAuth) risky.push('auth');
  if (signals.diff.touchesPayments) risky.push('payments');
  if (signals.diff.touchesInfra) risky.push('infra');
  if (signals.diff.touchesConfig) risky.push('config');
  if (risky.length) ev.push(`Diff touches sensitive areas: ${risky.join(', ')}`);

  if (signals.diff.filesChanged >= 20)
    ev.push(`Large diff: ${signals.diff.filesChanged} files, +${signals.diff.insertions} -${signals.diff.deletions}`);

  if (decision.rollback_risk >= 0.7)
    ev.push(`Jev estimates ${Math.round(decision.rollback_risk * 100)}% chance of needing a rollback within 24h`);
  if (decision.deploy_confidence < 0.5)
    ev.push(`Jev estimates only ${Math.round(decision.deploy_confidence * 100)}% chance this deploys cleanly`);
  if (decision.blast_radius === 'critical' || decision.blast_radius === 'high')
    ev.push(`Blast radius = ${decision.blast_radius} (auth/payments/data or core user flow)`);

  return ev;
}
