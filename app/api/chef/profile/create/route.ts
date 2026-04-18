import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { apiSuccess } from "@/lib/api-response"
import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { chefProfileService } from "@/lib/services/chef-profile-service"
import { Role } from "@/types"

const profileSchema = z.object({
  phone: z.string().min(7, "Phone must be at least 7 characters").optional(),
  bio: z.string().optional(),
  experience: z.number().int().min(0).optional(),
  location: z.string().min(1, "Location is required"),
  radius: z.number().min(1, "Radius must be at least 1 km").max(500, "Radius cannot exceed 500 km"),
  profileImage: z.string().url().optional(),
  chefType: z.string().optional(),
  certifications: z.string().optional(),
  eventsPerMonth: z.number().int().min(0).optional(),
  stripeAccountId: z.string().optional(),
  stripeOnboardingComplete: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession(Role.CHEF)

    const body = await request.json()
    const validatedData = profileSchema.parse(body)
    const chefProfile = await chefProfileService.create(getSessionUserId(session), validatedData)

    return apiSuccess(chefProfile, 201)
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

    return handleApiError(error, "Chef Profile Create POST")
  }
}
