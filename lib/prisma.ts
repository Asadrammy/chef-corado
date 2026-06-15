import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
  prismaMiddlewareAttached?: boolean
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

const appendDatabaseParam = (url: string, key: string, value: string) => {
  if (url.includes(`${key}=`)) {
    return url
  }

  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}${key}=${value}`
}

const getDatabaseUrl = () => {
  let url = normalizeDatabaseUrl(process.env.DATABASE_URL)
  if (!url) return url

  if (!isValidDatabaseUrl(url)) {
    return url
  }

  url = appendDatabaseParam(url, "sslmode", "require")
  url = appendDatabaseParam(url, "connection_limit", process.env.NODE_ENV === "production" ? "10" : "5")
  url = appendDatabaseParam(url, "pool_timeout", "20")
  url = appendDatabaseParam(url, "connect_timeout", "10")

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

export const isPrismaConnectionError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)

  return [
    "Server has closed the connection",
    "Connection terminated unexpectedly",
    "Can't reach database server",
    "Timed out fetching a new connection",
    "the database system is starting up",
    "prepared statement",
    "Connection reset by peer",
    "ECONNRESET",
    "ETIMEDOUT",
    "P1017",
  ].some((pattern) => message.includes(pattern))
}

export async function withPrismaReconnect<T>(operation: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (!isPrismaConnectionError(error) || retries <= 0) {
      throw error
    }

    console.warn("Prisma connection was closed by the server. Resetting client connection and retrying operation once.")
    await prisma.$disconnect().catch(() => undefined)
    await new Promise((resolve) => setTimeout(resolve, 250))
    await prisma.$connect()

    return withPrismaReconnect(operation, retries - 1)
  }
}

if (!globalForPrisma.prismaMiddlewareAttached) {
  prisma.$use(async (params, next) => {
    try {
      return await next(params)
    } catch (error) {
      if (!isPrismaConnectionError(error)) {
        throw error
      }

      console.warn("Prisma connection was closed by the server. Reconnecting and retrying query once.")
      await prisma.$disconnect().catch(() => undefined)
      await new Promise((resolve) => setTimeout(resolve, 250))
      await prisma.$connect()
      return next(params)
    }
  })

  globalForPrisma.prismaMiddlewareAttached = true
}

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
