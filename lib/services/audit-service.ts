import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

type AuditAction = 
  | 'PAYMENT_CAPTURED'
  | 'REFUND_CREATED'
  | 'REFUND_APPROVED'
  | 'REFUND_REJECTED'
  | 'PAYOUT_CREATED'
  | 'PAYOUT_RELEASED'
  | 'DISPUTE_CREATED'
  | 'DISPUTE_RESOLVED'
  | 'BOOKING_CANCELLED'
  | 'ADMIN_PAYMENT_RELEASE'
  | 'ADMIN_LOGIN'
  | 'ADMIN_PERMISSION_CHANGED'
  | 'CHEF_APPROVED'
  | 'CHEF_REJECTED'
  | 'PRICING_RULE_CREATED'
  | 'PRICING_RULE_UPDATED'
  | 'PRICING_RULE_STATUS_CHANGED'
  | 'SERVICE_ASSET_CREATED'
  | 'SERVICE_ASSET_UPDATED'
  | 'SUPPORT_TICKET_UPDATED'

type AuditData = {
  userId?: string
  role?: string
  paymentId?: string
  bookingId?: string
  refundId?: string
  payoutId?: string
  disputeId?: string
  amount?: number
  reason?: string
  metadata?: Record<string, any>
}

export const auditService = {
  async logAction(action: AuditAction, data: AuditData) {
    try {
      const entityType = data.metadata?.entityType
        ?? (data.paymentId ? 'Payment'
          : data.bookingId ? 'Booking'
            : data.refundId ? 'Refund'
              : data.payoutId ? 'Payout'
                : data.disputeId ? 'Dispute'
                  : 'AdminAction')
      const entityId = data.metadata?.entityId
        ?? data.paymentId
        ?? data.bookingId
        ?? data.refundId
        ?? data.payoutId
        ?? data.disputeId
        ?? data.userId
        ?? 'SYSTEM'

      await prisma.auditLog.create({
        data: {
          action,
          entityType,
          entityId,
          oldValue: data.metadata?.oldValue ? JSON.stringify(data.metadata.oldValue) : null,
          newValue: JSON.stringify({
            role: data.role,
            amount: data.amount,
            metadata: data.metadata,
          }),
          performedBy: data.userId || 'SYSTEM',
          reason: data.reason,
        },
      })

      logger.info(`Audit log: ${action}`, {
        action,
        userId: data.userId,
        paymentId: data.paymentId,
        bookingId: data.bookingId,
        refundId: data.refundId,
        payoutId: data.payoutId,
        disputeId: data.disputeId,
        amount: data.amount,
        reason: data.reason,
        metadata: data.metadata,
        performedBy: data.userId || 'SYSTEM',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      // Don't let audit logging failures break the main flow
      logger.error('Failed to create audit log', {
        error: error instanceof Error ? error.message : String(error),
        action,
        data
      })
    }
  },

  async getAuditHistory(filters: {
    userId?: string
    action?: AuditAction
    paymentId?: string
    bookingId?: string
    refundId?: string
    payoutId?: string
    disputeId?: string
    startDate?: Date
    endDate?: Date
    page?: number
    limit?: number
  }) {
    const page = filters.page || 1
    const limit = filters.limit || 50
    const where = {
      ...(filters.userId ? { performedBy: filters.userId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.paymentId ? { entityType: 'Payment', entityId: filters.paymentId } : {}),
      ...(filters.bookingId ? { entityType: 'Booking', entityId: filters.bookingId } : {}),
      ...(filters.refundId ? { entityType: 'Refund', entityId: filters.refundId } : {}),
      ...(filters.payoutId ? { entityType: 'Payout', entityId: filters.payoutId } : {}),
      ...(filters.disputeId ? { entityType: 'Dispute', entityId: filters.disputeId } : {}),
      ...((filters.startDate || filters.endDate) ? {
        createdAt: {
          ...(filters.startDate ? { gte: filters.startDate } : {}),
          ...(filters.endDate ? { lte: filters.endDate } : {}),
        },
      } : {}),
    }
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    }
  }
}
