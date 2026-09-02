import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiSuccess } from '@/lib/api-response';
import { getRequiredSession, getSessionUserId } from '@/lib/auth-helpers';
import { ApiError, handleApiError } from '@/lib/error-handler';
import { messageService } from '@/lib/services/message-service';
import { isPrismaConnectionError } from '@/lib/prisma';

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

function getLocalDemoThread(currentUserId: string, otherUserId: string) {
  const otherUser = {
    id: otherUserId,
    name: otherUserId.includes('daniel') ? 'Daniel K.' : 'Maya R.',
    role: 'CLIENT',
  };
  const request = {
    id: otherUserId.includes('daniel') ? 'local-request-tasting' : 'local-request-anniversary',
    title: otherUserId.includes('daniel') ? 'Modern Italian tasting menu' : 'Anniversary dinner for 10 guests',
    eventDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    location: otherUserId.includes('daniel') ? 'West End' : 'Downtown',
    budget: otherUserId.includes('daniel') ? 2200 : 1450,
    currency: 'USD',
    details: otherUserId.includes('daniel')
      ? 'Client wants handmade pasta, lighter sauces, and a tableside finishing moment.'
      : 'Client wants seafood, one vegetarian course, and a memorable celebratory dessert.',
  };
  const activeProposal = {
    id: 'local-proposal-anniversary',
    price: otherUserId.includes('daniel') ? 2400 : 1850,
    currency: 'USD',
    message: 'A tailored private dining proposal with menu planning, shopping, prep, service, and cleanup included.',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 70 * 60 * 60 * 1000).toISOString(),
    request,
  };

  return {
    otherUser,
    context: {
      request,
      activeProposal,
      latestBooking: null,
    },
    messages: [
      {
        id: 'local-message-1',
        senderId: otherUserId,
        receiverId: currentUserId,
        content: otherUserId.includes('daniel')
          ? 'The Italian tasting menu sounds perfect. We are flexible on timing.'
          : 'We love the anniversary menu direction. Could you include one vegetarian course?',
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        proposalId: null,
        sender: otherUser,
        receiver: { id: currentUserId, name: 'Chef User', role: 'CHEF' },
        proposal: null,
      },
      {
        id: 'local-message-2',
        senderId: currentUserId,
        receiverId: otherUserId,
        content: 'Absolutely. I can build the menu around that and keep the evening paced like a private restaurant service.',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        proposalId: activeProposal.id,
        sender: { id: currentUserId, name: 'Chef User', role: 'CHEF' },
        receiver: otherUser,
        proposal: activeProposal,
      },
    ],
  };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  let senderId: string | undefined;

  try {
    const session = await getRequiredSession();

    body = await request.json();
    senderId = getSessionUserId(session);

    const action = typeof body === 'object' && body !== null && 'action' in body ? body.action : undefined;

    if (action === 'quote:create') {
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

    if (action === 'quote:update') {
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
    if (error instanceof Error && error.message.startsWith("REQUEST_NOT_AVAILABLE:")) {
      return NextResponse.json({ error: "This request is not available for quotes." }, { status: 403 })
    }

    if (isPrismaConnectionError(error) && process.env.NODE_ENV === 'development') {
      const parsedMessage = createMessageSchema.safeParse(body);
      if (parsedMessage.success) {
        const message = {
          id: `local-message-${Date.now()}`,
          senderId: senderId || 'local-demo-user',
          receiverId: parsedMessage.data.receiverId,
          content: parsedMessage.data.content,
          createdAt: new Date().toISOString(),
          isRead: false,
          proposalId: null,
          sender: {
            id: senderId || 'local-demo-user',
            name: 'You',
          },
          receiver: {
            id: parsedMessage.data.receiverId,
            name: parsedMessage.data.receiverId.includes('daniel') ? 'Daniel K.' : 'Maya R.',
          },
          localDemo: true,
        };

        return apiSuccess(message, 201);
      }

      const parsedQuote = createQuoteSchema.safeParse(body);
      if (parsedQuote.success) {
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setHours(expiresAt.getHours() + 72);

        const proposal = {
          id: `local-proposal-${Date.now()}`,
          price: parsedQuote.data.price,
          currency: 'USD',
          message: parsedQuote.data.message,
          status: 'PENDING',
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          request: {
            id: parsedQuote.data.requestId,
            title: 'Local demo request',
            eventDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Downtown',
            budget: parsedQuote.data.price,
            currency: 'USD',
            details: 'Local demo quote conversation.',
          },
        };

        const message = {
          id: `local-message-${Date.now()}`,
          senderId: senderId || 'local-demo-user',
          receiverId: parsedQuote.data.receiverId,
          content: 'Quote sent: Local demo request',
          createdAt: now.toISOString(),
          isRead: false,
          proposalId: proposal.id,
          sender: {
            id: senderId || 'local-demo-user',
            name: 'You',
          },
          receiver: {
            id: parsedQuote.data.receiverId,
            name: parsedQuote.data.receiverId.includes('daniel') ? 'Daniel K.' : 'Maya R.',
          },
          localDemo: true,
        };

        return apiSuccess({ proposal, message }, 201);
      }

      const parsedQuoteUpdate = updateQuoteSchema.safeParse(body);
      if (parsedQuoteUpdate.success) {
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setHours(expiresAt.getHours() + 72);

        const proposal = {
          id: parsedQuoteUpdate.data.proposalId,
          price: parsedQuoteUpdate.data.price,
          currency: 'USD',
          message: parsedQuoteUpdate.data.message,
          status: 'PENDING',
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          request: {
            id: 'local-request-anniversary',
            title: 'Local demo request',
            eventDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Downtown',
            budget: parsedQuoteUpdate.data.price,
            currency: 'USD',
            details: 'Local demo quote conversation.',
          },
        };

        const message = {
          id: `local-message-${Date.now()}`,
          senderId: senderId || 'local-demo-user',
          receiverId: parsedQuoteUpdate.data.receiverId,
          content: 'Quote updated: Local demo request',
          createdAt: now.toISOString(),
          isRead: false,
          proposalId: proposal.id,
          sender: {
            id: senderId || 'local-demo-user',
            name: 'You',
          },
          receiver: {
            id: parsedQuoteUpdate.data.receiverId,
            name: parsedQuoteUpdate.data.receiverId.includes('daniel') ? 'Daniel K.' : 'Maya R.',
          },
          localDemo: true,
        };

        return apiSuccess({ proposal, message });
      }
    }

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
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === 'development') {
      const session = await getRequiredSession().catch(() => null);
      const { searchParams } = new URL(request.url);
      const otherUserId = searchParams.get('otherUserId') || 'local-client-maya';

      return apiSuccess(getLocalDemoThread(session?.user?.id || 'local-chef-user', otherUserId));
    }

    return handleApiError(error, 'Messages GET');
  }
}
