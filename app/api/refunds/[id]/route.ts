import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { refundService } from '@/lib/services/refund-service';
import { apiError, apiSuccess } from '@/lib/api-response';
import { Role } from '@/types';
import { logger } from '@/lib/logger';
import { requireAdminPermission } from '@/lib/admin-rbac';
import { StripeService } from '@/lib/services/stripe-service';
import Stripe from 'stripe';

const updateRefundSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  adminNote: z.string().max(500).optional(),
  stripeRefundId: z.string().optional(),
});

// GET - Get refund by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiError("UNAUTHORIZED", "Unauthorized", 401);
    }

    const { id: refundId } = await context.params;
    
    const refund = await refundService.getRefundById(refundId);
    
    if (!refund) {
      return apiError("NOT_FOUND", "Refund not found", 404);
    }

    // Role-based access control
    let hasAccess = refund.payment?.booking?.clientId === session.user.id ||
      refund.payment?.booking?.chefId === session.user.id;

    if (session.user.role === Role.ADMIN) {
      await requireAdminPermission("refunds.request")
      hasAccess = true
    }

    if (!hasAccess) {
      return apiError("FORBIDDEN", "Access denied", 403);
    }

    return apiSuccess(refund);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError("UNAUTHORIZED", "Unauthorized", 401);
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return apiError("FORBIDDEN", "Insufficient permissions", 403);
    }
    return apiError("INTERNAL_SERVER_ERROR", "Failed to fetch refund", 500);
  }
}

// PATCH - Update refund status (admin only)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdminPermission("refunds.approve")

    const { id: refundId } = await context.params;
    const body = await request.json();
    const data = updateRefundSchema.parse(body);

    // Get refund with payment info for validation
    const refund = await refundService.getRefundById(refundId);
    if (!refund) {
      return apiError("NOT_FOUND", "Refund not found", 404);
    }

    // Check for duplicate operations
    if (refund.status !== 'PENDING') {
      return apiError("CONFLICT", `Refund already ${refund.status.toLowerCase()}`, 409);
    }

    if (data.status === 'APPROVED') {
      if (!StripeService.isConfigured()) {
        return apiError("SERVICE_UNAVAILABLE", "Stripe is not configured, so this refund cannot be approved safely.", 503);
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2026-03-25.dahlia' as Stripe.LatestApiVersion,
      })
      const updatedRefund = await refundService.approveRefund(refundId, actor.userId, stripe)
      
      logger.info(`Refund approved: ${refundId} by admin ${actor.userId}`, {
        refundId,
        paymentId: refund.paymentId,
        amount: refund.amount,
        approvedBy: actor.userId
      });

      return apiSuccess(updatedRefund);

    } else if (data.status === 'REJECTED') {
      const updatedRefund = await refundService.rejectRefund(refundId, actor.userId, data.adminNote || '');
      
      logger.info(`Refund rejected: ${refundId} by admin ${actor.userId}`, {
        refundId,
        paymentId: refund.paymentId,
        amount: refund.amount,
        rejectedBy: actor.userId,
        reason: data.adminNote
      });

      return apiSuccess(updatedRefund);
    }

    return apiError("BAD_REQUEST", "Unsupported refund action", 400);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError("UNAUTHORIZED", "Unauthorized", 401);
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return apiError("FORBIDDEN", "Insufficient permissions", 403);
    }
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
    
    // Log refund-related errors for audit
    logger.error("Refund update error", {
      error: error instanceof Error ? error.message : String(error),
      refundId: (await context.params).id,
      userId: undefined
    });

    return apiError("INTERNAL_SERVER_ERROR", "Failed to update refund", 500);
  }
}
