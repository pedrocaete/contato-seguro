import 'dotenv/config';

import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3333),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    DATABASE_URL: z.string().min(1).optional(),
    TICKET_CLASSIFIER_PROVIDER: z.enum(['rule_based', 'gemini']).default('rule_based'),
    GEMINI_API_KEY: z.string().min(1).optional(),
    GEMINI_MODEL: z.string().min(1).default('gemini-2.5-flash'),
    GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
    GEMINI_MAX_RETRIES: z.coerce.number().int().min(0).default(1),
    REDIS_HOST: z.string().min(1).default('redis'),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
    REDIS_PASSWORD: z.string().optional(),
    QUEUE_TICKET_CLASSIFICATION_NAME: z.string().min(1).default('ticket-classification')
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'test' && !data.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL is required outside test environment.'
      });
    }
  });

export const env = envSchema.parse(process.env);
