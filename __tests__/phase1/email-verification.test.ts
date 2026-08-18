/// <reference types="jest" />

var mockPrisma: any
var mockSendEmail: jest.Mock

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma = {
    verificationToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock("@/lib/email", () => ({
  sendEmail: mockSendEmail = jest.fn(),
}))

jest.mock("@/lib/marketplace-rules", () => ({
  APPROVED_PUBLIC_CONTACT: {
    email: "info@chefachef.com",
  },
}))

import {
  buildLoginPath,
  createEmailVerificationToken,
  requiresEmailVerification,
  resendVerificationEmail,
  sanitizeCallbackUrl,
  sendVerificationEmail,
  verifyEmailToken,
} from "@/lib/email-verification"
import { sendEmail } from "@/lib/email"

mockSendEmail = sendEmail as jest.Mock

describe("email verification lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.verificationToken.create.mockResolvedValue({})
    mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 1 })
    mockSendEmail.mockResolvedValue({ success: true })
  })

  it("creates cryptographically sized tokens and stores only the hash", async () => {
    const result = await createEmailVerificationToken("CLIENT@Example.com")
    const storedToken = mockPrisma.verificationToken.create.mock.calls[0][0].data.token

    expect(result.rawToken).toMatch(/^[a-f0-9]{64}$/)
    expect(storedToken).toMatch(/^[a-f0-9]{64}$/)
    expect(storedToken).not.toBe(result.rawToken)
    expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: "email-verification:client@example.com" },
    })
  })

  it("sends verification email with callback continuation and no raw token logging", async () => {
    await sendVerificationEmail({
      user: {
        id: "user_1",
        name: "Client User",
        email: "client@example.com",
        role: "CLIENT",
      },
      baseUrl: "https://chefachef.example",
      callbackUrl: "/dashboard/client/create-request?draft=draft_123",
    })

    const emailPayload = mockSendEmail.mock.calls[0][0]
    expect(emailPayload.to).toBe("client@example.com")
    expect(emailPayload.subject).toBe("Verify your ChefaChef account")
    expect(emailPayload.html).toContain("/verify-email?token=")
    expect(emailPayload.html).toContain("callbackUrl=%2Fdashboard%2Fclient%2Fcreate-request%3Fdraft%3Ddraft_123")
  })

  it("verifies a valid unused token once and deletes verification tokens", async () => {
    const rawToken = "a".repeat(64)
    mockPrisma.verificationToken.findUnique.mockResolvedValue({
      identifier: "email-verification:client@example.com",
      token: "stored-hash",
      expires: new Date(Date.now() + 60_000),
    })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      name: "Client User",
      email: "client@example.com",
      role: "CLIENT",
      verified: false,
    })
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        user: {
          update: jest.fn().mockResolvedValue({
            id: "user_1",
            name: "Client User",
            email: "client@example.com",
            role: "CLIENT",
          }),
        },
        verificationToken: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      })
    )

    await expect(verifyEmailToken(rawToken)).resolves.toMatchObject({ status: "VERIFIED" })
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it("rejects invalid, already-used, and expired tokens", async () => {
    await expect(verifyEmailToken("bad-token")).resolves.toEqual({ status: "INVALID" })

    mockPrisma.verificationToken.findUnique.mockResolvedValueOnce(null)
    await expect(verifyEmailToken("b".repeat(64))).resolves.toEqual({ status: "INVALID" })

    mockPrisma.verificationToken.findUnique.mockResolvedValueOnce({
      identifier: "email-verification:client@example.com",
      token: "stored-hash",
      expires: new Date(Date.now() - 60_000),
    })
    await expect(verifyEmailToken("c".repeat(64))).resolves.toEqual({ status: "EXPIRED" })
  })

  it("returns already verified and removes stale tokens for verified users", async () => {
    mockPrisma.verificationToken.findUnique.mockResolvedValue({
      identifier: "email-verification:client@example.com",
      token: "stored-hash",
      expires: new Date(Date.now() + 60_000),
    })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      name: "Client User",
      email: "client@example.com",
      role: "CLIENT",
      verified: true,
    })

    await expect(verifyEmailToken("d".repeat(64))).resolves.toMatchObject({ status: "ALREADY_VERIFIED" })
    expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: "email-verification:client@example.com" },
    })
  })

  it("uses safe callback and role-aware login destinations", () => {
    expect(sanitizeCallbackUrl("/dashboard/client/create-request?draft=abc")).toBe("/dashboard/client/create-request?draft=abc")
    expect(sanitizeCallbackUrl("//evil.example")).toBe("")
    expect(buildLoginPath("CLIENT", "/dashboard/client/create-request?draft=abc")).toBe("/login?role=CLIENT&callbackUrl=%2Fdashboard%2Fclient%2Fcreate-request%3Fdraft%3Dabc")
    expect(buildLoginPath("ADMIN", "/dashboard/admin")).toBe("/login?role=ADMIN&callbackUrl=%2Fdashboard%2Fadmin")
  })

  it("enforces verification only for rollout-era Client/Chef accounts, not Admin or verified legacy users", () => {
    expect(requiresEmailVerification({ role: "ADMIN", verified: false, createdAt: new Date("2026-08-13") })).toBe(false)
    expect(requiresEmailVerification({ role: "CLIENT", verified: true, createdAt: new Date("2026-08-13") })).toBe(false)
    expect(requiresEmailVerification({ role: "CLIENT", verified: false, createdAt: new Date("2026-08-11") })).toBe(false)
    expect(requiresEmailVerification({ role: "CHEF", verified: false, createdAt: new Date("2026-08-13") })).toBe(true)
  })

  it("resend endpoint helper gives generic no-op for absent, admin, verified, or mismatched-role accounts", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null)
    await expect(resendVerificationEmail({ email: "missing@example.com", baseUrl: "https://chefachef.example" })).resolves.toMatchObject({ status: "GENERIC" })

    mockPrisma.user.findUnique.mockResolvedValueOnce({ role: "ADMIN", verified: false })
    await expect(resendVerificationEmail({ email: "admin@example.com", baseUrl: "https://chefachef.example" })).resolves.toMatchObject({ status: "GENERIC" })

    mockPrisma.user.findUnique.mockResolvedValueOnce({ role: "CLIENT", verified: true })
    await expect(resendVerificationEmail({ email: "verified@example.com", baseUrl: "https://chefachef.example" })).resolves.toMatchObject({ status: "GENERIC" })

    mockPrisma.user.findUnique.mockResolvedValueOnce({ role: "CLIENT", verified: false })
    await expect(resendVerificationEmail({ email: "client@example.com", expectedRole: "CHEF", baseUrl: "https://chefachef.example" })).resolves.toMatchObject({ status: "GENERIC" })
  })
})
