import type { EnvSignal } from './types.js';

export function collectEnv(target: string): EnvSignal {
  const ciName = process.env.GITHUB_ACTIONS
    ? 'github-actions'
    : process.env.GITLAB_CI
      ? 'gitlab-ci'
      : process.env.CIRCLECI
        ? 'circleci'
        : process.env.BUILDKITE
          ? 'buildkite'
          : process.env.VERCEL
            ? 'vercel'
            : process.env.CI
              ? 'generic-ci'
              : null;

  return {
    target,
    ciDetected: ciName !== null,
    ciName,
  };
}
