import crypto from "crypto"

import { sendEmail } from "@/lib/email"
import { prisma } from "@/lib/prisma"
import { getConfiguredAppBaseUrl } from "@/lib/site-config"

export const PASSWORD_RESET_TOKEN_BYTES = 32
export const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000

export function generatePasswordResetToken() {
  return crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("hex")
}

export function hashPasswordResetToken(token: string) {
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

export function buildPasswordResetUrl(token: string, baseUrl = getConfiguredAppBaseUrl()) {
  const resetUrl = new URL("/reset-password", baseUrl)
  resetUrl.searchParams.set("token", token)
  return resetUrl.toString()
}

export async function createPasswordResetForUser(userId: string) {
  const rawToken = generatePasswordResetToken()
  const tokenHash = hashPasswordResetToken(rawToken)
  const expires = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS)

  await prisma.user.update({
    where: { id: userId },
    data: {
      resetToken: tokenHash,
      resetTokenExpires: expires,
    },
  })

  return { rawToken, tokenHash, expires }
}

export async function sendPasswordResetEmail({
  email,
  name,
  token,
  baseUrl,
}: {
  email: string
  name: string
  token: string
  baseUrl?: string
}) {
  const resetUrl = buildPasswordResetUrl(token, baseUrl)
  const safeName = escapeHtml(name || "ChefaChef member")
  const safeResetUrl = escapeHtml(resetUrl)

  return sendEmail({
    to: email,
    subject: "Reset your ChefaChef password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #111827;">Reset your ChefaChef password</h2>
        <p>Hi <strong>${safeName}</strong>,</p>
        <p>Use the secure link below to reset your password. This link expires in 1 hour and can be used only once.</p>
        <p>
          <a href="${safeResetUrl}" style="display:inline-block;background:#ff5c00;color:#111827;padding:12px 18px;border-radius:12px;font-weight:700;text-decoration:none;">
            Reset password
          </a>
        </p>
        <p>If the button does not work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all;"><a href="${safeResetUrl}">${safeResetUrl}</a></p>
        <p>If you did not request this, you can ignore this email.</p>
        <p style="margin-top: 30px;">Best regards,<br>The ChefaChef Team</p>
      </div>
    `,
  })
}
