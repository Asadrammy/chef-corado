import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { requestRepository } from "@/lib/repositories/request-repository"
import { notifyEligibleChefsAboutRequest } from "@/lib/services/request-notification-service"
import { evaluateChefRequestAccessForRecords, isRequestOpenForQuotes, MAX_QUOTES_PER_REQUEST } from "@/lib/services/request-eligibility-service"
import { isDirectRequestReleasedToLocalChefs } from "@/lib/services/direct-request-access"
import { withRequestPhotoFallback } from "@/lib/request-photo-schema"

export type EventType =
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_COMPLETED"
  | "PAYMENT_INITIATED"
  | "PAYMENT_CAPTURED"
  | "PAYMENT_RELEASED"
  | "PAYMENT_FAILED"
  | "REFUND_REQUESTED"
  | "REFUND_PROCESSED"
  | "REFUND_FAILED"
  | "DISPUTE_CREATED"
  | "DISPUTE_RESOLVED"
  | "PAYOUT_REQUESTED"
  | "PAYOUT_COMPLETED"
  | "PAYOUT_FAILED"
  | "PROPOSAL_SUBMITTED"
  | "PROPOSAL_ACCEPTED"
  | "PROPOSAL_EXPIRED"
  | "REQUEST_BROADER_ACCESS_NOTIFY"
  | "DIRECT_REQUEST_RELEASE_NOTIFY"

export interface EventPayload {
  [key: string]: unknown
}

export interface QueueEvent {
  eventType: EventType
  payload: EventPayload
  priority?: number
  maxRetries?: number
  nextRunAt?: Date
  dedupeKey?: string
}

export const eventQueueService = {
  /**
   * Emit an event to the queue
   * This is the primary way to trigger side effects asynchronously
   */
  async emit(event: QueueEvent): Promise<string> {
    try {
      const payload = JSON.stringify({
        ...event.payload,
        ...(event.dedupeKey ? { dedupeKey: event.dedupeKey } : {}),
      })

      if (event.dedupeKey) {
        const existing = await prisma.eventQueue.findFirst({
          where: {
            eventType: event.eventType,
            payload,
            status: { in: ["PENDING", "PROCESSING", "COMPLETED"] },
          },
          select: { id: true },
        })
        if (existing) return existing.id
      }

      const queued = await prisma.eventQueue.create({
        data: {
          eventType: event.eventType,
          payload,
          status: "PENDING",
          priority: event.priority || 0,
          maxRetries: event.maxRetries || 3,
          nextRetryAt: event.nextRunAt ?? null,
        },
      })

      logger.info(`[EVENT] Emitted ${event.eventType} (ID: ${queued.id})`, {
        eventId: queued.id,
        eventType: event.eventType,
        priority: event.priority,
      })

      return queued.id
    } catch (error) {
      logger.error("[EVENT] Failed to emit event:", { error, event })
      throw error
    }
  },

  /**
   * Process pending events from the queue
   * Should be called by a scheduled job or worker
   */
  async processPendingEvents(batchSize: number = 10): Promise<{
    processed: number
    failed: number
    remaining: number
  }> {
    logger.info(`[EVENT] Processing pending events (batch size: ${batchSize})`)

    const now = new Date()
    const events = await prisma.eventQueue.findMany({
      where: {
        status: "PENDING",
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: now } },
        ],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: batchSize,
    })

    let processed = 0
    let failed = 0
    for (const event of events) {
      await prisma.eventQueue.update({
        where: { id: event.id },
        data: { status: "PROCESSING" },
      })

      try {
        await this.processEvent(event.id, event.eventType, event.payload)
        await prisma.eventQueue.update({
          where: { id: event.id },
          data: { status: "COMPLETED", processedAt: new Date(), errorMessage: null },
        })
        processed += 1
      } catch (error) {
        failed += 1
        await this.markEventFailed(event.id, error, event.retryCount, event.maxRetries)
      }
    }

    const remaining = await prisma.eventQueue.count({ where: { status: "PENDING" } })

    return {
      processed,
      failed,
      remaining
    }
  },

  /**
   * Process a single event
   */
  async processEvent(eventId: string, eventType: string, payload: string): Promise<void> {
    logger.info(`[EVENT] Processing ${eventType} (ID: ${eventId})`)
    
    const data = JSON.parse(payload)

    // Route to appropriate handler
    switch (eventType) {
      case "BOOKING_CREATED":
        await this.handleBookingCreated(data)
        break
      case "BOOKING_CONFIRMED":
        await this.handleBookingConfirmed(data)
        break
      case "BOOKING_CANCELLED":
        await this.handleBookingCancelled(data)
        break
      case "PAYMENT_CAPTURED":
        await this.handlePaymentCaptured(data)
        break
      case "PAYMENT_RELEASED":
        await this.handlePaymentReleased(data)
        break
      case "REFUND_PROCESSED":
        await this.handleRefundProcessed(data)
        break
      case "DISPUTE_CREATED":
        await this.handleDisputeCreated(data)
        break
      case "DISPUTE_RESOLVED":
        await this.handleDisputeResolved(data)
        break
      case "REQUEST_BROADER_ACCESS_NOTIFY":
        await this.handleRequestBroaderAccessNotify(data)
        break
      case "DIRECT_REQUEST_RELEASE_NOTIFY":
        await this.handleDirectRequestReleaseNotify(data)
        break
      default:
        logger.warn(`[EVENT] No handler for event type: ${eventType}`)
    }

    logger.info(`[EVENT] Processed ${eventType} (ID: ${eventId})`)
  },

  /**
   * Mark an event as failed and schedule retry
   */
  async markEventFailed(
    eventId: string,
    error: unknown,
    currentRetryCount: number,
    maxRetries: number
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const shouldRetry = currentRetryCount < maxRetries

    if (shouldRetry) {
      // Exponential backoff: 1 min, 5 min, 15 min
      const backoffMinutes = [1, 5, 15][currentRetryCount] || 30
      const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000)

      await prisma.eventQueue.update({
        where: { id: eventId },
        data: {
          status: "PENDING",
          retryCount: { increment: 1 },
          nextRetryAt,
          errorMessage,
        },
      })
      logger.warn(`[EVENT] Scheduled retry for ${eventId} at ${nextRetryAt}`)
    } else {
      await prisma.eventQueue.update({
        where: { id: eventId },
        data: {
          status: "FAILED",
          errorMessage,
        },
      })
      logger.error(`[EVENT] Event ${eventId} failed permanently after ${maxRetries} retries`)
    }
  },

  // Event Handlers
  async handleBookingCreated(data: EventPayload): Promise<void> {
    // Send notifications, update analytics, etc.
    logger.info("[EVENT HANDLER] Booking created:", data)
  },

  async handleBookingConfirmed(data: EventPayload): Promise<void> {
    logger.info("[EVENT HANDLER] Booking confirmed:", data)
  },

  async handleBookingCancelled(data: EventPayload): Promise<void> {
    // Trigger refund flow if needed
    logger.info("[EVENT HANDLER] Booking cancelled:", data)
  },

  async handlePaymentCaptured(data: EventPayload): Promise<void> {
    logger.info("[EVENT HANDLER] Payment captured:", data)
  },

  async handlePaymentReleased(data: EventPayload): Promise<void> {
    // Trigger chef notification
    logger.info("[EVENT HANDLER] Payment released:", data)
  },

  async handleRefundProcessed(data: EventPayload): Promise<void> {
    // Update chef balance, notify client
    logger.info("[EVENT HANDLER] Refund processed:", data)
  },

  async handleDisputeCreated(data: EventPayload): Promise<void> {
    // Freeze payouts, alert admin
    logger.info("[EVENT HANDLER] Dispute created:", data)
  },

  async handleDisputeResolved(data: EventPayload): Promise<void> {
    // Unfreeze payouts if appropriate
    logger.info("[EVENT HANDLER] Dispute resolved:", data)
  },

  async handleRequestBroaderAccessNotify(data: EventPayload): Promise<void> {
    const requestId = typeof data.requestId === "string" ? data.requestId : null
    if (!requestId) return

    const request = await withRequestPhotoFallback(
      () => prisma.request.findUnique({
        where: { id: requestId },
        include: {
          client: { select: { name: true, firstName: true, verified: true } },
          proposals: { select: { chefId: true, status: true } },
          invitations: { select: { chefId: true, status: true, createdAt: true } },
          photos: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            take: 3,
            select: { id: true, url: true, originalName: true },
          },
          multiDayDates: { orderBy: [{ date: "asc" }, { sortOrder: "asc" }] },
          _count: { select: { proposals: true } },
        },
      }),
      () => prisma.request.findUnique({
        where: { id: requestId },
        include: {
          client: { select: { name: true, firstName: true, verified: true } },
          proposals: { select: { chefId: true, status: true } },
          invitations: { select: { chefId: true, status: true, createdAt: true } },
          multiDayDates: { orderBy: [{ date: "asc" }, { sortOrder: "asc" }] },
          _count: { select: { proposals: true } },
        },
      })
    )

    if (!request) return
    if (!isRequestOpenForQuotes(request) || request._count.proposals >= MAX_QUOTES_PER_REQUEST) return
    if (request.invitations.some((invitation) => invitation.status !== "DECLINED")) return

    const chefs = await requestRepository.findApprovedChefsWithCoordinates()
    const broaderChefs = []
    for (const chef of chefs) {
      const access = await evaluateChefRequestAccessForRecords({ chef, request })
      if (access.canView && access.broaderAccess) {
        broaderChefs.push(chef)
      }
    }

    if (broaderChefs.length > 0) {
      await notifyEligibleChefsAboutRequest({ request, chefs: broaderChefs })
    }
  },

  async handleDirectRequestReleaseNotify(data: EventPayload): Promise<void> {
    const requestId = typeof data.requestId === "string" ? data.requestId : null
    if (!requestId) return

    const request = await withRequestPhotoFallback(
      () => prisma.request.findUnique({
        where: { id: requestId },
        include: {
          client: { select: { name: true, firstName: true, verified: true } },
          proposals: { select: { chefId: true, status: true } },
          invitations: { select: { chefId: true, status: true, createdAt: true } },
          photos: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            take: 3,
            select: { id: true, url: true, originalName: true },
          },
          multiDayDates: { orderBy: [{ date: "asc" }, { sortOrder: "asc" }] },
          _count: { select: { proposals: true } },
        },
      }),
      () => prisma.request.findUnique({
        where: { id: requestId },
        include: {
          client: { select: { name: true, firstName: true, verified: true } },
          proposals: { select: { chefId: true, status: true } },
          invitations: { select: { chefId: true, status: true, createdAt: true } },
          multiDayDates: { orderBy: [{ date: "asc" }, { sortOrder: "asc" }] },
          _count: { select: { proposals: true } },
        },
      })
    )

    if (!request) return
    if (!isRequestOpenForQuotes(request) || request._count.proposals >= MAX_QUOTES_PER_REQUEST) return
    if (!isDirectRequestReleasedToLocalChefs(request)) return

    const chefs = await requestRepository.findApprovedChefsWithCoordinates()
    const localChefs = []
    for (const chef of chefs) {
      const access = await evaluateChefRequestAccessForRecords({ chef, request })
      if (access.canView && access.local && !access.invited) {
        localChefs.push(chef)
      }
    }

    if (localChefs.length > 0) {
      await notifyEligibleChefsAboutRequest({ request, chefs: localChefs })
    }
  },

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number
    processing: number
    completed: number
    failed: number
    retrying: number
  }> {
    logger.info(`[EVENT] Getting queue stats`)
    const [pending, processing, completed, failed] = await Promise.all([
      prisma.eventQueue.count({ where: { status: "PENDING" } }),
      prisma.eventQueue.count({ where: { status: "PROCESSING" } }),
      prisma.eventQueue.count({ where: { status: "COMPLETED" } }),
      prisma.eventQueue.count({ where: { status: "FAILED" } }),
    ])

    return {
      pending,
      processing,
      completed,
      failed,
      retrying: pending
    }
  },

  /**
   * Retry a failed event manually
   */
  async retryEvent(eventId: string): Promise<void> {
    await prisma.eventQueue.update({
      where: { id: eventId },
      data: { status: "PENDING", nextRetryAt: new Date(), errorMessage: null },
    })
    logger.info(`[EVENT] Retrying event ${eventId}`)
  },
}
