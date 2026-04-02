import { z } from 'zod';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateForm<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { valid: true; data: z.infer<T> } | { valid: false; errors: ValidationError[] } {
  try {
    const validated = schema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return { valid: false, errors };
    }
    return {
      valid: false,
      errors: [{ field: 'unknown', message: 'Validation failed' }],
    };
  }
}

export function getFieldError(errors: ValidationError[], fieldName: string): string | undefined {
  return errors.find((err) => err.field === fieldName)?.message;
}

export function hasFieldError(errors: ValidationError[], fieldName: string): boolean {
  return errors.some((err) => err.field === fieldName);
}
