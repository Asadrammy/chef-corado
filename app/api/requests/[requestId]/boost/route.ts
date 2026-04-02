import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId } = await params;

    // Get the request details
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Check if user owns the request or is admin
    if (request.clientId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if request is already boosted (mock implementation)
    // In a real system, you'd have a Boost model or field
    const isBoosted = false; // Default to not boosted
    const remainingTime = 0; // Hours remaining

    return NextResponse.json({
      isBoosted,
      remainingTime
    });
  } catch (error) {
    console.error('Error fetching boost status:', error);
    return NextResponse.json({ error: 'Failed to fetch boost status' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId } = await params;

    // Get the request details
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Check if user owns the request or is admin
    if (request.clientId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Implement boost logic (mock implementation)
    // In a real system, you'd:
    // 1. Check if user has boost credits
    // 2. Create a Boost record
    // 3. Notify matching chefs
    // 4. Update request priority
    
    const duration = 24; // 24 hours boost
    const isBoosted = true;
    const remainingTime = duration;

    // Create a notification for the request owner
    await (prisma as any).notification.create({
      data: {
        userId: request.clientId,
        type: 'REQUEST_BOOSTED',
        title: 'Request Boosted',
        message: `Your request "${request.title}" has been boosted for ${duration} hours`,
      },
    });

    return NextResponse.json({
      isBoosted,
      duration,
      remainingTime
    });
  } catch (error) {
    console.error('Error boosting request:', error);
    return NextResponse.json({ error: 'Failed to boost request' }, { status: 500 });
  }
}
