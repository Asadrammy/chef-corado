import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { TERMS_VERSION } from "@/lib/request-options"
import { getStripeService, StripeService } from "@/lib/services/stripe-service"
import { Role } from "@/types"

const notificationPreferenceSchema = z.object({
  emailMessages: z.boolean(),
  emailBookings: z.boolean(),
  emailRequests: z.boolean(),
  inAppMessages: z.boolean(),
  inAppBookings: z.boolean(),
  inAppRequests: z.boolean(),
})

const insuranceSubmissionSchema = z.object({
  insuranceDocumentUrl: z.string().url("A valid insurance document URL is required").refine(
    (url) => {
      // Validate URL is from allowed domains or storage services
      const allowedDomains = [
        'drive.google.com',
        'docs.google.com',
        'dropbox.com',
        'onedrive.live.com',
        'cloudinary.com',
        'aws.amazon.com',
        's3.amazonaws.com',
        'storage.googleapis.com',
      ]
      try {
        const urlObj = new URL(url)
        return allowedDomains.some(domain => urlObj.hostname.includes(domain))
      } catch {
        return false
      }
    },
    "Document URL must be from a trusted storage service (Google Drive, Dropbox, OneDrive, Cloudinary, AWS S3)"
  ),
  insuranceExpiryDate: z.string().refine((value) => {
    const date = new Date(value)
    const now = new Date()
    const minExpiry = new Date()
    minExpiry.setFullYear(minExpiry.getFullYear() + 1) // Must be at least 1 year in future
    return !Number.isNaN(date.getTime()) && date > minExpiry
  }, "Insurance must be valid for at least 1 year from today"),
})

const settingsUpdateSchema = z.object({
  notificationPreferences: notificationPreferenceSchema.optional(),
  insuranceSubmission: insuranceSubmissionSchema.optional(),
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
    const session = await getRequiredSession(Role.CHEF)
    const userId = getSessionUserId(session)

    // Check if Stripe is properly configured
    const stripeConfigured = StripeService.isConfigured()

    const [preferences, user, chefProfile] = await Promise.all([
      prisma.notificationPreference.findUnique({
        where: { userId },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          termsAcceptedAt: true,
          termsVersion: true,
          acceptedVia: true,
        },
      }),
      prisma.chefProfile.findUnique({
        where: { userId },
        select: {
          stripeAccountId: true,
          stripeOnboardingComplete: true,
          insuranceStatus: true,
          insuranceDocumentUrl: true,
          insuranceExpiryDate: true,
          insuranceVerifiedAt: true,
          insuranceVerifiedBy: true,
        },
      }),
    ])

    let stripeAccount = null
    if (stripeConfigured && chefProfile?.stripeAccountId) {
      try {
        const stripeService = getStripeService()
        stripeAccount = await stripeService.retrieveConnectAccount(chefProfile.stripeAccountId)
      } catch (error) {
        console.error("Failed to retrieve Stripe account", error)
        // Continue with null stripe account
      }
    }

    const insuranceExpired = chefProfile?.insuranceExpiryDate ? chefProfile.insuranceExpiryDate.getTime() < Date.now() : false

    return NextResponse.json({
      notificationPreferences: preferences ?? defaultPreferences(userId),
      legal: {
        termsAcceptedAt: user?.termsAcceptedAt?.toISOString() ?? null,
        termsVersion: user?.termsVersion ?? null,
        acceptedVia: user?.acceptedVia ?? null,
        termsCurrent: Boolean(user?.termsAcceptedAt) && user?.termsVersion === TERMS_VERSION && Boolean(user?.acceptedVia),
        insuranceStatus: chefProfile?.insuranceStatus ?? "pending",
        insuranceDocumentUrl: chefProfile?.insuranceDocumentUrl ?? null,
        insuranceExpiryDate: chefProfile?.insuranceExpiryDate?.toISOString() ?? null,
        insuranceVerifiedAt: chefProfile?.insuranceVerifiedAt?.toISOString() ?? null,
        insuranceVerifiedBy: chefProfile?.insuranceVerifiedBy ?? null,
        insuranceCurrent: chefProfile?.insuranceStatus === "verified" && Boolean(chefProfile?.insuranceDocumentUrl) && Boolean(chefProfile?.insuranceVerifiedAt) && !insuranceExpired,
        insuranceExpired,
      },
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

    let legal = null
    if (payload.insuranceSubmission) {
      const insuranceExpiryDate = new Date(payload.insuranceSubmission.insuranceExpiryDate)
      legal = await prisma.chefProfile.update({
        where: { userId },
        data: {
          insuranceDocumentUrl: payload.insuranceSubmission.insuranceDocumentUrl,
          insuranceExpiryDate,
          insuranceStatus: "pending",
          insuranceVerifiedAt: null,
          insuranceVerifiedBy: null,
        } as never,
        select: {
          insuranceStatus: true,
          insuranceDocumentUrl: true,
          insuranceExpiryDate: true,
          insuranceVerifiedAt: true,
          insuranceVerifiedBy: true,
        },
      })
    }

    return NextResponse.json({
      notificationPreferences: preferences,
      legal,
    })
  } catch (error) {
    console.error("Failed to update chef settings", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to update chef settings" }, { status: 500 })
  }
}
