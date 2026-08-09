import { NextResponse } from "next/server"
import { z } from "zod"

import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { requestService } from "@/lib/services/request-service"
import { fullTimeChefEnquirySchema } from "@/lib/validation-schemas"
import { Role } from "@/types"

export async function POST(request: Request) {
  let session
  try {
    session = await getRequiredSession(Role.CLIENT)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const json = await request.json()
    const body = fullTimeChefEnquirySchema.parse(json)
    const created = await requestService.createFullTimeChefEnquiry(getSessionUserId(session), body)
    return NextResponse.json(created)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }

    return handleApiError(error, "Full-Time Chef Enquiries POST")
  }
}
