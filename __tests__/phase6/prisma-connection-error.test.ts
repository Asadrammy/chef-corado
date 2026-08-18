import { isPrismaConnectionError } from "@/lib/prisma"

describe("Prisma connection/configuration error classification", () => {
  it("treats engineType client adapter failures as database configuration outages", () => {
    const error = new Error(
      "PrismaClientInitializationError: Missing configured driver adapter. Engine type `client` requires an active driver adapter. P2038"
    )

    expect(isPrismaConnectionError(error)).toBe(true)
  })
})
