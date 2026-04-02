import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from './logger';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown, context: string = 'API') {
  logger.error(`${context} Error:`, error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      { status: 400 }
    );
  }

  // Custom API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error.details && { details: error.details }),
      },
      { status: error.statusCode }
    );
  }

  // Network/Prisma errors
  if (error instanceof Error) {
    if (error.message.includes('Unique constraint failed')) {
      return NextResponse.json(
        { error: 'This record already exists' },
        { status: 409 }
      );
    }

    if (error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      return NextResponse.json(
        { error: 'Database connection failed. Please try again.' },
        { status: 503 }
      );
    }
  }

  // Generic error
  return NextResponse.json(
    { error: 'An unexpected error occurred. Please try again.' },
    { status: 500 }
  );
}

export function validateSession(session: any, requiredRole?: string) {
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized. Please log in.');
  }

  if (requiredRole && session.user.role !== requiredRole) {
    throw new ApiError(403, `This action requires ${requiredRole} role.`);
  }

  return session;
}

export function validateRequestBody(data: any) {
  if (!data || typeof data !== 'object') {
    throw new ApiError(400, 'Invalid request body');
  }
  return data;
}
