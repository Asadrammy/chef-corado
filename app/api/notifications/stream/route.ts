import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';

const POLL_INTERVAL = 1500;
const KEEP_ALIVE_INTERVAL = 20000;

function formatNotification(notification: any) {
  return {
    id: notification.id,
    type: notification.type,
    message: notification.message,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get('since');
    let since = sinceParam ? new Date(sinceParam) : new Date();
    const userId = session.user.id;

    const encoder = new TextEncoder();
    let lastUnreadCount = -1;

    const stream = new ReadableStream({
      async start(controller) {
        const sendNotifications = async (forceCountUpdate = false) => {
          const newNotifications = await (prisma as any).notification.findMany({
            where: {
              userId,
              createdAt: { gt: since },
            },
            orderBy: { createdAt: 'asc' },
          });

          const unreadCount = await (prisma as any).notification.count({
            where: {
              userId,
              isRead: false,
            },
          });

          if (newNotifications.length > 0) {
            since = newNotifications[newNotifications.length - 1].createdAt;
            lastUnreadCount = unreadCount;
            for (const notification of newNotifications) {
              const payload = {
                notification: formatNotification(notification),
                unreadCount,
              };
              const chunk = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`;
              controller.enqueue(encoder.encode(chunk));
            }
            return;
          }

          if (forceCountUpdate || unreadCount !== lastUnreadCount) {
            lastUnreadCount = unreadCount;
            const payload = {
              notification: null,
              unreadCount,
            };
            const chunk = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          }
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

        await sendNotifications(true);
        resetKeepAlive();

        while (!request.signal.aborted) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
          if (request.signal.aborted) break;
          await sendNotifications();
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
    console.error('Error opening notifications stream:', error);
    return NextResponse.json({ error: 'Failed to open notifications stream' }, { status: 500 });
  }
}
