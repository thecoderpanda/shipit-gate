#!/usr/bin/env node
import { Command } from 'commander';
import kleur from 'kleur';
import { collectAll } from './signals/index.js';
import { askJev } from './jev.js';
import { mockJev, type MockScenario } from './mock.js';
import { loadConfig, shouldBlock } from './config.js';
import { renderReport } from './render.js';

const program = new Command();

program
  .name('shipit')
  .description('The AI deploy gate. Ask Jev if it is safe to ship.')
  .version('0.1.0');

program
  .command('check')
  .description('Ask Jev whether it is safe to deploy right now')
  .option('-t, --target <env>', 'deploy target (production, staging, ...)')
  .option('-b, --base <ref>', 'base ref to diff against')
  .option('--test-command <cmd>', 'command to run tests before asking Jev')
  .option('--json', 'output raw JSON instead of the pretty report')
  .option('--force', 'do NOT exit non-zero even if Jev blocks (not recommended)')
  .option('--dry-run', 'skip Jev call, print collected signals only')
  .option('--mock [scenario]', 'demo mode: fake Jev response (safe|risky|blocked|auto)')
  .action(async (opts: {
    target?: string;
    base?: string;
    testCommand?: string;
    json?: boolean;
    force?: boolean;
    dryRun?: boolean;
    mock?: string | boolean;
  }) => {
    const cfg = loadConfig();
    const target = opts.target ?? cfg.target;
    const baseRef = opts.base ?? cfg.baseRef;
    const testCommand = opts.testCommand ?? cfg.testCommand;

    process.stderr.write(kleur.dim('→ collecting deploy signals...\n'));
    const signals = collectAll({ baseRef, testCommand, target });

    if (opts.dryRun) {
      process.stdout.write(JSON.stringify(signals, null, 2) + '\n');
      return;
    }

    let decision;
    if (opts.mock !== undefined) {
      const scenario = (typeof opts.mock === 'string' ? opts.mock : 'auto') as MockScenario;
      process.stderr.write(kleur.dim(`→ asking jev... `) + kleur.magenta(`[mock:${scenario}]\n`));
      await new Promise((r) => setTimeout(r, 220));
      decision = mockJev(signals, scenario);
    } else {
      const apiKey = process.env.TYPESAFE_API_KEY ?? process.env.VERCEL_AI_GATEWAY_KEY ?? '';
      if (!apiKey) {
        process.stderr.write(
          kleur.red('✗ Missing TYPESAFE_API_KEY (or VERCEL_AI_GATEWAY_KEY) env var.\n') +
            kleur.dim('  Get one at https://typesafe.ai and re-run, or try --mock for a demo.\n'),
        );
        process.exit(2);
      }

      process.stderr.write(kleur.dim('→ asking jev...\n'));
      try {
        decision = await askJev({ signals, target, apiKey, model: cfg.model });
      } catch (err) {
        process.stderr.write(kleur.red('✗ Jev call failed: ') + String((err as Error).message) + '\n');
        process.exit(2);
      }
    }

    const gate = shouldBlock(cfg, decision);

    if (opts.json) {
      process.stdout.write(JSON.stringify({ signals, decision, gate }, null, 2) + '\n');
    } else {
      process.stdout.write(renderReport(signals, decision, gate));
    }

    if (gate.block && !opts.force) {
      process.exit(1);
    }
    process.exit(0);
  });

program
  .command('init')
  .description('Write a starter .shipitrc.json into the current folder')
  .action(async () => {
    const { writeFileSync, existsSync } = await import('node:fs');
    if (existsSync('.shipitrc.json')) {
      process.stderr.write(kleur.yellow('! .shipitrc.json already exists, not overwriting.\n'));
      process.exit(1);
    }
    const template = {
      target: 'production',
      baseRef: 'origin/main',
      testCommand: 'npm test',
      model: 'typesafe-ai/jev',
      blockOn: {
        shouldBlock: true,
        minConfidence: 0.5,
        maxRollbackRisk: 0.7,
        blockBlastRadius: ['critical'],
      },
    };
    writeFileSync('.shipitrc.json', JSON.stringify(template, null, 2) + '\n');
    process.stdout.write(kleur.green('✓ wrote .shipitrc.json\n'));
  });

program.parseAsync(process.argv);
