import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const processPayoutSchema = z.object({
  payoutId: z.string(),
  action: z.enum(['process', 'complete', 'fail']),
  stripeTransferId: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, stripeTransferId } = processPayoutSchema.parse(body);

    const payout = await (prisma as any).payout.findUnique({
      where: { id },
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

    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    if (payout.status !== 'PENDING' && action !== 'fail') {
      return NextResponse.json({ error: 'Payout cannot be processed' }, { status: 400 });
    }

    let updateData: any = {
      processedAt: new Date(),
    };

    // In a real implementation, you would integrate with Stripe Connect here
    switch (action) {
      case 'process':
        updateData.status = 'PROCESSING';
        // TODO: Add actual Stripe processing logic
        // console.log(`Processing payout ${id} for chef ${payout.chef.user.name}`);
        break;
      
      case 'complete':
        updateData.status = 'COMPLETED';
        updateData.stripeTransferId = stripeTransferId;
        // TODO: Add actual Stripe completion logic
        // console.log(`Completed payout ${id} with Stripe transfer ${stripeTransferId}`);
        break;
      
      case 'fail':
        updateData.status = 'FAILED';
        // TODO: Add actual Stripe failure handling
        // console.log(`Failed payout ${id} for chef ${payout.chef.user.name}`);
        break;
    }

    const updatedPayout = await (prisma as any).payout.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(updatedPayout);
  } catch (error) {
    console.error('Error processing payout:', error);
    return NextResponse.json({ error: 'Failed to process payout' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payout = await (prisma as any).payout.findUnique({
      where: { id },
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

    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    return NextResponse.json(payout);
  } catch (error) {
    console.error('Error fetching payout:', error);
    return NextResponse.json({ error: 'Failed to fetch payout' }, { status: 500 });
  }
}
