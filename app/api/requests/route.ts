import { NextResponse } from "next/server"
import { z } from "zod"
import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { isLocalDemoSessionUser } from "@/lib/auth"
import { handleApiError } from "@/lib/error-handler"
import { localDemoClientRequests } from "@/lib/local-demo-data"
import { isPrismaConnectionError } from "@/lib/prisma"
import { requestService } from "@/lib/services/request-service"
import { requestSchema } from "@/lib/validation-schemas"
import { Role } from "@/types"

export async function POST(request: Request) {
  let session
  try {
    session = await getRequiredSession(Role.CLIENT)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: z.infer<typeof requestSchema>

  try {
    const json = await request.json()
    body = requestSchema.parse(json)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  try {
    if (isLocalDemoSessionUser(session.user.id, session.user.email)) {
      return NextResponse.json({
        id: `local-demo-request-${Date.now()}`,
        title: body.title ?? `${body.eventType} request`,
        eventType: body.eventType,
        serviceType: body.serviceType,
        cuisineTypes: JSON.stringify(body.cuisinePreferences),
        dietaryRequirements: JSON.stringify(body.dietaryRequirements),
        eventDate: new Date(body.eventDate),
        eventTime: body.eventTime,
        location: body.location,
        countryCode: body.country,
        currency: body.country === "US" ? "USD" : body.country === "KE" ? "KES" : body.country === "IT" ? "EUR" : "GBP",
        guestCount: body.guestCount,
        adultCount: body.adultCount,
        childrenUnder10: body.childrenUnder10,
        actualAttendeeCount: body.actualAttendeeCount,
        billableGuestCount: body.billableGuestCount,
        pricingGuestCount: body.pricingGuestCount,
        serviceSpecificAnswers: JSON.stringify(body.serviceSpecificAnswers ?? {}),
        pricingStatus: "LOCAL_DEMO",
        budgetStatus: "LOCAL_DEMO",
        budget: body.budget,
        details: body.details ?? null,
        status: "OPEN",
        localDemo: true,
      }, { status: 201 })
    }

    const created = await requestService.createRequest(getSessionUserId(session), body)
    return NextResponse.json(created)
  } catch (error) {
    if (error instanceof Error && ["INVALID_SERVICE_TYPE", "SERVICE_COUNTRY_NOT_SUPPORTED"].includes(error.message)) {
      return NextResponse.json({ error: "Selected service is not supported for this country." }, { status: 422 })
    }

    if (error instanceof Error && error.message.startsWith("SERVICE_REQUIRED_QUESTIONS_MISSING:")) {
      return NextResponse.json({ error: "Please complete the required questions for the selected service." }, { status: 422 })
    }

    if (error instanceof Error && error.message.startsWith("PRICING_GUEST_COUNT_BELOW_MIN:")) {
      return NextResponse.json({ error: `Guest count is below the active pricing minimum (${error.message.split(":")[1]}).` }, { status: 422 })
    }

    if (error instanceof Error && error.message.startsWith("PRICING_GUEST_COUNT_ABOVE_MAX:")) {
      return NextResponse.json({ error: `Guest count exceeds the active pricing maximum (${error.message.split(":")[1]}).` }, { status: 422 })
    }

    return handleApiError(error, "Requests POST")
  }
}

export async function GET() {
  let session
  try {
    session = await getRequiredSession()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await requestService.listRequests(getSessionUserId(session), session.user.role)

    if ("status" in result) {
      return NextResponse.json(result, { status: result.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json({
        requests: session.user.role === Role.CLIENT ? localDemoClientRequests : [],
      })
    }

    return handleApiError(error, "Requests GET")
  }
}
