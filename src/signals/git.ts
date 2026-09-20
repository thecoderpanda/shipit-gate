import { execSync } from 'node:child_process';
import type { GitSignal } from './types.js';

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

export function collectGit(): GitSignal {
  const branch = sh('git rev-parse --abbrev-ref HEAD') || 'unknown';
  const headSha = sh('git rev-parse --short HEAD') || 'unknown';
  const status = sh('git status --porcelain');
  const dirtyFiles = status ? status.split('\n').filter(Boolean).length : 0;

  const logRaw = sh("git log -n 10 --pretty=format:%h%x1f%an%x1f%ad%x1f%s --date=iso");
  const recentCommits = logRaw
    ? logRaw.split('\n').map((line) => {
        const [sha, author, date, subject] = line.split('\x1f');
        return { sha, author, date, subject };
      })
    : [];

  let ahead = 0;
  let behind = 0;
  const upstream = sh('git rev-parse --abbrev-ref --symbolic-full-name @{u}');
  if (upstream) {
    const counts = sh(`git rev-list --left-right --count ${upstream}...HEAD`);
    const [b, a] = counts.split(/\s+/).map((n) => parseInt(n, 10) || 0);
    behind = b ?? 0;
    ahead = a ?? 0;
  }

  return {
    branch,
    headSha,
    isDirty: dirtyFiles > 0,
    dirtyFiles,
    recentCommits,
    ahead,
    behind,
  };
}
