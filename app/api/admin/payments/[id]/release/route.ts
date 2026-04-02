import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"
import { sendEmail, emailTemplates } from "@/lib/email"

// Initialize Stripe with safety check
const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY not configured")
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia" as Stripe.LatestApiVersion,
  })
}

// POST release payment to chef
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Check if payment exists and can be released
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        booking: true,
      },
    })

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    if (payment.status !== "HELD") {
      return NextResponse.json({ error: "Payment cannot be released" }, { status: 400 })
    }

    // Get chef's Stripe Connect account ID (would need to be stored in ChefProfile)
    // For now, we'll update the database status only
    // In production, you'd create a Stripe transfer to the chef's account

    // Update payment status to released with timestamps - use transaction for safety
    const updatedPayment = await prisma.$transaction(async (tx) => {
      // Double-check payment is still HELD before releasing
      const currentPayment = await tx.payment.findUnique({
        where: { id }
      })
      
      if (!currentPayment || currentPayment.status !== "HELD") {
        throw new Error("Payment is not in HELD status")
      }

      return await tx.payment.update({
        where: { id },
        data: {
          status: "RELEASED",
          releasedAt: new Date(),
          releasedBy: session.user.id,
        } as any,
        include: {
          booking: {
            include: {
              client: {
                select: {
                  name: true,
                  email: true,
                },
              },
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
          },
        },
      })
    })

    // TODO: In production, create Stripe transfer to chef
    // const transfer = await stripe.transfers.create({
    //   amount: Math.round(payment.chefAmount * 100),
    //   currency: "usd",
    //   destination: chefStripeAccountId,
    //   transfer_group: payment.id,
    // })

    // Send email notification to chef about payment release
    // Note: Using booking object for user data
    const chefUser = await prisma.user.findUnique({
      where: { id: payment.booking.chefId },
      select: { name: true, email: true }
    })

    const clientUser = await prisma.user.findUnique({
      where: { id: payment.booking.clientId },
      select: { name: true }
    })

    if (chefUser?.email) {
      await sendEmail({
        to: chefUser.email,
        subject: `Payment Released! 💰`,
        html: emailTemplates.paymentReleased(
          chefUser.name,
          (updatedPayment as any).chefAmount, // Use chefAmount from updated payment
          `Booking with ${clientUser?.name || 'Client'}`
        ),
      }).catch(error => {
        console.error('Failed to send payment release email to chef:', chefUser.email, error)
        // Don't fail the request if email fails
      })
    }

    return NextResponse.json({ 
      message: "Payment released successfully",
      payment: updatedPayment
    })
  } catch (error) {
    console.error("Error releasing payment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
