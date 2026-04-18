import { prisma } from '@/lib/prisma';
import { shouldSendNotification, type NotificationTopic } from '@/lib/notification-preferences';

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

export async function triggerProposalNotification(clientId: string, chefName: string) {
  return createNotification(
    clientId,
    'PROPOSAL_RECEIVED',
    `You received a new proposal from ${chefName}`
  );
}

export async function triggerProposalAcceptedNotification(chefId: string, clientName: string) {
  return createNotification(
    chefId,
    'PROPOSAL_ACCEPTED',
    `Your proposal was accepted by ${clientName}`
  );
}

export async function triggerProposalRejectedNotification(chefId: string, clientName: string) {
  return createNotification(
    chefId,
    'PROPOSAL_REJECTED',
    `Your proposal was rejected by ${clientName}`
  );
}

export async function triggerBookingCreatedNotification(chefId: string, clientName: string) {
  return createNotification(
    chefId,
    'BOOKING_CREATED',
    `New booking created by ${clientName}`
  );
}

export async function triggerPaymentSuccessNotification(clientId: string, chefName: string) {
  return createNotification(
    clientId,
    'PAYMENT_SUCCESS',
    `Payment successfully sent to ${chefName}`
  );
}

export async function triggerPaymentReceivedNotification(chefId: string, clientName: string) {
  return createNotification(
    chefId,
    'PAYMENT_SUCCESS',
    `Payment received from ${clientName}`
  );
}

export async function triggerMessageNotification(receiverId: string, senderName: string) {
  return createNotification(
    receiverId,
    'MESSAGE_RECEIVED',
    `New message from ${senderName}`
  );
}
