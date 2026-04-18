import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequiredSession, getSessionUserId } from '@/lib/auth-helpers';
import { disputeService } from '@/lib/services/dispute-service-fixed';
import { apiError, apiSuccess } from '@/lib/api-response';
import { Role } from '@/types';
import { applyRateLimit } from '@/lib/redis-rate-limiter';

const createDisputeSchema = z.object({
  bookingId: z.string().cuid(),
  reason: z.enum(['SERVICE_NOT_DELIVERED', 'QUALITY_MISMATCH', 'PAYMENT_ISSUE', 'SAFETY_CONCERN', 'OTHER']),
  description: z.string().min(10).max(2000),
  evidence: z.array(z.string().url()).optional(),
});

const listDisputesSchema = z.object({
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED_CLIENT_FAVOR', 'RESOLVED_CHEF_FAVOR', 'CLOSED']).optional(),
  reason: z.enum(['SERVICE_NOT_DELIVERED', 'QUALITY_MISMATCH', 'PAYMENT_ISSUE', 'SAFETY_CONCERN', 'OTHER']).optional(),
  clientId: z.string().cuid().optional(),
  chefId: z.string().cuid().optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
});

// POST - Create dispute
export async function POST(request: NextRequest) {
  // Apply strict rate limiting for dispute requests
  const rateLimitResult = await applyRateLimit(request, 'disputes');
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  try {
    const session = await getRequiredSession();
    const userId = getSessionUserId(session);

    const body = await request.json();
    const data = createDisputeSchema.parse(body);

    // Create dispute
    const dispute = await disputeService.createDispute({
      bookingId: data.bookingId,
      reason: data.reason,
      description: data.description,
      evidence: data.evidence || [],
      initiatedBy: userId,
    });

    return apiSuccess(dispute, 201);
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
    return apiError("INTERNAL_SERVER_ERROR", "Failed to create dispute", 500);
  }
}

// GET - List disputes (with role-based filtering)
export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredSession();
    const userId = getSessionUserId(session);

    const { searchParams } = new URL(request.url);
    const filters = listDisputesSchema.parse(Object.fromEntries(searchParams));

    let disputes;
    
    // Role-based filtering
    if (session.user.role === Role.CLIENT) {
      // Clients can only see their own disputes
      disputes = await disputeService.listDisputes({
        ...filters,
        clientId: userId,
      });
    } else if (session.user.role === Role.CHEF) {
      // Chefs can see disputes for their bookings
      disputes = await disputeService.listDisputes({
        ...filters,
        chefId: userId,
      });
    } else if (session.user.role === Role.ADMIN) {
      // Admins can see all disputes
      disputes = await disputeService.listDisputes(filters);
    } else {
      return apiError("FORBIDDEN", "Insufficient permissions", 403);
    }

    return apiSuccess(disputes);
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
    return apiError("INTERNAL_SERVER_ERROR", "Failed to list disputes", 500);
  }
}
