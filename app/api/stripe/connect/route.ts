import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getStripeService, StripeService } from "@/lib/services/stripe-service"
import { Role } from "@/types"

const connectActionSchema = z.object({
  action: z.enum(["onboard", "refresh", "onboarding", "dashboard"]).transform((action) => {
    if (action === "onboarding") return "onboard"
    if (action === "dashboard") return "refresh"
    return action
  }),
})

function getBaseUrl(request: NextRequest) {
  return process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? new URL(request.url).origin
}

async function getChefProfile(userId: string) {
  return prisma.chefProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  })
}

async function getStripeStatus(userId: string) {
  const chefProfile = await getChefProfile(userId)

  if (!chefProfile) {
    throw new Error("CHEF_PROFILE_NOT_FOUND")
  }

  if (!chefProfile.stripeAccountId) {
    return {
      accountId: null,
      onboardingComplete: false,
      isConnected: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    }
  }

  const stripeService = getStripeService()
  const account = await stripeService.retrieveConnectAccount(chefProfile.stripeAccountId)
  const onboardingComplete = Boolean(account.details_submitted && account.charges_enabled)

  if (onboardingComplete !== chefProfile.stripeOnboardingComplete) {
    await prisma.chefProfile.update({
      where: { id: chefProfile.id },
      data: { stripeOnboardingComplete: onboardingComplete },
    })
  }

  return {
    accountId: chefProfile.stripeAccountId,
    onboardingComplete,
    isConnected: true,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== Role.CHEF) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const userId = session.user.id

    // Check if Stripe is properly configured
    if (!StripeService.isConfigured()) {
      // Return a default "not configured" status
      const chefProfile = await getChefProfile(userId)
      
      return NextResponse.json({ 
        stripe: {
          accountId: chefProfile?.stripeAccountId || null,
          onboardingComplete: false,
          isConnected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          configured: false
        }
      })
    }

    const stripe = await getStripeStatus(userId)
    return NextResponse.json({ stripe: { ...stripe, configured: true } })
  } catch (error) {
    console.error("Stripe connect GET failed", error)
    return NextResponse.json({ error: "Failed to fetch Stripe status" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== Role.CHEF) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const userId = session.user.id
    const payload = connectActionSchema.parse(await request.json())
    const baseUrl = getBaseUrl(request)
    const chefProfile = await getChefProfile(userId)

    if (!chefProfile) {
      return NextResponse.json({ error: "Chef profile not found" }, { status: 404 })
    }

    // Check if Stripe is properly configured
    if (!StripeService.isConfigured()) {
      return NextResponse.json({ 
        error: "Stripe is not configured. Please add a valid STRIPE_SECRET_KEY to your .env file to enable payouts.",
        code: "STRIPE_NOT_CONFIGURED"
      }, { status: 503 })
    }

    const stripeService = getStripeService()
    let accountId = chefProfile.stripeAccountId

    if (!accountId) {
      const account = await stripeService.createConnectAccount({
        email: chefProfile.user.email ?? undefined,
        business_type: "individual",
        metadata: {
          chefProfileId: chefProfile.id,
          userId,
        },
      })

      accountId = account.id

      await prisma.chefProfile.update({
        where: { id: chefProfile.id },
        data: {
          stripeAccountId: account.id,
          stripeOnboardingComplete: Boolean(account.details_submitted && account.charges_enabled),
        },
      })
    }

    const accountLink = await stripeService.createConnectAccountLink({
      account: accountId,
      refresh_url: `${baseUrl}/dashboard/chef/settings?stripe=refresh`,
      return_url: `${baseUrl}/dashboard/chef/settings?stripe=return`,
      type: "account_onboarding",
    })

    const stripe = await getStripeStatus(userId)

    return NextResponse.json({
      url: accountLink.url,
      expiresAt: accountLink.expires_at,
      stripe,
      action: payload.action,
    })
  } catch (error) {
    console.error("Stripe connect POST failed", error)

    // Handle Stripe configuration errors specifically
    if (error instanceof Error && error.message.includes('placeholder')) {
      return NextResponse.json({ 
        error: "Stripe is not configured. Please add a valid STRIPE_SECRET_KEY to your .env file to enable payouts.",
        code: "STRIPE_NOT_CONFIGURED"
      }, { status: 503 })
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid Stripe connect action" }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to start Stripe onboarding" }, { status: 500 })
  }
}
