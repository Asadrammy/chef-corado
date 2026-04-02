import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const POLL_INTERVAL = 1500;
const KEEP_ALIVE_INTERVAL = 20000;

function formatMessageForStream(message: any) {
  return {
    id: message.id,
    senderId: message.senderId,
    receiverId: message.receiverId,
    content: message.content,
    createdAt: message.createdAt,
    sender: message.sender,
    receiver: message.receiver,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get('otherUserId');
    const sinceParam = searchParams.get('since');
    const userId = session.user.id; // Use authenticated user's ID

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'Other user ID is required' },
        { status: 400 }
      );
    }

    // Users can only access conversations they are part of
    // Verify there's at least one message between these users or they are connected via booking/proposal
    const existingConversation = await (prisma as any).message.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
    });

    // If no existing conversation, check if they have a business relationship (booking/proposal)
    if (!existingConversation) {
      const hasBusinessRelationship = await prisma.booking.findFirst({
        where: {
          OR: [
            { clientId: userId, chefId: otherUserId },
            { clientId: otherUserId, chefId: userId },
          ],
        },
      });

      const hasProposalRelationship = await prisma.proposal.findFirst({
        where: {
          request: {
            clientId: userId,
          },
          chefId: otherUserId,
        },
      });

      if (!hasBusinessRelationship && !hasProposalRelationship && session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const encoder = new TextEncoder();
    let since = sinceParam ? new Date(sinceParam) : new Date(0);

    const stream = new ReadableStream({
      async start(controller) {
        const sendMessages = async () => {
          const messages = await (prisma as any).message.findMany({
            where: {
              OR: [
                { senderId: userId, receiverId: otherUserId, createdAt: { gt: since } },
                { senderId: otherUserId, receiverId: userId, createdAt: { gt: since } },
              ],
            },
            include: {
              sender: { select: { id: true, name: true } },
              receiver: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
          });

          if (messages.length > 0) {
            since = messages[messages.length - 1].createdAt;
            
            for (const message of messages) {
              const chunk = `event: message\ndata: ${JSON.stringify(formatMessageForStream(message))}\n\n`;
              controller.enqueue(encoder.encode(chunk));
            }
          }

          // Send periodic ping to keep connection alive
          const pingChunk = `event: ping\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
          controller.enqueue(encoder.encode(pingChunk));
        };

        let keepAliveTimer: ReturnType<typeof setTimeout> | null = null;
        const resetKeepAlive = () => {
          if (keepAliveTimer) {
            clearTimeout(keepAliveTimer);
          }
          keepAliveTimer = setTimeout(() => {
            controller.enqueue(encoder.encode(': keep-alive\n\n'));
            resetKeepAlive();
          }, KEEP_ALIVE_INTERVAL);
        };

        request.signal.addEventListener('abort', () => {
          if (keepAliveTimer) {
            clearTimeout(keepAliveTimer);
          }
          controller.close();
        });

        // Initial message fetch
        await sendMessages();
        resetKeepAlive();

        // Poll for new messages
        while (!request.signal.aborted) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
          if (request.signal.aborted) break;
          await sendMessages();
        }

        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Error opening messages stream:', error);
    return NextResponse.json({ error: 'Failed to open messages stream' }, { status: 500 });
  }
}
