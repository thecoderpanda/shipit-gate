import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const ConfigSchema = z.object({
  target: z.string().default('production'),
  baseRef: z.string().default('origin/main'),
  testCommand: z.string().nullable().default(null),
  model: z.string().default('typesafe-ai/jev'),
  blockOn: z
    .object({
      shouldBlock: z.boolean().default(true),
      minConfidence: z.number().min(0).max(1).default(0.5),
      maxRollbackRisk: z.number().min(0).max(1).default(0.7),
      blockBlastRadius: z.array(z.enum(['low', 'medium', 'high', 'critical'])).default(['critical']),
    })
    .default({}),
});

export type ShipitConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(cwd: string = process.cwd()): ShipitConfig {
  const candidates = ['.shipitrc.json', 'shipit.config.json'];
  for (const name of candidates) {
    const p = resolve(cwd, name);
    if (existsSync(p)) {
      const raw = JSON.parse(readFileSync(p, 'utf8'));
      return ConfigSchema.parse(raw);
    }
  }
  return ConfigSchema.parse({});
}

export function shouldBlock(cfg: ShipitConfig, decision: {
  should_block: boolean;
  deploy_confidence: number;
  rollback_risk: number;
  blast_radius: 'low' | 'medium' | 'high' | 'critical';
}): { block: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const r = cfg.blockOn;

  if (r.shouldBlock && decision.should_block) reasons.push('Jev says block');
  if (decision.deploy_confidence < r.minConfidence)
    reasons.push(`deploy_confidence ${decision.deploy_confidence.toFixed(2)} < ${r.minConfidence}`);
  if (decision.rollback_risk > r.maxRollbackRisk)
    reasons.push(`rollback_risk ${decision.rollback_risk.toFixed(2)} > ${r.maxRollbackRisk}`);
  if (r.blockBlastRadius.includes(decision.blast_radius))
    reasons.push(`blast_radius = ${decision.blast_radius}`);

  return { block: reasons.length > 0, reasons };
}
