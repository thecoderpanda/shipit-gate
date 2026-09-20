import type { DeploySignals } from './signals/index.js';

const DEFAULT_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

type NoulAnswer = { type: 'noul'; noul: number };
type ChoiceAnswer = {
  type: 'choice';
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};
type ScoreAnswer = {
  type: 'score';
  score: number;
  confidence: number;
  legend: Record<string, unknown>;
  probabilities: Record<string, number>;
};
type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

interface SystemOneResponse {
  answers: Record<string, Answer>;
}

async function callSystemOne(args: {
  endpoint: string;
  apiKey: string;
  model: string;
  state: string;
  questions: unknown;
}): Promise<SystemOneResponse> {
  const res = await fetch(args.endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${args.apiKey}`,
    },
    body: JSON.stringify({
      model: args.model,
      state: args.state,
      questions: args.questions,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`TypeSafe AI ${res.status} ${res.statusText}: ${text.slice(0, 400)}`);
  }
  const json = (await res.json()) as SystemOneResponse;
  if (!json || typeof json !== 'object' || !json.answers) {
    throw new Error('Unexpected TypeSafe response shape: missing "answers" field');
  }
  return json;
}

export interface JevDecision {
  should_block: boolean;
  deploy_confidence: number;
  rollback_risk: number;
  blast_radius: 'low' | 'medium' | 'high' | 'critical';
  reason_category: 'timing' | 'diff_risk' | 'tests' | 'dirty_tree' | 'safe' | 'other';
  human_summary: string;
  confidence: Record<string, number>;
}

export interface AskJevOptions {
  signals: DeploySignals;
  target: string;
  apiKey: string;
  model?: string;
  endpoint?: string;
}

function renderState(signals: DeploySignals, target: string): string {
  const commits = signals.git.recentCommits
    .slice(0, 8)
    .map((c) => `- ${c.sha} ${c.subject} (${c.author}, ${c.date})`)
    .join('\n');

  const touched = signals.diff.touchedPaths.slice(0, 25).join('\n');

  return `# Deploy request

Target environment: ${target}
CI: ${signals.env.ciName ?? 'local'}

## Time
- Local time: ${signals.time.isoLocal}
- Weekday: ${signals.time.weekday}
- Hour: ${signals.time.hour24}
- Timezone: ${signals.time.timezone}
- Is Friday: ${signals.time.isFriday}
- Is weekend: ${signals.time.isWeekend}
- After hours: ${signals.time.isAfterHours}

## Git
- Branch: ${signals.git.branch}
- HEAD: ${signals.git.headSha}
- Dirty tree: ${signals.git.isDirty} (${signals.git.dirtyFiles} files)
- Ahead / behind upstream: ${signals.git.ahead} / ${signals.git.behind}

### Recent commits
${commits || '(no recent commits)'}

## Diff vs base
- Files changed: ${signals.diff.filesChanged}
- Insertions: ${signals.diff.insertions}
- Deletions: ${signals.diff.deletions}
- Touches infra: ${signals.diff.touchesInfra}
- Touches migrations: ${signals.diff.touchesMigrations}
- Touches auth: ${signals.diff.touchesAuth}
- Touches payments: ${signals.diff.touchesPayments}
- Touches config: ${signals.diff.touchesConfig}

### Touched paths (sample)
${touched || '(none)'}

## Tests
- Ran: ${signals.tests.ran}
- Passed: ${signals.tests.passed}
- Command: ${signals.tests.command ?? '(none)'}
- Exit code: ${signals.tests.exitCode ?? 'n/a'}

### Test output tail
${signals.tests.output ?? '(no output)'}
`;
}

const QUESTIONS = {
  should_block: {
    type: 'noul' as const,
    instructions:
      'Should this deploy be BLOCKED right now? Answer yes if there is meaningful risk of an incident: failing tests, dirty working tree, risky diff late on Friday, migrations at 3am, large diff with no tests. Answer no for trivial safe changes.',
    criteria: {
      true: 'Block: the risk of an incident is meaningful and this deploy should wait.',
      false: 'Allow: the risk is acceptable and this deploy should proceed.',
    },
  },
  deploy_success: {
    type: 'noul' as const,
    instructions:
      'Will this deploy succeed without causing an incident?',
    criteria: {
      true: 'Yes: the deploy will roll out cleanly and cause no incident.',
      false: 'No: the deploy is likely to cause an incident.',
    },
  },
  rollback_needed: {
    type: 'noul' as const,
    instructions:
      'Will this deploy need to be rolled back within 24 hours of shipping?',
    criteria: {
      true: 'Yes: a rollback is likely within a day.',
      false: 'No: this will stay deployed without needing a rollback.',
    },
  },
  blast_radius: {
    type: 'choice' as const,
    instructions:
      'If this deploy breaks, how much of the product or user base is affected?',
    criteria: {
      low: 'Isolated impact: internal tools, a single non-critical feature, or off-path code.',
      medium: 'One user-facing feature is degraded for many users.',
      high: 'A core user flow is degraded for many users.',
      critical:
        'Auth, payments, data-loss, or a full outage — customers lose money, trust, or access.',
    },
  },
  reason_category: {
    type: 'choice' as const,
    instructions:
      'Primary reason for the recommendation. Pick "safe" only if you are recommending to ship.',
    criteria: {
      timing: 'The clock/day makes this risky (late Friday, weekend, after hours).',
      diff_risk:
        'The diff itself is risky (large, touches auth/payments/migrations/infra).',
      tests: 'Tests failed or are missing.',
      dirty_tree: 'The working tree is dirty or the branch state is unclear.',
      safe: 'Nothing concerning — safe to ship.',
      other: 'Something else worth calling out.',
    },
  },
  human_summary: {
    type: 'choice' as const,
    instructions:
      'One-line human-readable verdict. Pick the option that best matches the situation.',
    criteria: {
      'Safe to ship.': null,
      'Ship, but keep an eye on it.': null,
      'Risky window — consider waiting until Monday morning.': null,
      'Tests are failing — do not ship.': null,
      'Working tree is dirty — commit or stash first.': null,
      'Migration + late hour — high rollback risk, wait for business hours.': null,
      'Large diff touching sensitive area — needs a second pair of eyes.': null,
      'Cannot evaluate — insufficient signal.': null,
    },
  },
};

function isNoul(a: Answer | undefined): a is NoulAnswer {
  return !!a && a.type === 'noul';
}
function isChoice(a: Answer | undefined): a is ChoiceAnswer {
  return !!a && a.type === 'choice';
}

export async function askJev({
  signals,
  target,
  apiKey,
  model = 'jev-latest',
  endpoint,
}: AskJevOptions): Promise<JevDecision> {
  const state = renderState(signals, target);

  const result = await callSystemOne({
    endpoint: endpoint ?? process.env.TYPESAFE_API_URL ?? DEFAULT_ENDPOINT,
    apiKey,
    model,
    state,
    questions: QUESTIONS,
  });

  const a = result.answers;

  const shouldBlockA = a.should_block;
  const successA = a.deploy_success;
  const rollbackA = a.rollback_needed;
  const blastA = a.blast_radius;
  const reasonA = a.reason_category;
  const summaryA = a.human_summary;

  if (!isNoul(shouldBlockA)) throw new Error('should_block: expected noul answer');
  if (!isNoul(successA)) throw new Error('deploy_success: expected noul answer');
  if (!isNoul(rollbackA)) throw new Error('rollback_needed: expected noul answer');
  if (!isChoice(blastA)) throw new Error('blast_radius: expected choice answer');
  if (!isChoice(reasonA)) throw new Error('reason_category: expected choice answer');
  if (!isChoice(summaryA)) throw new Error('human_summary: expected choice answer');

  const should_block = shouldBlockA.noul >= 0.5;
  const deploy_confidence = successA.noul;
  const rollback_risk = rollbackA.noul;

  return {
    should_block,
    deploy_confidence,
    rollback_risk,
    blast_radius: blastA.choice as JevDecision['blast_radius'],
    reason_category: reasonA.choice as JevDecision['reason_category'],
    human_summary: summaryA.choice,
    confidence: {
      should_block: Math.abs(shouldBlockA.noul - 0.5) * 2,
      deploy_confidence: Math.abs(successA.noul - 0.5) * 2,
      rollback_risk: Math.abs(rollbackA.noul - 0.5) * 2,
      blast_radius: blastA.confidence,
      reason_category: reasonA.confidence,
      human_summary: summaryA.confidence,
    },
  };
}
