import { z } from 'zod';

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  CT_API_BASE_URL: z.string().url().default('https://clinicaltrials.gov/api/v2'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MAX_STUDIES_DEFAULT: z.coerce.number().int().min(10).max(1000).default(500),
  MAX_STUDIES_HARD_CAP: z.coerce.number().int().min(10).max(1000).default(1000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export function envValidate(raw: Record<string, unknown>): EnvConfig {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return parsed.data;
}
