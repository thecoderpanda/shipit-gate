import type { DeploySignals } from './signals/index.js';

const DEFAULT_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

interface JevRawResponse {
  answers: Record<string, { value: unknown; confidence: number }>;
}

async function callSystemOne(args: {
  endpoint: string;
  apiKey: string;
  model: string;
  state: string;
  questions: unknown;
}): Promise<JevRawResponse> {
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
  const json = (await res.json()) as JevRawResponse;
  if (!json || typeof json !== 'object' || !json.answers) {
    throw new Error('Unexpected Jev response shape: missing "answers" field');
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
    type: 'boolean' as const,
    instructions:
      'Should this deploy be BLOCKED? Block if there is meaningful risk of an incident: failing tests, dirty working tree, risky diff late on Friday, migrations at 3am, huge diff with no tests, etc. Do NOT block trivial safe changes.',
  },
  deploy_confidence: {
    type: 'score' as const,
    range: [0, 1] as [number, number],
    instructions:
      'Confidence that this deploy will succeed with no incident. 1.0 = totally safe, 0.0 = disaster likely.',
  },
  rollback_risk: {
    type: 'score' as const,
    range: [0, 1] as [number, number],
    instructions:
      'Probability that this deploy will need a rollback within 24 hours. 0 = will not roll back, 1 = will definitely roll back.',
  },
  blast_radius: {
    type: 'choice' as const,
    choices: ['low', 'medium', 'high', 'critical'] as const,
    instructions:
      'If this deploy breaks, how much of the product/users would be affected? critical = auth/payments/data-loss, high = many users core flow, medium = one feature, low = isolated / internal.',
  },
  reason_category: {
    type: 'choice' as const,
    choices: ['timing', 'diff_risk', 'tests', 'dirty_tree', 'safe', 'other'] as const,
    instructions:
      'Primary reason for the decision. Pick "safe" only if you are recommending to ship.',
  },
  human_summary: {
    type: 'choice' as const,
    choices: [
      'Safe to ship.',
      'Ship, but keep an eye on it.',
      'Risky window — consider waiting until Monday morning.',
      'Tests are failing — do not ship.',
      'Working tree is dirty — commit or stash first.',
      'Migration + late hour — high rollback risk, wait for business hours.',
      'Large diff touching sensitive area — needs a second pair of eyes.',
      'Cannot evaluate — insufficient signal.',
    ] as const,
    instructions:
      'One-line human-readable verdict. Pick the choice that best matches the situation.',
  },
};

export async function askJev({
  signals,
  target,
  apiKey,
  model = 'jev-1',
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

  const answers = result.answers;

  return {
    should_block: answers.should_block.value as boolean,
    deploy_confidence: answers.deploy_confidence.value as number,
    rollback_risk: answers.rollback_risk.value as number,
    blast_radius: answers.blast_radius.value as JevDecision['blast_radius'],
    reason_category: answers.reason_category.value as JevDecision['reason_category'],
    human_summary: answers.human_summary.value as string,
    confidence: Object.fromEntries(
      Object.entries(answers).map(([k, v]) => [k, v.confidence]),
    ),
  };
}
