import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { apiSuccess } from "@/lib/api-response"
import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { COUNTRY_OPTIONS, getCurrencyForCountry } from "@/lib/request-options"
import { chefProfileService } from "@/lib/services/chef-profile-service"
import { Role } from "@/types"
import { validateMessageContent } from "@/lib/security/communication-policy"

const countryCodes = COUNTRY_OPTIONS.map((option) => option.value) as [string, ...string[]]
const currencyCodes = [...new Set(COUNTRY_OPTIONS.map((option) => option.currency))] as [string, ...string[]]

const profileSchema = z.object({
  phone: z.string().min(7, "Phone must be at least 7 characters").optional(),
  bio: z.string().optional(),
  experience: z.number().int().min(0).optional(),
  location: z.string().min(1, "Location is required"),
  radius: z.number().min(1, "Radius must be at least 1 km").max(500, "Radius cannot exceed 500 km"),
  baseCountryCode: z.enum(countryCodes).default("GB"),
  preferredCurrency: z.enum(currencyCodes).default("GBP"),
  profileImage: z.string().url().optional(),
  chefType: z.string().optional(),
  certifications: z.string().optional(),
  eventsPerMonth: z.number().int().min(0).optional(),
  stripeAccountId: z.string().optional(),
  stripeOnboardingComplete: z.boolean().optional(),
})

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
    const validatedData = profileSchema.parse(body)

    // Enforce communication policy on user-generated text
    if (validatedData.bio) {
      validateMessageContent(validatedData.bio)
    }
    if (validatedData.chefType) {
      validateMessageContent(validatedData.chefType)
    }
    if (validatedData.certifications) {
      validateMessageContent(validatedData.certifications)
    }

    const normalizedData = {
      ...validatedData,
      preferredCurrency: getCurrencyForCountry(validatedData.baseCountryCode),
    }
    const updatedProfile = await chefProfileService.update(getSessionUserId(session), normalizedData)

    return apiSuccess(updatedProfile)
  } catch (error) {
    return handleApiError(error, "Chef Profile PUT")
  }
}
