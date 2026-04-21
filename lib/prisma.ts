import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// Handle connection errors in production
if (process.env.NODE_ENV === "production") {
  prisma.$connect().catch((error) => {
    console.error("Failed to connect to database:", error)
  })

  // Graceful shutdown
  process.on("beforeExit", async () => {
    await prisma.$disconnect()
  })
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
