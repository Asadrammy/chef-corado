import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess } from '@/lib/api-response';
import { getRequiredSession, getSessionUserId } from '@/lib/auth-helpers';
import { ApiError, handleApiError } from '@/lib/error-handler';
import { messageService } from '@/lib/services/message-service';

const createMessageSchema = z.object({
  receiverId: z.string(),
  content: z.string().min(1).max(1000),
});

const createQuoteSchema = z.object({
  action: z.literal('quote:create'),
  receiverId: z.string(),
  requestId: z.string(),
  price: z.number().positive(),
  message: z.string().min(1).max(2000),
});

const updateQuoteSchema = z.object({
  action: z.literal('quote:update'),
  receiverId: z.string(),
  proposalId: z.string(),
  price: z.number().positive(),
  message: z.string().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession();

    const body = await request.json();
    const senderId = getSessionUserId(session);

    if (body?.action === 'quote:create') {
      const payload = createQuoteSchema.parse(body);
      const result = await messageService.sendConversationQuote({
        senderId,
        receiverId: payload.receiverId,
        requestId: payload.requestId,
        price: payload.price,
        message: payload.message,
      });

      return apiSuccess(result, 201);
    }

    if (body?.action === 'quote:update') {
      const payload = updateQuoteSchema.parse(body);
      const result = await messageService.updateConversationQuote({
        senderId,
        receiverId: payload.receiverId,
        proposalId: payload.proposalId,
        price: payload.price,
        message: payload.message,
      });

      return apiSuccess(result);
    }

    const { receiverId, content } = createMessageSchema.parse(body);
    const message = await messageService.createMessage(senderId, receiverId, content);

    return apiSuccess(message, 201);
  } catch (error) {
    return handleApiError(error, 'Messages POST');
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredSession();

    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get('otherUserId');

    if (!otherUserId) {
      throw new ApiError(400, 'Other user ID is required');
    }

    const userId = getSessionUserId(session);
    const messages = await messageService.listConversationMessages(userId, otherUserId);

    return apiSuccess(messages);
  } catch (error) {
    return handleApiError(error, 'Messages GET');
  }
}
