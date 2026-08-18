import crypto from "crypto"

import { sendEmail } from "@/lib/email"
import { APPROVED_PUBLIC_CONTACT } from "@/lib/marketplace-rules"
import { prisma } from "@/lib/prisma"
import { OFFICIAL_WEBSITE_URL } from "@/lib/site-config"
import { Role } from "@/types"

const VERIFICATION_IDENTIFIER_PREFIX = "email-verification:"
const VERIFICATION_TOKEN_BYTES = 32
export const EMAIL_VERIFICATION_EXPIRY_HOURS = 24
const EMAIL_VERIFICATION_ENFORCEMENT_START = new Date("2026-08-12T00:00:00.000Z")

type VerificationUser = {
  id: string
  name: string
  email: string
  role: string
}

export type EmailVerificationResult =
  | { status: "VERIFIED"; user: VerificationUser }
  | { status: "ALREADY_VERIFIED"; user: VerificationUser }
  | { status: "EXPIRED" }
  | { status: "INVALID" }

export function isSafeRelativePath(path?: string | null) {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//"))
}

export function sanitizeCallbackUrl(callbackUrl?: string | null) {
  return isSafeRelativePath(callbackUrl) ? callbackUrl! : ""
}

export function maskEmail(email: string) {
  const [localPart, domain] = email.split("@")
  if (!localPart || !domain) return email
  const visible = localPart.length <= 2 ? localPart[0] : `${localPart[0]}${localPart.slice(-1)}`
  return `${visible}${"*".repeat(Math.max(1, localPart.length - visible.length))}@${domain}`
}

export function getAppBaseUrlFromRequest(request?: Request) {
  const configuredUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL
  if (configuredUrl) return configuredUrl
  if (request?.url) return new URL(request.url).origin
  return OFFICIAL_WEBSITE_URL
}

export function buildLoginPath(role: string, callbackUrl?: string | null) {
  const params = new URLSearchParams()
  if (role === Role.CLIENT || role === Role.CHEF || role === Role.ADMIN) {
    params.set("role", role)
  }

  const safeCallbackUrl = sanitizeCallbackUrl(callbackUrl)
  if (safeCallbackUrl) {
    params.set("callbackUrl", safeCallbackUrl)
  }

  return `/login${params.toString() ? `?${params.toString()}` : ""}`
}

export function requiresEmailVerification({
  role,
  verified,
  createdAt,
}: {
  role: string
  verified: boolean
  createdAt?: Date | string | null
}) {
  if (role === Role.ADMIN || verified) {
    return false
  }

  const createdTime = createdAt ? new Date(createdAt).getTime() : Date.now()
  return createdTime >= EMAIL_VERIFICATION_ENFORCEMENT_START.getTime()
}

function getVerificationIdentifier(email: string) {
  return `${VERIFICATION_IDENTIFIER_PREFIX}${email.toLowerCase()}`
}

function getEmailFromIdentifier(identifier: string) {
  return identifier.startsWith(VERIFICATION_IDENTIFIER_PREFIX)
    ? identifier.slice(VERIFICATION_IDENTIFIER_PREFIX.length)
    : ""
}

function generateRawVerificationToken() {
  return crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString("hex")
}

function hashVerificationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function accountVerificationEmailHtml({
  name,
  verificationUrl,
}: {
  name: string
  verificationUrl: string
}) {
  const safeName = escapeHtml(name)
  const safeVerificationUrl = escapeHtml(verificationUrl)
  const supportEmail = escapeHtml(APPROVED_PUBLIC_CONTACT.email)

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #111827;">Verify your ChefaChef account</h2>
      <p>Hi <strong>${safeName}</strong>,</p>
      <p>Your ChefaChef account has been created. Please verify your email address before signing in to continue.</p>
      <p>
        <a href="${safeVerificationUrl}" style="display: inline-block; background: #ff5c00; color: #111827; padding: 12px 18px; border-radius: 12px; font-weight: 700; text-decoration: none;">
          Verify email
        </a>
      </p>
      <p>This verification link expires in ${EMAIL_VERIFICATION_EXPIRY_HOURS} hours. After verification, you can sign in and continue your intended workflow.</p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all;"><a href="${safeVerificationUrl}">${safeVerificationUrl}</a></p>
      <p>Need help? Contact ${supportEmail}.</p>
      <p style="margin-top: 30px;">Best regards,<br>The ChefaChef Team</p>
    </div>
  `
}

export async function createEmailVerificationToken(email: string) {
  const normalizedEmail = email.toLowerCase()
  const rawToken = generateRawVerificationToken()
  const tokenHash = hashVerificationToken(rawToken)
  const expires = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000)
  const identifier = getVerificationIdentifier(normalizedEmail)

  await prisma.verificationToken.deleteMany({ where: { identifier } })
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: tokenHash,
      expires,
    },
  })

  return { rawToken, expires }
}

export async function sendVerificationEmail({
  user,
  baseUrl,
  callbackUrl,
}: {
  user: VerificationUser
  baseUrl: string
  callbackUrl?: string | null
}) {
  const { rawToken, expires } = await createEmailVerificationToken(user.email)
  const verificationUrl = new URL("/verify-email", baseUrl)
  verificationUrl.searchParams.set("token", rawToken)

  const safeCallbackUrl = sanitizeCallbackUrl(callbackUrl)
  if (safeCallbackUrl) {
    verificationUrl.searchParams.set("callbackUrl", safeCallbackUrl)
  }

  const result = await sendEmail({
    to: user.email,
    subject: "Verify your ChefaChef account",
    html: accountVerificationEmailHtml({
      name: user.name,
      verificationUrl: verificationUrl.toString(),
    }),
  })

  return {
    ...result,
    expires,
  }
}

export async function verifyEmailToken(rawToken: string): Promise<EmailVerificationResult> {
  if (!/^[a-f0-9]{64}$/i.test(rawToken)) {
    return { status: "INVALID" }
  }

  const tokenHash = hashVerificationToken(rawToken)
  const tokenRecord = await prisma.verificationToken.findUnique({
    where: { token: tokenHash },
  })

  if (!tokenRecord) {
    return { status: "INVALID" }
  }

  if (tokenRecord.expires.getTime() < Date.now()) {
    await prisma.verificationToken.deleteMany({ where: { token: tokenHash } })
    return { status: "EXPIRED" }
  }

  const email = getEmailFromIdentifier(tokenRecord.identifier)
  if (!email) {
    await prisma.verificationToken.deleteMany({ where: { token: tokenHash } })
    return { status: "INVALID" }
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      verified: true,
    },
  })

  if (!user) {
    await prisma.verificationToken.deleteMany({ where: { token: tokenHash } })
    return { status: "INVALID" }
  }

  if (user.verified) {
    await prisma.verificationToken.deleteMany({ where: { identifier: tokenRecord.identifier } })
    return { status: "ALREADY_VERIFIED", user }
  }

  const verifiedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: user.id },
      data: { verified: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    await tx.verificationToken.deleteMany({ where: { identifier: tokenRecord.identifier } })
    return updated
  })

  return { status: "VERIFIED", user: verifiedUser }
}

export async function resendVerificationEmail({
  email,
  baseUrl,
  callbackUrl,
  expectedRole,
}: {
  email: string
  baseUrl: string
  callbackUrl?: string | null
  expectedRole?: string | null
}) {
  const normalizedEmail = email.toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      verified: true,
    },
  })

  if (
    !user ||
    user.role === Role.ADMIN ||
    user.verified ||
    (expectedRole && expectedRole !== user.role)
  ) {
    return { status: "GENERIC" as const, emailSent: false }
  }

  const emailResult = await sendVerificationEmail({
    user,
    baseUrl,
    callbackUrl,
  })

  return {
    status: "SENT" as const,
    emailSent: emailResult.success,
    emailError: emailResult.success ? undefined : emailResult.error,
  }
}
