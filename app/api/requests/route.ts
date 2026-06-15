import { NextResponse } from "next/server"
import { z } from "zod"
import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
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
    const created = await requestService.createRequest(getSessionUserId(session), body)
    return NextResponse.json(created)
  } catch (error) {
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
