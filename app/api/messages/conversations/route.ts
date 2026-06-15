import { NextResponse } from 'next/server';
import { getRequiredSession, getSessionUserId } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/error-handler';
import { messageService } from '@/lib/services/message-service';
import { isPrismaConnectionError } from '@/lib/prisma';

const localDemoConversations = [
  {
    otherUser: {
      id: 'local-client-maya',
      name: 'Maya R.',
      role: 'CLIENT',
    },
    lastMessage: {
      id: 'local-message-preview-1',
      content: 'We love the anniversary menu direction. Could you include one vegetarian course?',
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      proposalId: 'local-proposal-anniversary',
    },
    unreadCount: 1,
  },
  {
    otherUser: {
      id: 'local-client-daniel',
      name: 'Daniel K.',
      role: 'CLIENT',
    },
    lastMessage: {
      id: 'local-message-preview-2',
      content: 'The Italian tasting menu sounds perfect. We are flexible on timing.',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      proposalId: null,
    },
    unreadCount: 0,
  },
];

export async function GET() {
  try {
    const session = await getRequiredSession();
    const conversations = await messageService.listConversations(getSessionUserId(session));

    return NextResponse.json(conversations);
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === 'development') {
      return NextResponse.json(localDemoConversations);
    }

    return handleApiError(error, 'Messages Conversations GET');
  }
}
