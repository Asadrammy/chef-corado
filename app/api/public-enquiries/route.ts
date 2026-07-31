import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { isPrismaConnectionError, prisma } from "@/lib/prisma"
import { validateMessageContent } from "@/lib/security/communication-policy"

const publicEnquirySchema = z.object({
  type: z.enum(["gift-card", "careers", "property-manager-affiliate", "venue-partner"]),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  company: z.string().trim().max(180).optional().or(z.literal("")),
  location: z.string().trim().max(180).optional().or(z.literal("")),
  partnerType: z.string().trim().max(180).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(2000),
  website: z.string().max(0).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const payload = publicEnquirySchema.parse(await request.json())

    if (payload.website) {
      return NextResponse.json({ ok: true }, { status: 202 })
    }

    validateMessageContent(payload.name)
    validateMessageContent(payload.company || "")
    validateMessageContent(payload.location || "")
    validateMessageContent(payload.partnerType || "")
    validateMessageContent(payload.message)

    await prisma.auditLog.create({
      data: {
        action: "PUBLIC_ENQUIRY_SUBMITTED",
        entityType: "PUBLIC_ENQUIRY",
        entityId: payload.type,
        newValue: JSON.stringify({
          type: payload.type,
          name: payload.name,
          email: payload.email,
          company: payload.company || null,
          location: payload.location || null,
          partnerType: payload.partnerType || null,
          message: payload.message,
          submittedAt: new Date().toISOString(),
        }),
        performedBy: "PUBLIC",
        reason: "Public enquiry form",
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: request.headers.get("user-agent"),
      },
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json({ ok: true, localDemo: true }, { status: 202 })
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 422 }
      )
    }

    return NextResponse.json({ error: "Unable to submit enquiry" }, { status: 500 })
  }
}
