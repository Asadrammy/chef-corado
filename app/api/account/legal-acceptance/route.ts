import { NextResponse } from "next/server"
import { z } from "zod"

import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { TERMS_VERSION } from "@/lib/request-options"

const legalAcceptanceSchema = z.object({
  acceptedTerms: z.literal(true),
  acceptedVia: z.enum(["register", "modal", "legal_acceptance_page"]),
})

export async function GET(request: Request) {
  try {
    const session = await getRequiredSession()
    const userId = getSessionUserId(session)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        termsAcceptedAt: true,
        termsVersion: true,
        acceptedVia: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const isAccepted = !!(
      user.termsAcceptedAt &&
      user.termsVersion === TERMS_VERSION &&
      user.acceptedVia
    )

    return NextResponse.json({
      accepted: isAccepted,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      acceptedVia: user.acceptedVia,
      currentVersion: TERMS_VERSION,
    })
  } catch (error) {
    return handleApiError(error, "Legal Acceptance GET")
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getRequiredSession()
    const userId = getSessionUserId(session)
    const acceptedAt = new Date()
    const payload = legalAcceptanceSchema.parse(await request.json())

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        termsAcceptedAt: acceptedAt,
        termsVersion: TERMS_VERSION,
        acceptedVia: payload.acceptedVia,
      } as never,
      select: {
        termsAcceptedAt: true,
        termsVersion: true,
        acceptedVia: true,
      },
    })

    return NextResponse.json({
      acceptedAt: updated.termsAcceptedAt,
      termsVersion: updated.termsVersion,
      acceptedVia: updated.acceptedVia,
    })
  } catch (error) {
    return handleApiError(error, "Legal Acceptance PUT")
  }
}
