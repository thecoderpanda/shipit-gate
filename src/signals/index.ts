import { collectTime } from './time.js';
import { collectGit } from './git.js';
import { collectDiff } from './diff.js';
import { collectTests } from './tests.js';
import { collectEnv } from './env.js';
import type { DeploySignals } from './types.js';

export * from './types.js';

export interface CollectOptions {
  baseRef: string;
  testCommand: string | null;
  target: string;
}

export function collectAll(opts: CollectOptions): DeploySignals {
  return {
    time: collectTime(),
    git: collectGit(),
    diff: collectDiff(opts.baseRef),
    tests: collectTests(opts.testCommand),
    env: collectEnv(opts.target),
  };
}
