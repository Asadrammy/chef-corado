import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { refundService } from '@/lib/services/refund-service';
import { apiError, apiSuccess } from '@/lib/api-response';
import { Role } from '@/types';
import { prisma } from '@/lib/prisma';
import { ledgerService } from '@/lib/services/ledger-service';
import { logger } from '@/lib/logger';

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
    const hasAccess = 
      session.user.role === Role.ADMIN ||
      refund.payment?.booking?.clientId === session.user.id ||
      refund.payment?.booking?.chefId === session.user.id;

    if (!hasAccess) {
      return apiError("FORBIDDEN", "Access denied", 403);
    }

    return apiSuccess(refund);
  } catch (error) {
    return apiError("INTERNAL_SERVER_ERROR", "Failed to fetch refund", 500);
  }
}

// PATCH - Update refund status (admin only)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  try {
    if (!session?.user?.id || session.user.role !== Role.ADMIN) {
      return apiError("UNAUTHORIZED", "Admin access required", 401);
    }

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

    let updatedRefund;

    if (data.status === 'APPROVED') {
      // Validate payment status before approving
      const payment = await prisma.payment.findUnique({
        where: { id: refund.paymentId },
        include: { booking: true }
      });

      if (!payment) {
        return apiError("NOT_FOUND", "Payment not found", 404);
      }

      if (payment.status !== 'PAID' && payment.status !== 'RELEASED') {
        return apiError("BAD_REQUEST", "Cannot refund payment that is not paid", 400);
      }

      // Check for existing disputes
      const existingDispute = await prisma.dispute.findFirst({
        where: {
          bookingId: payment.bookingId,
          status: { in: ['PENDING', 'UNDER_REVIEW'] }
        }
      });

      if (existingDispute) {
        return apiError("CONFLICT", "Cannot approve refund while dispute is active", 409);
      }

      // For now, just mark as approved (Stripe integration would be here)
      updatedRefund = await prisma.refund.update({
        where: { id: refundId },
        data: {
          status: 'APPROVED',
          processedBy: session.user.id,
          processedAt: new Date(),
        }
      });
      
      logger.info(`Refund approved: ${refundId} by admin ${session.user.id}`, {
        refundId,
        paymentId: refund.paymentId,
        amount: refund.amount,
        approvedBy: session.user.id
      });

    } else if (data.status === 'REJECTED') {
      // Reject refund
      updatedRefund = await refundService.rejectRefund(refundId, session.user.id, data.adminNote || '');
      
      logger.info(`Refund rejected: ${refundId} by admin ${session.user.id}`, {
        refundId,
        paymentId: refund.paymentId,
        amount: refund.amount,
        rejectedBy: session.user.id,
        reason: data.adminNote
      });
    }

    return apiSuccess(updatedRefund);
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
    
    // Log refund-related errors for audit
    logger.error("Refund update error", {
      error: error instanceof Error ? error.message : String(error),
      refundId: (await context.params).id,
      userId: session?.user?.id
    });

    return apiError("INTERNAL_SERVER_ERROR", "Failed to update refund", 500);
  }
}
