import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { disputeService } from '@/lib/services/dispute-service-fixed';
import { apiError, apiSuccess } from '@/lib/api-response';
import { Role } from '@/types';
import { prisma } from '@/lib/prisma';
import { ledgerService } from '@/lib/services/ledger-service';
import { logger } from '@/lib/logger';

const updateDisputeSchema = z.object({
  status: z.enum(['INVESTIGATING', 'RESOLVED_CLIENT_FAVOR', 'RESOLVED_CHEF_FAVOR', 'CLOSED']),
  resolution: z.string().max(1000).optional(),
  adminNote: z.string().max(500).optional(),
  compensation: z.number().positive().optional(),
});

const addEvidenceSchema = z.object({
  evidence: z.array(z.string().url()).max(10),
});

// GET - Get dispute by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiError("UNAUTHORIZED", "Unauthorized", 401);
    }

    const { id: disputeId } = await context.params;
    
    const dispute = await disputeService.getDisputeById(disputeId);
    
    if (!dispute) {
      return apiError("NOT_FOUND", "Dispute not found", 404);
    }

    // Role-based access control
    const hasAccess = 
      session.user.role === Role.ADMIN ||
      dispute.initiatedBy === session.user.id ||
      dispute.booking?.clientId === session.user.id ||
      dispute.booking?.chefId === session.user.id;

    if (!hasAccess) {
      return apiError("FORBIDDEN", "Access denied", 403);
    }

    return apiSuccess(dispute);
  } catch (error) {
    return apiError("INTERNAL_SERVER_ERROR", "Failed to fetch dispute", 500);
  }
}

// PATCH - Update dispute status (admin only)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  try {
    if (!session?.user?.id || session.user.role !== Role.ADMIN) {
      return apiError("UNAUTHORIZED", "Admin access required", 401);
    }

    const { id: disputeId } = await context.params;
    const body = await request.json();
    const data = updateDisputeSchema.parse(body);

    // Get dispute with booking info
    const dispute = await disputeService.getDisputeById(disputeId);
    if (!dispute) {
      return apiError("NOT_FOUND", "Dispute not found", 404);
    }

    // Check for invalid status transitions
    const validTransitions: Record<string, string[]> = {
      'OPEN': ['INVESTIGATING', 'CLOSED'],
      'INVESTIGATING': ['RESOLVED_CLIENT_FAVOR', 'RESOLVED_CHEF_FAVOR', 'CLOSED'],
      'RESOLVED_CLIENT_FAVOR': ['CLOSED'],
      'RESOLVED_CHEF_FAVOR': ['CLOSED'],
      'CLOSED': []
    };

    if (!validTransitions[dispute.status]?.includes(data.status)) {
      return apiError("BAD_REQUEST", `Invalid status transition from ${dispute.status} to ${data.status}`, 400);
    }

    let updatedDispute;

    if (data.status === 'RESOLVED_CLIENT_FAVOR') {
      // Resolve in client's favor - create refund
      updatedDispute = await disputeService.updateDisputeStatus(disputeId, data.status, session.user.id, data.resolution);

      // Freeze chef payouts during dispute resolution
      const payoutService = (await import('@/lib/services/payout-service')).payoutService;
      await payoutService.freezePayouts(dispute.booking?.chefId);

      logger.info(`Dispute resolved in client favor: ${disputeId}`, {
        disputeId,
        bookingId: dispute.bookingId,
        compensation: data.compensation,
        resolvedBy: session.user.id
      });

    } else if (data.status === 'RESOLVED_CHEF_FAVOR') {
      // Resolve in chef's favor - unfreeze payouts
      updatedDispute = await disputeService.updateDisputeStatus(disputeId, data.status, session.user.id, data.resolution);

      // Unfreeze chef payouts
      const payoutService = (await import('@/lib/services/payout-service')).payoutService;
      await payoutService.unfreezePayouts(dispute.booking?.chefId);

      logger.info(`Dispute resolved in chef favor: ${disputeId}`, {
        disputeId,
        bookingId: dispute.bookingId,
        resolvedBy: session.user.id
      });

    } else {
      // Update status
      updatedDispute = await disputeService.updateDisputeStatus(disputeId, data.status, session.user.id, data.adminNote);
    }

    return apiSuccess(updatedDispute);
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
    
    // Log dispute-related errors for audit
    logger.error("Dispute update error", {
      error: error instanceof Error ? error.message : String(error),
      disputeId: (await context.params).id,
      userId: session?.user?.id
    });

    return apiError("INTERNAL_SERVER_ERROR", "Failed to update dispute", 500);
  }
}

// POST - Add evidence to dispute
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiError("UNAUTHORIZED", "Unauthorized", 401);
    }

    const { id: disputeId } = await context.params;
    const body = await request.json();
    const data = addEvidenceSchema.parse(body);

    // Check if user can add evidence (client, chef, or admin)
    const dispute = await disputeService.getDisputeById(disputeId);
    if (!dispute) {
      return apiError("NOT_FOUND", "Dispute not found", 404);
    }

    const hasAccess = 
      session.user.role === Role.ADMIN ||
      dispute.initiatedBy === session.user.id ||
      dispute.booking?.clientId === session.user.id ||
      dispute.booking?.chefId === session.user.id;

    if (!hasAccess) {
      return apiError("FORBIDDEN", "Access denied", 403);
    }

    // Check if dispute is still open for evidence
    if (['CLOSED', 'RESOLVED_CLIENT_FAVOR', 'RESOLVED_CHEF_FAVOR'].includes(dispute.status)) {
      return apiError("BAD_REQUEST", "Cannot add evidence to closed dispute", 400);
    }

    // Check if dispute is in proper state for evidence (OPEN or INVESTIGATING)
    if (!['OPEN', 'INVESTIGATING'].includes(dispute.status)) {
      return apiError("BAD_REQUEST", "Cannot add evidence to dispute in current state", 400);
    }

    const updatedDispute = await disputeService.addEvidence(disputeId, data.evidence, session.user.id);

    logger.info(`Evidence added to dispute: ${disputeId}`, {
      disputeId,
      evidenceCount: data.evidence.length,
      addedBy: session.user.id
    });

    return apiSuccess(updatedDispute);
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
    return apiError("INTERNAL_SERVER_ERROR", "Failed to add evidence", 500);
  }
}
