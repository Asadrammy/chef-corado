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

    if (error.message === 'ACCOUNT_BANNED' || error.message === 'ACCOUNT_SUSPENDED') {
      return apiError('ACCOUNT_SUSPENDED', 'Your account is suspended.', 403);
    }

    if (error.message === 'CHEF_ACCOUNT_SUSPENDED') {
      return apiError('CHEF_ACCOUNT_SUSPENDED', 'This chef account is suspended.', 403);
    }

    if (error.message === 'FORBIDDEN') {
      return apiError('FORBIDDEN', 'Insufficient permissions', 403);
    }

    if (error.message === 'NOT_FOUND') {
      return apiError('NOT_FOUND', 'Resource not found', 404);
    }

    if (error.message === 'TERMS_ACCEPTANCE_REQUIRED') {
      return apiError('TERMS_ACCEPTANCE_REQUIRED', 'You must accept the latest terms before continuing.', 403);
    }

    if (error.message === 'TERMS_ACCEPTANCE_OUTDATED') {
      return apiError('TERMS_ACCEPTANCE_OUTDATED', 'Your legal acceptance is outdated and must be renewed.', 403);
    }

    if (error.message === 'INSURANCE_DOCUMENT_REQUIRED') {
      return apiError('INSURANCE_DOCUMENT_REQUIRED', 'An insurance document is required before continuing.', 403);
    }

    if (error.message === 'INSURANCE_VERIFICATION_REQUIRED') {
      return apiError('INSURANCE_VERIFICATION_REQUIRED', 'Insurance verification is required before continuing.', 403);
    }

    if (error.message === 'INSURANCE_REJECTED') {
      return apiError('INSURANCE_REJECTED', 'Your insurance submission was rejected. Please upload a new document.', 403);
    }

    if (error.message === 'INSURANCE_EXPIRED') {
      return apiError('INSURANCE_EXPIRED', 'Your insurance verification has expired. Please upload a renewed document.', 403);
    }

    if (error.message === 'LEGAL_COMPLIANCE_REQUIRED') {
      return apiError('LEGAL_COMPLIANCE_REQUIRED', 'Your account must complete legal compliance requirements before continuing.', 403);
    }

    if (error.message === 'REQUEST_PROPOSAL_LIMIT_REACHED') {
      return apiError('REQUEST_PROPOSAL_LIMIT_REACHED', 'This request has already received the maximum of 10 quotes.', 409);
    }

    if (error.message.startsWith('COMMUNICATION_POLICY_VIOLATION')) {
      const [, field, message] = error.message.split(':');
      return NextResponse.json(
        {
          error: message || field || 'Content violates the platform communication policy.',
          details: field && message
            ? [{ field, message }]
            : undefined,
        },
        { status: 422 }
      );
    }

    if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      return apiError('SERVICE_UNAVAILABLE', 'Service temporarily unavailable', 503);
    }

    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
        },
        { status: error.statusCode }
      );
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
