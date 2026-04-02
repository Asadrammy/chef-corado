import Stripe from "stripe"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
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

const checkoutSchema = z.object({
  proposalId: z.string().cuid(),
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
  }

  let payload: z.infer<typeof checkoutSchema>
  try {
    const json = await request.json()
    payload = checkoutSchema.parse(json)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: payload.proposalId },
    include: { 
      chef: { include: { user: true } }, 
      request: { include: { client: true } }
    },
  })

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 })
  }

  if (proposal.request.clientId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (proposal.status !== 'ACCEPTED') {
    return NextResponse.json({ error: "Proposal not accepted" }, { status: 400 })
  }

  const amount = Number(proposal.price)
  if (!Number.isFinite(amount)) {
    return NextResponse.json({ error: "Invalid proposal price" }, { status: 400 })
  }

  const successUrl = process.env.STRIPE_SUCCESS_URL ?? `${process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/dashboard/client/bookings?status=success`
  const cancelUrl = process.env.STRIPE_CANCEL_URL ?? `${process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/dashboard/client/bookings?status=cancelled`

  try {
    const stripe = getStripeClient()
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: `Booking with ${proposal.chef?.user?.name ?? "Chef"}`,
              description: proposal.request?.location ?? 'Event location',
            },
          },
          quantity: 1,
        },
      ],
      customer_email: session.user.email ?? undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId: proposal.id, // Store proposalId as bookingId for webhook
      },
    })

    // SECURITY FIX: Don't create payment record here
    // Payment will be created only after webhook confirmation
    // This prevents fake payments and ensures money is actually received

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    return NextResponse.json({ error: "Unable to create checkout" }, { status: 500 })
  }
}
