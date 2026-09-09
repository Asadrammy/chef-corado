import { NextRequest, NextResponse } from "next/server"

import { apiSuccess } from "@/lib/api-response"
import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { getCurrencyForCountry } from "@/lib/request-options"
import { chefProfileService } from "@/lib/services/chef-profile-service"
import { Role } from "@/types"
import { isPrismaConnectionError } from "@/lib/prisma"
import { chefProfileSchema } from "@/lib/chef-profile-validation"

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession(Role.CHEF)

    const body = await request.json()
    const validatedData = chefProfileSchema.parse(body)
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
