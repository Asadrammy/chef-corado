import { NextRequest, NextResponse } from "next/server"

import { apiSuccess } from "@/lib/api-response"
import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { getCurrencyForCountry } from "@/lib/request-options"
import { chefProfileService } from "@/lib/services/chef-profile-service"
import { Role } from "@/types"
import { validateMessageContent } from "@/lib/security/communication-policy"
import { isPrismaConnectionError } from "@/lib/prisma"
import { chefProfileSchema } from "@/lib/chef-profile-validation"

function getLocalDemoChefProfile(userId: string) {
  return {
    id: "local-demo-chef-profile",
    userId,
    phone: "+1 555 0100",
    firstName: "Chef",
    surname: "User",
    bio: "Private chef focused on intimate dinners, celebratory tasting menus, and calm restaurant-level hospitality at home.",
    experience: 8,
    location: "Local demo kitchen",
    latitude: null,
    longitude: null,
    radius: 25,
    baseCountryCode: "US",
    preferredCurrency: "USD",
    isApproved: true,
    profileImage: undefined,
    chefType: "PRIVATE_CHEF",
    careerStage: "EXPERIENCED_PRIVATE_CHEF",
    specialties: ["PRIVATE_DINING"],
    certifications: "Level 2 Food Hygiene, private dining service",
    cuisineType: "Modern European",
    eventsPerMonth: 8,
    stripeAccountId: undefined,
    stripeOnboardingComplete: false,
    rightToWorkUkConfirmed: true,
    foodHygieneLevel2Confirmed: true,
    foodHygieneCertificateUrl: undefined,
    verificationStatus: "APPROVED",
    approvedAt: new Date().toISOString(),
    approvedBy: "local-demo",
    avgRating: 4.8,
    termsAcceptedAt: new Date().toISOString(),
    termsVersion: "local-demo",
    acceptedVia: "local-demo",
    user: {
      id: userId,
      name: "Chef User",
      email: "chef@example.com",
      verified: true,
    },
    reviews: [],
    _count: {
      reviews: 3,
    },
  }
}

// GET chef profile
export async function GET() {
  try {
    const session = await getRequiredSession(Role.CHEF)
    const userId = getSessionUserId(session)
    const chefProfile = await chefProfileService.getByUserId(userId)

    if (!chefProfile) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Chef profile not found. Please create your chef profile first.",
          },
          needsProfile: true,
          userId,
        },
        { status: 404 }
      )
    }

    return apiSuccess(chefProfile)
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      const session = await getRequiredSession(Role.CHEF).catch(() => null)
      return apiSuccess(getLocalDemoChefProfile(session?.user?.id || "local-chef-user"))
    }

    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "Your session has expired. Please log out and log back in.",
          },
        },
        { status: 401 }
      )
    }

    return handleApiError(error, "Chef Profile GET")
  }
}

// PUT chef profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getRequiredSession(Role.CHEF)
    const body = await request.json()
    const validatedData = chefProfileSchema.parse(body)

    // Enforce communication policy on user-generated text
    if (validatedData.bio) {
      validateMessageContent(validatedData.bio)
    }
    if (validatedData.chefType) {
      validateMessageContent(validatedData.chefType)
    }
    if (validatedData.careerStage) {
      validateMessageContent(validatedData.careerStage)
    }
    if (validatedData.certifications) {
      validateMessageContent(validatedData.certifications)
    }
    if (validatedData.firstName) {
      validateMessageContent(validatedData.firstName)
    }
    if (validatedData.surname) {
      validateMessageContent(validatedData.surname)
    }
    if (validatedData.cuisineType) {
      validateMessageContent(validatedData.cuisineType)
    }

    const normalizedData = {
      ...validatedData,
      preferredCurrency: getCurrencyForCountry(validatedData.baseCountryCode),
    }
    const updatedProfile = await chefProfileService.update(getSessionUserId(session), normalizedData)

    return apiSuccess(updatedProfile)
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "LOCAL_DEMO_MODE",
            message: "Chef profile changes are unavailable in local demo mode.",
          },
        },
        { status: 503 }
      )
    }

    return handleApiError(error, "Chef Profile PUT")
  }
}
