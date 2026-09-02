const mockUserFindUnique = jest.fn()
const mockCompare = jest.fn()
const mockRequiresEmailVerification = jest.fn(({ verified }: { verified: boolean }) => !verified)

jest.mock("bcrypt", () => ({
  compare: (...args: unknown[]) => mockCompare(...args),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
  withPrismaReconnect: (operation: () => Promise<unknown>) => operation(),
  isPrismaConnectionError: () => false,
}))

jest.mock("@next-auth/prisma-adapter", () => ({
  PrismaAdapter: jest.fn(() => ({})),
}))

jest.mock("@/lib/email-verification", () => ({
  requiresEmailVerification: (...args: unknown[]) => mockRequiresEmailVerification(...args as [{ verified: boolean }]),
}))

jest.mock("@/lib/user-profile-image", () => ({
  getUserImageByEmail: jest.fn().mockResolvedValue(null),
  getUserImageById: jest.fn().mockResolvedValue(null),
}))

import { authOptions } from "@/lib/auth"

function credentials(email: string, password = "correct-password", role?: string) {
  return { email, password, role } as any
}

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    name: "Simulation User",
    email: "simulation@example.com",
    password: "stored-hash",
    role: "CLIENT",
    isBanned: false,
    verified: true,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    ...overrides,
  } as any
}

async function authorize(input: any) {
  const provider = authOptions.providers[0] as any
  return provider.options.authorize(input)
}

describe("NextAuth credentials provider", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCompare.mockResolvedValue(true)
    mockRequiresEmailVerification.mockImplementation(({ verified }: { verified: boolean }) => !verified)
  })

  it("accepts a valid chef login for the chef role", async () => {
    mockUserFindUnique.mockResolvedValue(user({ id: "chef-user", email: "chef@example.com", role: "CHEF" }))

    await expect(authorize(credentials("CHEF@EXAMPLE.COM", "correct-password", "CHEF"))).resolves.toMatchObject({
      id: "chef-user",
      email: "chef@example.com",
      role: "CHEF",
    })
    expect(mockUserFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "chef@example.com" } }))
  })

  it("accepts a valid client login for the client role", async () => {
    mockUserFindUnique.mockResolvedValue(user({ id: "client-user", email: "client@example.com", role: "CLIENT" }))

    await expect(authorize(credentials("client@example.com", "correct-password", "CLIENT"))).resolves.toMatchObject({
      id: "client-user",
      email: "client@example.com",
      role: "CLIENT",
    })
  })

  it("rejects the wrong password", async () => {
    mockUserFindUnique.mockResolvedValue(user())
    mockCompare.mockResolvedValue(false)

    await expect(authorize(credentials("simulation@example.com", "wrong-password", "CLIENT"))).resolves.toBeNull()
  })

  it("rejects a role mismatch", async () => {
    mockUserFindUnique.mockResolvedValue(user({ role: "CLIENT" }))

    await expect(authorize(credentials("simulation@example.com", "correct-password", "CHEF"))).resolves.toBeNull()
  })

  it("throws for a banned account", async () => {
    mockUserFindUnique.mockResolvedValue(user({ isBanned: true }))

    await expect(authorize(credentials("simulation@example.com", "correct-password", "CLIENT"))).rejects.toThrow("ACCOUNT_BANNED")
  })

  it("throws for an unverified account when verification is required", async () => {
    mockUserFindUnique.mockResolvedValue(user({ verified: false }))

    await expect(authorize(credentials("simulation@example.com", "correct-password", "CLIENT"))).rejects.toThrow("EMAIL_NOT_VERIFIED")
  })

  it("returns null for a missing user", async () => {
    mockUserFindUnique.mockResolvedValue(null)

    await expect(authorize(credentials("missing@example.com", "correct-password", "CLIENT"))).resolves.toBeNull()
  })
})
