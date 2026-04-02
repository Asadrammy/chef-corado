import { prisma } from '@/lib/prisma';

export type NotificationType =
  | 'PROPOSAL_RECEIVED'
  | 'PROPOSAL_ACCEPTED'
  | 'PROPOSAL_REJECTED'
  | 'BOOKING_CREATED'
  | 'PAYMENT_SUCCESS'
  | 'MESSAGE_RECEIVED';

export async function createNotification(userId: string, type: NotificationType, message: string) {
  try {
    const notification = await (prisma as any).notification.create({
      data: {
        userId,
        type,
        message,
      },
    });

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
