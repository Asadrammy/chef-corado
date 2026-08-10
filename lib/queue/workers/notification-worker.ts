import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { logger } from '@/lib/monitoring/logger'
import { NotificationJobData, QUEUE_NAMES } from '../queue'
import { prisma } from '@/lib/prisma'
import { shouldSendNotification, type NotificationTopic } from '@/lib/notification-preferences'
import { sendPreferenceAwareEmail } from '@/lib/email'

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
}

/**
 * Notification Worker
 * Processes notification jobs from the queue
 * Handles:
 * - Email sending
 * - In-app notifications
 * - SMS notifications (optional)
 * - Notification delivery tracking
 */
export class NotificationWorker {
  private worker: Worker | null = null

  async start() {
    this.worker = new Worker(QUEUE_NAMES.NOTIFICATIONS, this.processNotification.bind(this), {
      connection: new Redis(redisConfig),
      concurrency: 10, // Process 10 notifications concurrently
    })

    this.worker.on('completed', (job) => {
      logger.info(`[NOTIFICATION_WORKER] Job completed`, {
        jobId: job.id,
        userId: job.data.userId,
      })
    })

    this.worker.on('failed', (job, error) => {
      logger.error(`[NOTIFICATION_WORKER] Job failed`, {
        jobId: job?.id,
        error: error.message,
        attempts: job?.attemptsMade,
      })
    })

    logger.info('[NOTIFICATION_WORKER] Started')
  }

  /**
   * Map notification type to topic for preference checking
   */
  private getNotificationTopic(type: string): NotificationTopic {
    switch (type) {
      case 'MESSAGE_RECEIVED':
        return 'messages'
      case 'BOOKING_CONFIRMED':
      case 'BOOKING_CANCELLED':
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_FAILED':
      case 'PAYOUT_RELEASED':
        return 'bookings'
      case 'PROPOSAL_RECEIVED':
      case 'PROPOSAL_ACCEPTED':
      case 'PROPOSAL_REJECTED':
      case 'REQUEST_RECEIVED':
      default:
        return 'requests'
    }
  }

  /**
   * Process a notification job
   */
  private async processNotification(job: Job<NotificationJobData>) {
    const { userId, type, message, metadata } = job.data
    const topic = this.getNotificationTopic(type)

    logger.info(`[NOTIFICATION_WORKER] Processing notification`, {
      jobId: job.id,
      userId,
      type,
      topic,
    })

    try {
      // Step 1: Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      })

      if (!user) {
        throw new Error(`User ${userId} not found`)
      }

      let notificationId: string | null = null

      // Step 2: Check in-app notification preference before creating
      const canSendInApp = await shouldSendNotification(userId, 'in_app', topic)

      if (canSendInApp) {
        const notification = await prisma.notification.create({
          data: {
            userId,
            type,
            message,
            isRead: false,
          },
        })
        notificationId = notification.id

        logger.info(`[NOTIFICATION_WORKER] In-app notification created`, {
          notificationId: notification.id,
          userId,
        })
      } else {
        logger.info(`[NOTIFICATION_WORKER] In-app notification skipped due to preference`, {
          userId,
          type,
          topic,
        })
      }

      // Step 3: Send email (if applicable) - check preference first
      const emailTypes = [
        'PAYMENT_CONFIRMED',
        'PAYMENT_FAILED',
        'BOOKING_CONFIRMED',
        'BOOKING_CANCELLED',
        'REFUND_APPROVED',
        'PAYOUT_RELEASED',
        'DISPUTE_CREATED',
        'DISPUTE_RESOLVED',
      ]

      if (emailTypes.includes(type)) {
        try {
          await this.sendEmail(user, type, message, topic, metadata)
          logger.info(`[NOTIFICATION_WORKER] Email sent`, {
            userId,
            type,
            email: user.email,
          })
        } catch (emailError) {
          logger.error(`[NOTIFICATION_WORKER] Failed to send email`, {
            userId,
            type,
            error: emailError instanceof Error ? emailError.message : String(emailError),
          })
          // Don't fail the job - in-app notification may have been created
        }
      }

      return {
        status: 'success',
        notificationId,
        userId,
        type,
        inAppSkipped: !canSendInApp,
      }
    } catch (error) {
      logger.error(`[NOTIFICATION_WORKER] Error processing notification`, {
        jobId: job.id,
        userId,
        error: error instanceof Error ? error.message : String(error),
      })

      throw error
    }
  }

  /**
   * Get email subject based on notification type
   */
  private getEmailSubject(type: string): string {
    switch (type) {
      case 'PAYMENT_CONFIRMED':
        return 'Payment Confirmed'
      case 'PAYMENT_FAILED':
        return 'Payment Failed'
      case 'BOOKING_CONFIRMED':
        return 'Booking Confirmed'
      case 'BOOKING_CANCELLED':
        return 'Booking Cancelled'
      case 'PAYOUT_RELEASED':
        return 'Payout Released'
      case 'REFUND_APPROVED':
        return 'Refund Approved'
      case 'DISPUTE_CREATED':
        return 'Dispute Created'
      case 'DISPUTE_RESOLVED':
        return 'Dispute Resolved'
      default:
        return 'Notification'
    }
  }

  /**
   * Send email notification - respects user preferences
   */
  private async sendEmail(
    user: { id: string; email: string; name: string },
    type: string,
    message: string,
    topic: NotificationTopic,
    metadata?: Record<string, any>
  ) {
    // Check email preference first
    const canSendEmail = await shouldSendNotification(user.id, 'email', topic)

    if (!canSendEmail) {
      logger.info(`[NOTIFICATION_WORKER] Email skipped due to preference`, {
        userId: user.id,
        type,
        topic,
      })
      return
    }

    // Use preference-aware email sending
    const result = await sendPreferenceAwareEmail({
      userId: user.id,
      topic,
      email: user.email,
      subject: this.getEmailSubject(type),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${this.getEmailSubject(type)}</h2>
          <p>Hi <strong>${user.name || 'User'}</strong>,</p>
          <p>${message}</p>
          ${metadata?.bookingId ? `<p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard">View details in your dashboard</a></p>` : ''}
          <p style="margin-top: 30px;">Best regards,<br>The ChefaChef Team</p>
        </div>
      `,
    })

    if (result.success) {
      logger.info(`[NOTIFICATION_WORKER] Email sent successfully`, {
        userId: user.id,
        type,
        email: user.email,
      })
    } else {
      logger.warn(`[NOTIFICATION_WORKER] Email not sent`, {
        userId: user.id,
        type,
        reason: result.error,
      })
    }
  }

  async stop() {
    if (this.worker) {
      await this.worker.close()
      logger.info('[NOTIFICATION_WORKER] Stopped')
    }
  }
}

// Export singleton
let notificationWorker: NotificationWorker | null = null

export function getNotificationWorker(): NotificationWorker {
  if (!notificationWorker) {
    notificationWorker = new NotificationWorker()
  }
  return notificationWorker
}
