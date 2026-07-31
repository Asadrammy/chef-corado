import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isLocalDemoSessionUser } from '@/lib/auth';
import { isPrismaConnectionError, prisma } from '@/lib/prisma';

const createNotificationSchema = z.object({
  userId: z.string(),
  type: z.enum(['PROPOSAL_RECEIVED', 'PROPOSAL_ACCEPTED', 'BOOKING_CREATED', 'PAYMENT_SUCCESS']),
  message: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow creating notifications for self or admin
    const body = await request.json();
    const { userId, type, message } = createNotificationSchema.parse(body);

    if (userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const notification = await (prisma as any).notification.create({
      data: {
        userId,
        type,
        message,
      },
    });

    return NextResponse.json(notification);
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { error: 'Notifications are unavailable in local demo mode' },
        { status: 503 }
      );
    }

    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Users can only access their own notifications, admins can access any
    if (userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (isLocalDemoSessionUser(session.user.id, session.user.email)) {
      return NextResponse.json({
        notifications: [],
        unreadCount: 0,
        localDemo: true,
      });
    }

    const where = {
      userId,
      ...(unreadOnly && { isRead: false }),
    };

    const notifications = await (prisma as any).notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to latest 50 notifications
    });

    const unreadCount = await (prisma as any).notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        notifications: [],
        unreadCount: 0,
        localDemo: true,
      });
    }

    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
