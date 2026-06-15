import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { apiSuccess } from "@/lib/api-response"
import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { COUNTRY_OPTIONS, getCurrencyForCountry } from "@/lib/request-options"
import { chefProfileService } from "@/lib/services/chef-profile-service"
import { Role } from "@/types"
import { isPrismaConnectionError } from "@/lib/prisma"

const countryCodes = COUNTRY_OPTIONS.map((option) => option.value) as [string, ...string[]]
const currencyCodes = [...new Set(COUNTRY_OPTIONS.map((option) => option.currency))] as [string, ...string[]]

const profileSchema = z.object({
  phone: z.string().min(7, "Phone must be at least 7 characters").optional(),
  firstName: z.string().min(1, "First name is required").optional(),
  surname: z.string().min(1, "Surname is required").optional(),
  bio: z.string().optional(),
  experience: z.number().int().min(0).optional(),
  location: z.string().min(1, "Location is required"),
  radius: z.number().min(1, "Radius must be at least 1 km").max(500, "Radius cannot exceed 500 km"),
  baseCountryCode: z.enum(countryCodes).default("GB"),
  preferredCurrency: z.enum(currencyCodes).default("GBP"),
  profileImage: z.string().optional(),
  chefType: z.string().optional(),
  certifications: z.string().optional(),
  cuisineType: z.string().optional(),
  eventsPerMonth: z.number().int().min(0).optional(),
  stripeAccountId: z.string().optional(),
  stripeOnboardingComplete: z.boolean().optional(),
  rightToWorkUkConfirmed: z.boolean().optional(),
  foodHygieneLevel2Confirmed: z.boolean().optional(),
  foodHygieneCertificateUrl: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession(Role.CHEF)

    const body = await request.json()
    const validatedData = profileSchema.parse(body)
    const normalizedData = {
      ...validatedData,
      preferredCurrency: getCurrencyForCountry(validatedData.baseCountryCode),
    }
    const chefProfile = await chefProfileService.create(getSessionUserId(session), normalizedData)

    return apiSuccess(chefProfile, 201)
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "LOCAL_DEMO_MODE",
            message: "Chef profile creation is unavailable in local demo mode.",
          },
        },
        { status: 503 }
      )
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

    return handleApiError(error, "Chef Profile Create POST")
  }
}
