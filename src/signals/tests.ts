import { spawnSync } from 'node:child_process';
import type { TestSignal } from './types.js';

export function collectTests(command: string | null): TestSignal {
  if (!command) {
    return { ran: false, passed: false, command: null, exitCode: null, output: null };
  }

  const result = spawnSync(command, { shell: true, encoding: 'utf8', timeout: 300_000 });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.slice(-4000);

  return {
    ran: true,
    passed: result.status === 0,
    command,
    exitCode: result.status,
    output,
  };
}
