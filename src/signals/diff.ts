import { execSync } from 'node:child_process';
import type { DiffSignal } from './types.js';

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

const RISKY_PATTERNS = {
  infra: /(terraform|\.tf$|k8s|kubernetes|helm|dockerfile|docker-compose|\.github\/workflows|ansible)/i,
  migrations: /(migrations?\/|schema\.(sql|prisma)|alembic\/|flyway|liquibase)/i,
  auth: /(auth|login|signup|session|jwt|oauth|password|token|permission|rbac|acl)/i,
  payments: /(stripe|billing|payment|invoice|charge|subscription|checkout)/i,
  config: /(\.env|config\/|\.yaml$|\.yml$|\.toml$|secrets)/i,
};

export function collectDiff(baseRef: string): DiffSignal {
  const numstat = sh(`git diff --numstat ${baseRef}...HEAD`);
  let insertions = 0;
  let deletions = 0;
  const touchedPaths: string[] = [];

  if (numstat) {
    for (const line of numstat.split('\n')) {
      const [ins, del, path] = line.split('\t');
      const i = parseInt(ins, 10);
      const d = parseInt(del, 10);
      if (!isNaN(i)) insertions += i;
      if (!isNaN(d)) deletions += d;
      if (path) touchedPaths.push(path);
    }
  }

  const joined = touchedPaths.join('\n');

  return {
    filesChanged: touchedPaths.length,
    insertions,
    deletions,
    touchedPaths: touchedPaths.slice(0, 50),
    touchesInfra: RISKY_PATTERNS.infra.test(joined),
    touchesMigrations: RISKY_PATTERNS.migrations.test(joined),
    touchesAuth: RISKY_PATTERNS.auth.test(joined),
    touchesPayments: RISKY_PATTERNS.payments.test(joined),
    touchesConfig: RISKY_PATTERNS.config.test(joined),
  };
}
