import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getAppBaseUrlFromRequest, resendVerificationEmail, sanitizeCallbackUrl } from "@/lib/email-verification"
import { Role } from "@/types"

const resendVerificationSchema = z.object({
  email: z.string().email(),
  role: z.enum([Role.CLIENT, Role.CHEF]).optional(),
  callbackUrl: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const payload = resendVerificationSchema.safeParse(body)

    if (!payload.success) {
      return NextResponse.json(
        { message: "If an unverified account exists for that email, a new verification link will be sent." },
        { status: 200 }
      )
    }

    const result = await resendVerificationEmail({
      email: payload.data.email,
      expectedRole: payload.data.role,
      callbackUrl: sanitizeCallbackUrl(payload.data.callbackUrl),
      baseUrl: getAppBaseUrlFromRequest(request),
    })

    if (result.status === "SENT" && !result.emailSent) {
      console.warn("Verification email resend could not be delivered. Check email provider configuration.")
    }

    return NextResponse.json({
      message: "If an unverified account exists for that email, a new verification link will be sent.",
    })
  } catch (error) {
    console.error("Resend verification error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({
      message: "If an unverified account exists for that email, a new verification link will be sent.",
    })
  }
}
