/// <reference types="jest" />

import { Role } from "@/types"

const findUnique = jest.fn(async () => {
  throw new Error("Can't reach database server at example.invalid:5432")
})

jest.mock("@next-auth/prisma-adapter", () => ({
  PrismaAdapter: jest.fn(() => ({})),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique,
    },
  },
  isPrismaConnectionError: (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    return message.includes("Can't reach database server")
  },
  withPrismaReconnect: async (operation: () => Promise<unknown>) => operation(),
}))

describe("local demo auth session fallback", () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      configurable: true,
    })
  })

  afterAll(() => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalNodeEnv,
      configurable: true,
    })
  })

  it("keeps the existing token role when the session refresh has no user and the database is unavailable", async () => {
    const { authOptions } = await import("@/lib/auth")
    const jwt = authOptions.callbacks?.jwt

    await expect(
      jwt?.({
        token: {
          sub: "cmph911b10001byd5xgn4e5o1",
          role: Role.CHEF,
        },
        user: undefined as any,
        account: null,
        profile: undefined,
        trigger: undefined,
        isNewUser: false,
        session: undefined,
      })
    ).resolves.toMatchObject({
      role: Role.CHEF,
    })
  })

  it("does not treat an arbitrary missing database user as a local demo session", async () => {
    const { getLocalDemoSessionRecord } = await import("@/lib/auth")

    expect(getLocalDemoSessionRecord("missing-db-user", "unknown@example.com", Role.CLIENT)).toBeNull()
  })
})
