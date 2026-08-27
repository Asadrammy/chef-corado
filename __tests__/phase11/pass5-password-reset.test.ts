/// <reference types="jest" />

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}))

import { POST, PUT } from "@/app/api/auth/reset-password/route"
import { sendEmail } from "@/lib/email"
import { hashPasswordResetToken } from "@/lib/password-reset"
import { prisma } from "@/lib/prisma"

const mockedUser = prisma.user as unknown as Record<string, jest.Mock>
const mockedSendEmail = sendEmail as jest.Mock

const genericResetMessage = "If an account with that email exists, a password reset link has been sent."

function jsonRequest(body: unknown) {
  return new Request("https://chefachef.co.uk/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any
}

describe("Pass 5 password reset flow", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXTAUTH_URL = "https://chefachef.co.uk"
  })

  it("creates a hashed expiring token and dispatches an email for an existing account", async () => {
    mockedUser.findUnique.mockResolvedValue({ id: "user-1", name: "Client One", email: "client@example.com" })
    mockedUser.update.mockResolvedValue({ id: "user-1" })

    const response = await POST(jsonRequest({ email: " Client@Example.COM " }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toBe(genericResetMessage)
    expect(mockedUser.findUnique).toHaveBeenCalledWith({
      where: { email: "client@example.com" },
      select: { id: true, name: true, email: true },
    })
    expect(mockedUser.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        resetToken: expect.stringMatching(/^[a-f0-9]{64}$/),
        resetTokenExpires: expect.any(Date),
      },
    })
    expect(mockedSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "client@example.com",
      subject: "Reset your ChefaChef password",
      html: expect.stringContaining("https://chefachef.co.uk/reset-password?token="),
    }))
  })

  it("does not reveal whether an account exists", async () => {
    mockedUser.findUnique.mockResolvedValue(null)

    const response = await POST(jsonRequest({ email: "missing@example.com" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toBe(genericResetMessage)
    expect(mockedUser.update).not.toHaveBeenCalled()
    expect(mockedSendEmail).not.toHaveBeenCalled()
  })

  it("rejects an invalid or expired reset token", async () => {
    mockedUser.findFirst.mockResolvedValue(null)

    const response = await PUT(jsonRequest({ token: "expired-token", newPassword: "new-password-123" }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Invalid or expired reset token")
    expect(mockedUser.findFirst).toHaveBeenCalledWith({
      where: {
        resetToken: hashPasswordResetToken("expired-token"),
        resetTokenExpires: { gt: expect.any(Date) },
      },
    })
  })

  it("resets the password and invalidates the token after successful use", async () => {
    mockedUser.findFirst.mockResolvedValueOnce({ id: "user-1", resetToken: hashPasswordResetToken("valid-token") })
    mockedUser.update.mockResolvedValue({ id: "user-1" })

    const response = await PUT(jsonRequest({ token: "valid-token", newPassword: "new-password-123" }))

    expect(response.status).toBe(200)
    expect(mockedUser.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        password: expect.any(String),
        resetToken: null,
        resetTokenExpires: null,
      },
    })
  })

  it("rejects token reuse once the stored token has been cleared", async () => {
    mockedUser.findFirst.mockResolvedValue(null)

    const response = await PUT(jsonRequest({ token: "valid-token", newPassword: "new-password-123" }))

    expect(response.status).toBe(400)
    expect(mockedUser.update).not.toHaveBeenCalled()
  })
})
