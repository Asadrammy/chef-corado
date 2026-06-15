import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { isPrismaConnectionError, prisma, withPrismaReconnect } from "@/lib/prisma"
import { TERMS_VERSION } from "@/lib/request-options"
import { getStripeService, StripeService } from "@/lib/services/stripe-service"
import { Role } from "@/types"

const chefSettingsLegalSelect = {
  stripeAccountId: true,
  stripeOnboardingComplete: true,
  verificationStatus: true,
  isApproved: true,
  rightToWorkUkConfirmed: true,
  foodHygieneLevel2Confirmed: true,
  foodHygieneCertificateUrl: true,
  foodHygieneCertificateUploadedAt: true,
  foodHygieneCertificateReviewedAt: true,
  foodHygieneCertificateReviewedBy: true,
  foodHygieneCertificateReviewStatus: true,
  approvedAt: true,
  approvedBy: true,
}

const notificationPreferenceSchema = z.object({
  emailMessages: z.boolean(),
  emailBookings: z.boolean(),
  emailRequests: z.boolean(),
  inAppMessages: z.boolean(),
  inAppBookings: z.boolean(),
  inAppRequests: z.boolean(),
})

const settingsUpdateSchema = z.object({
  notificationPreferences: notificationPreferenceSchema.optional(),
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
  let userId: string | null = null

  try {
    const session = await getRequiredSession(Role.CHEF)
    const authenticatedUserId = getSessionUserId(session)
    userId = authenticatedUserId

    // Check if Stripe is properly configured
    const stripeConfigured = StripeService.isConfigured()

    const [preferences, user, chefProfile] = await withPrismaReconnect(
      async () => {
        const preferences = await prisma.notificationPreference.findUnique({
          where: { userId: authenticatedUserId },
        })
        const user = await prisma.user.findUnique({
          where: { id: authenticatedUserId },
          select: {
            termsAcceptedAt: true,
            termsVersion: true,
            acceptedVia: true,
          },
        })
        const chefProfile = await prisma.chefProfile.findUnique({
          where: { userId: authenticatedUserId },
          select: chefSettingsLegalSelect,
        })

        return [preferences, user, chefProfile] as const
      },
      process.env.NODE_ENV === "development" ? 0 : 1
    )

    const chefSettingsProfile = chefProfile as any

    let stripeAccount = null
    if (stripeConfigured && chefSettingsProfile?.stripeAccountId) {
      try {
        const stripeService = getStripeService()
        stripeAccount = await stripeService.retrieveConnectAccount(chefSettingsProfile.stripeAccountId)
      } catch (error) {
        console.error("Failed to retrieve Stripe account", error)
        // Continue with null stripe account
      }
    }

    return NextResponse.json({
      notificationPreferences: preferences ?? defaultPreferences(authenticatedUserId),
      legal: {
        termsAcceptedAt: user?.termsAcceptedAt?.toISOString() ?? null,
        termsVersion: user?.termsVersion ?? null,
        acceptedVia: user?.acceptedVia ?? null,
        termsCurrent: Boolean(user?.termsAcceptedAt) && user?.termsVersion === TERMS_VERSION && Boolean(user?.acceptedVia),
        rightToWorkUkConfirmed: chefSettingsProfile?.rightToWorkUkConfirmed ?? false,
        foodHygieneLevel2Confirmed: chefSettingsProfile?.foodHygieneLevel2Confirmed ?? false,
        foodHygieneCertificateUrl: chefSettingsProfile?.foodHygieneCertificateUrl ?? null,
        foodHygieneCertificateUploadedAt: chefSettingsProfile?.foodHygieneCertificateUploadedAt?.toISOString() ?? null,
        foodHygieneCertificateReviewedAt: chefSettingsProfile?.foodHygieneCertificateReviewedAt?.toISOString() ?? null,
        foodHygieneCertificateReviewedBy: chefSettingsProfile?.foodHygieneCertificateReviewedBy ?? null,
        foodHygieneCertificateReviewStatus: chefSettingsProfile?.foodHygieneCertificateReviewStatus ?? null,
        verificationStatus: chefSettingsProfile?.verificationStatus ?? "PENDING",
        isApproved: chefSettingsProfile?.isApproved ?? false,
        approvedAt: chefSettingsProfile?.approvedAt?.toISOString() ?? null,
        approvedBy: chefSettingsProfile?.approvedBy ?? null,
        complianceConfirmed: Boolean(chefSettingsProfile?.rightToWorkUkConfirmed) && Boolean(chefSettingsProfile?.foodHygieneLevel2Confirmed),
        readyForReview: Boolean(user?.termsAcceptedAt) && user?.termsVersion === TERMS_VERSION && Boolean(user?.acceptedVia) && Boolean(chefSettingsProfile?.rightToWorkUkConfirmed) && Boolean(chefSettingsProfile?.foodHygieneLevel2Confirmed),
      },
      stripe: {
        accountId: chefSettingsProfile?.stripeAccountId ?? null,
        onboardingComplete: stripeAccount
          ? Boolean(stripeAccount.details_submitted && stripeAccount.charges_enabled)
          : chefSettingsProfile?.stripeOnboardingComplete ?? false,
        isConnected: Boolean(chefSettingsProfile?.stripeAccountId),
        chargesEnabled: stripeAccount?.charges_enabled ?? false,
        payoutsEnabled: stripeAccount?.payouts_enabled ?? false,
        detailsSubmitted: stripeAccount?.details_submitted ?? false,
        configured: stripeConfigured,
      },
    })
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development" && userId) {
      return NextResponse.json({
        notificationPreferences: defaultPreferences(userId),
        legal: {
          termsAcceptedAt: null,
          termsVersion: null,
          acceptedVia: null,
          termsCurrent: false,
          rightToWorkUkConfirmed: false,
          foodHygieneLevel2Confirmed: false,
          foodHygieneCertificateUrl: null,
          foodHygieneCertificateUploadedAt: null,
          foodHygieneCertificateReviewedAt: null,
          foodHygieneCertificateReviewedBy: null,
          foodHygieneCertificateReviewStatus: null,
          verificationStatus: "PENDING",
          isApproved: false,
          approvedAt: null,
          approvedBy: null,
          complianceConfirmed: false,
          readyForReview: false,
        },
        stripe: {
          accountId: null,
          onboardingComplete: false,
          isConnected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          configured: StripeService.isConfigured(),
        },
        localDemo: true,
      })
    }

    console.error("Failed to fetch chef settings", error)
    return NextResponse.json({ error: "Failed to fetch chef settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getRequiredSession(Role.CHEF)
    const userId = getSessionUserId(session)

    const body = await request.json()
    const payload = settingsUpdateSchema.parse(body)

    let preferences = null
    if (payload.notificationPreferences) {
      preferences = await prisma.notificationPreference.upsert({
        where: { userId },
        update: payload.notificationPreferences,
        create: {
          userId,
          ...payload.notificationPreferences,
        },
      })
    }

    return NextResponse.json({
      notificationPreferences: preferences,
    })
  } catch (error) {
    console.error("Failed to update chef settings", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to update chef settings" }, { status: 500 })
  }
}
