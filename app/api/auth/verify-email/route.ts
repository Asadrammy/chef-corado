import { NextRequest, NextResponse } from "next/server"

import { buildLoginPath, sanitizeCallbackUrl, verifyEmailToken } from "@/lib/email-verification"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = typeof body?.token === "string" ? body.token : ""
    const callbackUrl = sanitizeCallbackUrl(typeof body?.callbackUrl === "string" ? body.callbackUrl : "")
    const result = await verifyEmailToken(token)

    if (result.status === "VERIFIED" || result.status === "ALREADY_VERIFIED") {
      return NextResponse.json({
        status: result.status,
        message: result.status === "VERIFIED" ? "Email verified successfully." : "Email is already verified.",
        loginPath: buildLoginPath(result.user.role, callbackUrl),
      })
    }

    return NextResponse.json(
      {
        status: result.status,
        message: result.status === "EXPIRED" ? "This verification link has expired." : "This verification link is invalid.",
      },
      { status: 400 }
    )
  } catch (error) {
    console.error("Email verification error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to verify email" }, { status: 500 })
  }
}
