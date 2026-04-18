import { NextResponse } from 'next/server';
import { getRequiredSession, getSessionUserId } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/error-handler';
import { messageService } from '@/lib/services/message-service';

export async function GET() {
  try {
    const session = await getRequiredSession();
    const conversations = await messageService.listConversations(getSessionUserId(session));

    return NextResponse.json(conversations);
  } catch (error) {
    return handleApiError(error, 'Messages Conversations GET');
  }
}
