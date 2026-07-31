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

const setDatabaseParam = (url: string, key: string, value: string) => {
  if (url.includes(`${key}=`)) {
    return url.replace(new RegExp(`([?&])${key}=[^&]*`), `$1${key}=${value}`)
  }

  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}${key}=${value}`
}

const getConnectTimeoutSeconds = () => {
  const configured = Number(process.env.DATABASE_CONNECT_TIMEOUT_SECONDS)
  if (Number.isFinite(configured) && configured > 0) {
    return String(Math.min(configured, 30))
  }

  return process.env.NODE_ENV === "production" ? "10" : "3"
}

const getDatabaseUrl = () => {
  let url = normalizeDatabaseUrl(process.env.DATABASE_URL)
  if (!url) return url

  if (!isValidDatabaseUrl(url)) {
    return url
  }

  url = setDatabaseParam(url, "sslmode", "require")
  url = setDatabaseParam(url, "connection_limit", process.env.NODE_ENV === "production" ? "10" : "5")
  url = setDatabaseParam(url, "pool_timeout", process.env.NODE_ENV === "production" ? "20" : "5")
  url = setDatabaseParam(url, "connect_timeout", getConnectTimeoutSeconds())

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
    "Error opening a TLS connection",
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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const resetPrismaConnection = async (delayMs: number) => {
  await prisma.$disconnect().catch(() => undefined)
  await wait(delayMs)
}

export async function withPrismaReconnect<T>(operation: () => Promise<T>, retries = 1): Promise<T> {
  let attempt = 0

  while (true) {
    try {
      return await operation()
    } catch (error) {
      if (!isPrismaConnectionError(error) || attempt >= retries) {
        throw error
      }

      attempt += 1
      console.warn(`Prisma connection was closed by the server. Resetting connection and retrying operation (${attempt}/${retries}).`)
      await resetPrismaConnection(250 * attempt)
    }
  }
}

if (!globalForPrisma.prismaMiddlewareAttached) {
  prisma.$use(async (params, next) => {
    return next(params)
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
