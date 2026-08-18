import { prisma } from '@/lib/prisma';
import { shouldSendNotification, type NotificationTopic } from '@/lib/notification-preferences';
import { formatCurrency } from '@/lib/currency';
import { formatServiceDateSummary, type MultiDayDateLike } from '@/lib/multi-day-display';

export type NotificationType =
  | 'PROPOSAL_RECEIVED'
  | 'PROPOSAL_ACCEPTED'
  | 'PROPOSAL_REJECTED'
  | 'BOOKING_CREATED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'MESSAGE_RECEIVED'
  | 'VERIFICATION_APPROVED'
  | 'VERIFICATION_REJECTED'
  | 'VERIFICATION_CHANGES_REQUESTED'
  | 'NEW_REQUEST_ALERT'
  | 'BOOKING_CANCELLED'
  | 'PAYOUT_RELEASED';

function getNotificationTopic(type: NotificationType): NotificationTopic {
  switch (type) {
    case 'MESSAGE_RECEIVED':
      return 'messages';
    case 'BOOKING_CREATED':
    case 'BOOKING_CANCELLED':
    case 'PAYMENT_SUCCESS':
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_FAILED':
    case 'PAYOUT_RELEASED':
      return 'bookings';
    case 'PROPOSAL_RECEIVED':
    case 'PROPOSAL_ACCEPTED':
    case 'PROPOSAL_REJECTED':
    case 'VERIFICATION_APPROVED':
    case 'VERIFICATION_REJECTED':
    case 'VERIFICATION_CHANGES_REQUESTED':
    case 'NEW_REQUEST_ALERT':
    default:
      return 'requests';
  }
}

export async function createNotification(userId: string, type: NotificationType, message: string) {
  try {
    const topic = getNotificationTopic(type)
    const canNotify = await shouldSendNotification(userId, 'in_app', topic);

    if (!canNotify) {
      console.log(`[NOTIFICATIONS] In-app notification skipped for user ${userId}, type ${type}, topic ${topic} - preference disabled`);
      return null;
    }

    console.log(`[NOTIFICATIONS] Creating in-app notification for user ${userId}, type ${type}, topic ${topic}`);

    const notification = await (prisma as any).notification.create({
      data: {
        userId,
        type,
        message,
      },
    });

    console.log(`[NOTIFICATIONS] In-app notification created: ${notification.id}`);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export type MultiDayNotificationContext = {
  isMultiDay?: boolean
  serviceDates?: MultiDayDateLike[] | null
  location?: string | null
  amount?: number | string | null
  currency?: string | null
  bookingReference?: string | null
}

function formatAmount(value?: number | string | null, currency = 'GBP') {
  if (value == null || value === '') return null
  const amount = Number(value)
  return Number.isNaN(amount) ? String(value) : formatCurrency(amount, currency)
}

function multiDaySuffix(context?: MultiDayNotificationContext) {
  if (!context?.isMultiDay) return ''

  const dates = formatServiceDateSummary(context.serviceDates)
  const location = context.location ? ` in ${context.location}` : ''
  return ` for Multi-Day Chef Hire (${dates})${location}`
}

export async function triggerProposalNotification(clientId: string, chefName: string, context?: MultiDayNotificationContext) {
  const suffix = multiDaySuffix(context)
  const amount = formatAmount(context?.amount, context?.currency ?? 'GBP')
  return createNotification(
    clientId,
    'PROPOSAL_RECEIVED',
    context?.isMultiDay
      ? `You received a Multi-Day proposal from ${chefName}${amount ? ` for ${amount}` : ''}.`
      : `You received a new proposal from ${chefName}${suffix}`
  );
}

export async function triggerProposalAcceptedNotification(chefId: string, clientName: string, context?: MultiDayNotificationContext) {
  const suffix = multiDaySuffix(context)
  return createNotification(
    chefId,
    'PROPOSAL_ACCEPTED',
    `Your proposal${suffix} was accepted by ${clientName}`
  );
}

export async function triggerProposalRejectedNotification(chefId: string, clientName: string, context?: MultiDayNotificationContext) {
  const suffix = multiDaySuffix(context)
  return createNotification(
    chefId,
    'PROPOSAL_REJECTED',
    `Your proposal${suffix} was rejected by ${clientName}`
  );
}

export async function triggerBookingCreatedNotification(chefId: string, clientName: string, context?: MultiDayNotificationContext) {
  const suffix = multiDaySuffix(context)
  return createNotification(
    chefId,
    'BOOKING_CREATED',
    `New booking${suffix} created by ${clientName}`
  );
}

export async function triggerPaymentSuccessNotification(clientId: string, chefName: string, context?: MultiDayNotificationContext) {
  const suffix = multiDaySuffix(context)
  const amount = formatAmount(context?.amount, context?.currency ?? 'GBP')
  return createNotification(
    clientId,
    'PAYMENT_SUCCESS',
    `Payment${amount ? ` of ${amount}` : ''} successfully sent to ${chefName}${suffix}`
  );
}

export async function triggerPaymentReceivedNotification(chefId: string, clientName: string, context?: MultiDayNotificationContext) {
  const suffix = multiDaySuffix(context)
  const amount = formatAmount(context?.amount, context?.currency ?? 'GBP')
  return createNotification(
    chefId,
    'PAYMENT_SUCCESS',
    `Payment${amount ? ` of ${amount}` : ''} received from ${clientName}${suffix}`
  );
}

export async function triggerMessageNotification(receiverId: string, senderName: string) {
  return createNotification(
    receiverId,
    'MESSAGE_RECEIVED',
    `New message from ${senderName}`
  );
}
