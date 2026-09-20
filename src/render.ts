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
    lines.push(`  ${kleur.bold().red('Why blocked:')}`);
    for (const r of gate.reasons) lines.push(`    • ${r}`);
    lines.push('');
    lines.push(kleur.dim('  Override with: shipit check --force (not recommended on Friday)'));
  } else {
    lines.push(kleur.green('  All gates green. Ship it. 🚢'));
  }
  lines.push('');
  return lines.join('\n');
}
