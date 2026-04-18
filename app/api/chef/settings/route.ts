import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripeService, StripeService } from "@/lib/services/stripe-service"
import { Role } from "@/types"

const notificationPreferenceSchema = z.object({
  emailMessages: z.boolean(),
  emailBookings: z.boolean(),
  emailRequests: z.boolean(),
  inAppMessages: z.boolean(),
  inAppBookings: z.boolean(),
  inAppRequests: z.boolean(),
})

function defaultPreferences(userId: string) {
  return {
    userId,
    emailMessages: true,
    emailBookings: true,
    emailRequests: true,
    inAppMessages: true,
    inAppBookings: true,
    inAppRequests: true,
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== Role.CHEF) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if Stripe is properly configured
    const stripeConfigured = StripeService.isConfigured()

    const [preferences, chefProfile] = await Promise.all([
      prisma.notificationPreference.findUnique({
        where: { userId: session.user.id },
      }),
      prisma.chefProfile.findUnique({
        where: { userId: session.user.id },
        select: {
          stripeAccountId: true,
          stripeOnboardingComplete: true,
        },
      }),
    ])

    let stripeAccount = null
    if (stripeConfigured && chefProfile?.stripeAccountId) {
      try {
        stripeAccount = await stripeService.retrieveConnectAccount(chefProfile.stripeAccountId)
      } catch (error) {
        console.error("Failed to retrieve Stripe account", error)
        // Continue with null stripe account
      }
    }

    return NextResponse.json({
      notificationPreferences: preferences ?? defaultPreferences(session.user.id),
      stripe: {
        accountId: chefProfile?.stripeAccountId ?? null,
        onboardingComplete: stripeAccount
          ? Boolean(stripeAccount.details_submitted && stripeAccount.charges_enabled)
          : chefProfile?.stripeOnboardingComplete ?? false,
        isConnected: Boolean(chefProfile?.stripeAccountId),
        chargesEnabled: stripeAccount?.charges_enabled ?? false,
        payoutsEnabled: stripeAccount?.payouts_enabled ?? false,
        detailsSubmitted: stripeAccount?.details_submitted ?? false,
        configured: stripeConfigured,
      },
    })
  } catch (error) {
    console.error("Failed to fetch chef settings", error)
    return NextResponse.json({ error: "Failed to fetch chef settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== Role.CHEF) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedPreferences = notificationPreferenceSchema.parse(body.notificationPreferences)

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: session.user.id },
      update: validatedPreferences,
      create: {
        userId: session.user.id,
        ...validatedPreferences,
      },
    })

    return NextResponse.json({ notificationPreferences: preferences })
  } catch (error) {
    console.error("Failed to update chef settings", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to update chef settings" }, { status: 500 })
  }
}
