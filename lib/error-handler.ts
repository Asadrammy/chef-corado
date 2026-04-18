import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from './logger';
import { createSafeApiError } from './security/error-sanitizer';
import { apiError } from './api-response';
import type { Session } from 'next-auth';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown, context: string): NextResponse {
  logger.error(`${context} Error:`, error);

  // Handle Zod validation errors specially (they're safe to expose)
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      { status: 422 }
    );
  }

  // Handle specific error messages
  if (error instanceof Error) {
    if (error.message === 'UNAUTHORIZED') {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    if (error.message === 'FORBIDDEN') {
      return apiError('FORBIDDEN', 'Insufficient permissions', 403);
    }

    if (error.message === 'NOT_FOUND') {
      return apiError('NOT_FOUND', 'Resource not found', 404);
    }

    if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      return apiError('SERVICE_UNAVAILABLE', 'Service temporarily unavailable', 503);
    }
  }

  // Use error sanitizer for all other errors
  const safeError = createSafeApiError(error, context);
  
  // Determine HTTP status based on error code
  let status = 500;
  switch (safeError.error.code) {
    case 'AUTHENTICATION_REQUIRED':
      status = 401;
      break;
    case 'INSUFFICIENT_PERMISSIONS':
      status = 403;
      break;
    case 'VALIDATION_ERROR':
      status = 400;
      break;
    case 'RATE_LIMIT_EXCEEDED':
      status = 429;
      break;
    case 'SERVICE_UNAVAILABLE':
      status = 503;
      break;
    case 'NETWORK_ERROR':
      status = 503;
      break;
    case 'PAYMENT_PROCESSING_ERROR':
      status = 502;
      break;
    default:
      status = 500;
  }

  return NextResponse.json(safeError, { status });
}

export function validateSession(session: Session | null, requiredRole?: string) {
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized. Please log in.');
  }

  if (requiredRole && session.user.role !== requiredRole) {
    throw new ApiError(403, `This action requires ${requiredRole} role.`);
  }

  return session;
}

export function validateRequestBody(data: unknown) {
  if (!data || typeof data !== 'object') {
    throw new ApiError(400, 'Invalid request body');
  }
  return data;
}
