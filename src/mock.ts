import type { JevDecision } from './jev.js';
import type { DeploySignals } from './signals/index.js';

export type MockScenario = 'safe' | 'risky' | 'blocked' | 'auto';

export function mockJev(signals: DeploySignals, scenario: MockScenario): JevDecision {
  const s = scenario === 'auto' ? inferScenario(signals) : scenario;

  if (s === 'safe') {
    return {
      should_block: false,
      deploy_confidence: 0.94,
      rollback_risk: 0.06,
      blast_radius: 'low',
      reason_category: 'safe',
      human_summary: 'Safe to ship.',
      confidence: {
        should_block: 0.97,
        deploy_confidence: 0.92,
        rollback_risk: 0.9,
        blast_radius: 0.88,
        reason_category: 0.91,
        human_summary: 0.9,
      },
    };
  }

  if (s === 'risky') {
    return {
      should_block: false,
      deploy_confidence: 0.61,
      rollback_risk: 0.42,
      blast_radius: 'medium',
      reason_category: 'diff_risk',
      human_summary: 'Ship, but keep an eye on it.',
      confidence: {
        should_block: 0.72,
        deploy_confidence: 0.78,
        rollback_risk: 0.74,
        blast_radius: 0.7,
        reason_category: 0.68,
        human_summary: 0.71,
      },
    };
  }

  return {
    should_block: true,
    deploy_confidence: 0.21,
    rollback_risk: 0.82,
    blast_radius: 'critical',
    reason_category: 'timing',
    human_summary: 'Migration + late hour — high rollback risk, wait for business hours.',
    confidence: {
      should_block: 0.94,
      deploy_confidence: 0.9,
      rollback_risk: 0.92,
      blast_radius: 0.87,
      reason_category: 0.89,
      human_summary: 0.86,
    },
  };
}

function inferScenario(signals: DeploySignals): MockScenario {
  const risky =
    signals.diff.touchesMigrations ||
    signals.diff.touchesPayments ||
    signals.diff.touchesAuth;
  const badTime = signals.time.isFriday && signals.time.hour24 >= 15;
  const testsFailed = signals.tests.ran && !signals.tests.passed;

  if (testsFailed || (risky && badTime)) return 'blocked';
  if (risky || signals.git.isDirty || signals.diff.filesChanged > 20) return 'risky';
  return 'safe';
}
