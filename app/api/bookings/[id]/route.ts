import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/types';

const updateBookingSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
});

const cancelBookingSchema = z.object({
  reason: z.string().optional(),
  refundAmount: z.number().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        chef: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        proposal: {
          include: {
            menu: {
              select: {
                id: true,
                title: true,
                description: true,
                price: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Users can only see their own bookings, admins can see any
    if (booking.clientId !== session.user.id && booking.chefId !== session.user.id && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = updateBookingSchema.parse(body);

    const booking = await prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        chef: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { reason, refundAmount } = cancelBookingSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        payments: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Authorization: Only clients can cancel their own bookings, admins can cancel any
    if (booking.clientId !== session.user.id && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Only the client can cancel this booking" }, { status: 403 });
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Booking already cancelled' }, { status: 400 });
    }

    if (booking.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Cannot cancel completed booking' }, { status: 400 });
    }

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        chef: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Process refund if payment exists
    const payment = booking.payments;
    if (payment && payment.status === 'COMPLETED') {
      // In a real implementation, you would integrate with Stripe for refunds
      const refundAmountToProcess = refundAmount || payment.totalAmount;
      
      // TODO: Replace with actual Stripe refund integration
      // console.log(`Processing refund of $${refundAmountToProcess} for payment ${payment.id}`);
      // console.log(`Refund reason: ${reason || 'No reason provided'}`);

      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "REFUNDED" as const,
        },
      });

      // In production, you would create a refund record in Stripe
      // const refund = await stripe.refunds.create({
      //   payment_intent: payment.stripePaymentIntentId,
      //   amount: refundAmountToProcess * 100, // Convert to cents
      //   reason: 'requested_by_customer',
      //   metadata: {
      //     booking_id: booking.id,
      //     reason: reason || 'No reason provided',
      //   },
      // });
    }

    return NextResponse.json({
      booking: updatedBooking,
      refund: payment ? {
        amount: refundAmount || payment?.totalAmount,
        reason: reason || 'No reason provided',
      } : null,
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
  }
}
