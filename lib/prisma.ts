import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

const normalizeDatabaseUrl = (url?: string) => {
  if (!url) {
    return url
  }

  const trimmedUrl = url.trim()

  if (
    (trimmedUrl.startsWith('"') && trimmedUrl.endsWith('"')) ||
    (trimmedUrl.startsWith("'") && trimmedUrl.endsWith("'"))
  ) {
    return trimmedUrl.slice(1, -1).trim()
  }

  return trimmedUrl
}

const isValidDatabaseUrl = (url?: string) => Boolean(normalizeDatabaseUrl(url) && /^(postgresql|postgres):\/\//.test(normalizeDatabaseUrl(url) as string))

const getDatabaseUrl = () => {
  const url = normalizeDatabaseUrl(process.env.DATABASE_URL)
  if (!url) return url

  if (!isValidDatabaseUrl(url)) {
    return url
  }

  if (process.env.NODE_ENV === "production" && !url.includes("connection_limit")) {
    const separator = url.includes("?") ? "&" : "?"
    return `${url}${separator}connection_limit=10&pool_timeout=20&connect_timeout=10`
  }
  return url
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

const shouldAttemptInitialConnection =
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  isValidDatabaseUrl(process.env.DATABASE_URL)

if (process.env.NODE_ENV === "production" && !isValidDatabaseUrl(process.env.DATABASE_URL)) {
  console.error("Invalid DATABASE_URL. Expected a value starting with postgresql:// or postgres://")
}

if (shouldAttemptInitialConnection) {
  const connectWithRetry = async (retries = 5, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
      try {
        await prisma.$connect()
        console.log("Successfully connected to database")
        return
      } catch (error) {
        console.error(`Database connection attempt ${i + 1}/${retries} failed:`, error)
        if (i < retries - 1) {
          console.log(`Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          delay *= 2 // Exponential backoff
        } else {
          console.error("Failed to connect to database after all retries:", error)
          throw error
        }
      }
    }
  }

  connectWithRetry().catch((error) => {
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
