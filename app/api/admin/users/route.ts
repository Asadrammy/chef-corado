import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { Role } from '@/types';

const banUserSchema = z.object({
  userId: z.string(),
  action: z.enum(['ban', 'unban']),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // CRITICAL SECURITY: Verify admin authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, action, reason } = banUserSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        chefProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isBanned = action === 'ban';

    // Update user ban status
    await (prisma as any).user.update({
      where: { id: userId },
      data: {
        isBanned,
      },
    });

    // If user is a chef, also update chef profile ban status
    if (user.chefProfile) {
      await (prisma as any).chefProfile.update({
        where: { id: user.chefProfile.id },
        data: {
          isBanned,
        },
      });
    }

    // Log the action (in production, you'd store this in an audit log)
    // TODO: Implement proper audit logging
    // console.log(`User ${user.name} (${user.email}) ${isBanned ? 'banned' : 'unbanned'}`);
    // if (reason) {
    //   console.log(`Reason: ${reason}`);
    // }

    // Fetch updated user data
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        chefProfile: true,
      },
    });

    return NextResponse.json({
      user: updatedUser,
      message: `User successfully ${isBanned ? 'banned' : 'unbanned'}`,
    });
  } catch (error) {
    console.error('Error updating user ban status:', error);
    return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // CRITICAL SECURITY: Verify admin authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'banned', 'active', 'flagged'
    const role = searchParams.get('role'); // 'CLIENT', 'CHEF', 'ADMIN'

    const where: any = {};

    if (status === 'banned') {
      where.isBanned = true;
    } else if (status === 'active') {
      where.isBanned = false;
    }

    if (role) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Add suspicious activity flags
    const usersWithFlags = await Promise.all(users.map(async (user: any) => {
      const flags = [];
      
      // Get additional data for flagging
      const chefProfile = await prisma.chefProfile.findUnique({
        where: { userId: user.id },
      });
      
      const bookingCount = await prisma.booking.count({
        where: { clientId: user.id },
      });
      
      // const reviewCount = await prisma.review.count({
      //   where: { clientId: user.id },
      // });
      
      const reviewCount = 0; // Temporarily disabled
      
      // Flag for chefs with many bookings but no reviews
      if (chefProfile && bookingCount > 5 && reviewCount === 0) {
        flags.push('No reviews despite bookings');
      }
      
      // Flag for recently created accounts with many activities
      const daysSinceCreation = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 7 && (bookingCount > 10 || reviewCount > 10)) {
        flags.push('Suspicious activity pattern');
      }
      
      // Flag for unapproved chefs with existing bookings
      if (chefProfile && !chefProfile.isApproved && bookingCount > 0) {
        flags.push('Unapproved chef with bookings');
      }

      return {
        ...user,
        chefProfile,
        flags,
        riskLevel: flags.length === 0 ? 'low' : flags.length === 1 ? 'medium' : 'high',
        _count: {
          bookings: bookingCount,
          reviews: reviewCount,
        },
      };
    }));

    return NextResponse.json(usersWithFlags);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
