import { z } from 'zod';

export class EnvValidationError extends Error {
  constructor(message: string, public errors: z.ZodError) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

export function validateEnv<T extends z.ZodType>(
  schema: T,
  env: Record<string, any> = process.env
): z.infer<T> {
  const result = schema.safeParse(env);

  if (!result.success) {
    const errorMessages = result.error.errors
      .map(err => `${err.path.join('.')}: ${err.message}`)
      .join('\n');

    throw new EnvValidationError(
      `Environment validation failed:\n${errorMessages}`,
      result.error
    );
  }

  return result.data;
}

export function loadEnv<T extends z.ZodType>(schema: T): z.infer<T> {
  return validateEnv(schema, process.env);
}
