import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const createPayoutSchema = z.object({
  amount: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'CHEF') {
      return NextResponse.json({ error: 'Only chefs can request payouts' }, { status: 403 });
    }

    // Get chef profile
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!chefProfile) {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { amount } = createPayoutSchema.parse(body);

    // Verify chef is approved
    if (!chefProfile.isApproved) {
      return NextResponse.json({ error: 'Chef account not approved' }, { status: 400 });
    }

    // Calculate available balance (completed bookings with paid payments)
    const completedBookings = await prisma.booking.findMany({
      where: {
        chefId: chefProfile.id,
        status: 'COMPLETED',
        payments: {
          status: 'COMPLETED',
        },
      },
      include: {
        payments: {
          where: {
            status: 'COMPLETED',
          },
        },
      },
    });

    const availableBalance = completedBookings.reduce((sum: number, booking: any) => {
      const payment = booking.payments;
      if (payment) {
        return sum + (payment.totalAmount - payment.commissionAmount);
      }
      return sum;
    }, 0);

    if (amount > availableBalance) {
      return NextResponse.json({ 
        error: `Insufficient balance. Available: $${availableBalance.toFixed(2)}` 
      }, { status: 400 });
    }

    // Create payout record
    const payout = await (prisma as any).payout.create({
      data: {
        chefId: chefProfile.id,
        amount,
        status: 'PENDING',
      },
      include: {
        chef: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // In a real implementation, you would integrate with Stripe Connect here
    // For demo purposes, we'll just mark it as processing
    // TODO: Replace with actual Stripe integration
    // console.log(`Creating Stripe transfer for chef ${chefProfile.user.name}, amount: $${amount}`);

    return NextResponse.json(payout);
  } catch (error) {
    console.error('Error creating payout:', error);
    return NextResponse.json({ error: 'Failed to create payout' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chefId = searchParams.get('chefId');
    const status = searchParams.get('status');

    const where: any = {};
    
    if (chefId) where.chefId = chefId;
    if (status) where.status = status;

    const payouts = await (prisma as any).payout.findMany({
      where,
      include: {
        chef: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(payouts);
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}
