import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: requestId } = await context.params;

    // Get request details
    const requestData = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        client: true
      }
    });

    if (!requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Find active chefs in the request area
    const activeChefs = await prisma.chefProfile.findMany({
      where: {
        isApproved: true,
        isBanned: false,
        // Add location-based filtering here based on request location
        // For now, get all approved chefs
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      take: 10 // Limit to top 10 closest/most relevant chefs
    });

    // Send notifications to active chefs (would implement notification system here)
    // For now, we'll just log that we would notify them
    // TODO: Implement actual notification system
    // console.log(`Would notify ${activeChefs.length} chefs about request ${requestId}`);
    
    // Create notifications in database
    const notifications = activeChefs.map(chef => 
      prisma.notification.create({
        data: {
          userId: chef.user.id,
          type: 'NEW_REQUEST_ALERT',
          message: `Urgent request: ${requestData.title || 'New Event'} in ${requestData.location}`,
          isRead: false
        }
      })
    );

    await Promise.all(notifications);

    return NextResponse.json({ 
      message: `Notified ${activeChefs.length} chefs`,
      chefsNotified: activeChefs.length
    });

  } catch (error) {
    console.error('Error notifying chefs:', error);
    return NextResponse.json({ error: 'Failed to notify chefs' }, { status: 500 });
  }
}
