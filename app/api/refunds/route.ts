import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequiredSession, getSessionUserId } from '@/lib/auth-helpers';
import { refundService } from '@/lib/services/refund-service';
import { apiError, apiSuccess } from '@/lib/api-response';
import { Role } from '@/types';
import { applyRateLimit } from '@/lib/redis-rate-limiter';

const createRefundSchema = z.object({
  paymentId: z.string().cuid(),
  amount: z.number().positive(),
  reason: z.enum(['CANCELLATION', 'NO_SHOW', 'SERVICE_ISSUE', 'QUALITY_ISSUE', 'OTHER']),
  description: z.string().min(1).max(1000),
});

const listRefundsSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PROCESSED', 'FAILED']).optional(),
  paymentId: z.string().cuid().optional(),
  chefId: z.string().cuid().optional(),
  clientId: z.string().cuid().optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
});

// POST - Create refund request
export async function POST(request: NextRequest) {
  // Apply strict rate limiting for refund requests
  const rateLimitResult = await applyRateLimit(request, 'refunds');
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  try {
    const session = await getRequiredSession();
    const userId = getSessionUserId(session);

    const body = await request.json();
    const data = createRefundSchema.parse(body);

    // Create refund request
    const refund = await refundService.createRefundRequest({
      paymentId: data.paymentId,
      amount: data.amount,
      reason: data.reason,
      description: data.description,
      requestedBy: userId,
    });

    return apiSuccess(refund, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        "VALIDATION_ERROR",
        "Validation failed",
        422,
        error.errors.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }))
      );
    }
    return apiError("INTERNAL_SERVER_ERROR", "Failed to create refund request", 500);
  }
}

// GET - List refunds (with role-based filtering)
export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredSession();
    const userId = getSessionUserId(session);

    const { searchParams } = new URL(request.url);
    const filters = listRefundsSchema.parse(Object.fromEntries(searchParams));

    let refunds;
    
    // Role-based filtering
    if (session.user.role === Role.CLIENT) {
      // Clients can only see their own refunds
      refunds = await refundService.listRefunds({
        ...filters,
        clientId: userId,
      });
    } else if (session.user.role === Role.CHEF) {
      // Chefs can see refunds for their bookings
      refunds = await refundService.listRefunds({
        ...filters,
        chefId: userId,
      });
    } else if (session.user.role === Role.ADMIN) {
      // Admins can see all refunds
      refunds = await refundService.listRefunds(filters);
    } else {
      return apiError("FORBIDDEN", "Insufficient permissions", 403);
    }

    return apiSuccess(refunds);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        "VALIDATION_ERROR",
        "Validation failed",
        422,
        error.errors.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }))
      );
    }
    return apiError("INTERNAL_SERVER_ERROR", "Failed to list refunds", 500);
  }
}
