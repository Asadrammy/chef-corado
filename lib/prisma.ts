import { Prisma, PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

type PgPoolConfig = {
  connectionString: string
  max: number
  connectionTimeoutMillis: number
  idleTimeoutMillis: number
}

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

const getConfiguredDatabaseUrl = () =>
  normalizeDatabaseUrl(
    process.env.DATABASE_PUBLIC_URL ||
    process.env.DIRECT_DATABASE_URL ||
    process.env.DATABASE_URL
  )

const expandRenderPostgresHost = (databaseUrl: string) => {
  try {
    const url = new URL(databaseUrl)
    const region = process.env.RENDER_POSTGRES_REGION || process.env.DATABASE_RENDER_REGION || "singapore"

    if (url.hostname.startsWith("dpg-") && !url.hostname.includes(".")) {
      url.hostname = `${url.hostname}.${region}-postgres.render.com`
      if (!url.port) {
        url.port = "5432"
      }
      url.searchParams.set("sslmode", "require")
      return url.toString()
    }
  } catch {
    return databaseUrl
  }

  return databaseUrl
}

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
  let url = getConfiguredDatabaseUrl()
  if (!url) return url

  if (!isValidDatabaseUrl(url)) {
    return url
  }

  url = expandRenderPostgresHost(url)
  url = setDatabaseParam(url, "sslmode", "require")
  url = setDatabaseParam(url, "connection_limit", process.env.NODE_ENV === "production" ? "10" : "5")
  url = setDatabaseParam(url, "pool_timeout", process.env.NODE_ENV === "production" ? "20" : "5")
  url = setDatabaseParam(url, "connect_timeout", getConnectTimeoutSeconds())

  return url
}

const getDatabaseIntParam = (url: string, key: string, fallback: number, max: number) => {
  const value = Number(new URL(url).searchParams.get(key))
  if (Number.isFinite(value) && value > 0) {
    return Math.min(value, max)
  }

  return fallback
}

const getPgPoolConfig = (databaseUrl: string): PgPoolConfig => {
  const url = new URL(databaseUrl)
  const connectionLimit = getDatabaseIntParam(databaseUrl, "connection_limit", 5, 20)
  const poolTimeoutSeconds = getDatabaseIntParam(databaseUrl, "pool_timeout", 20, 60)
  const connectTimeoutSeconds = getDatabaseIntParam(databaseUrl, "connect_timeout", Number(getConnectTimeoutSeconds()), 30)

  // node-postgres does not understand Prisma engine-specific pool params.
  // Translate them into PoolConfig so the app keeps the same connection budget after engineType="client".
  url.searchParams.delete("connection_limit")
  url.searchParams.delete("pool_timeout")
  url.searchParams.delete("connect_timeout")
  url.searchParams.set("sslmode", "require")

  return {
    connectionString: url.toString(),
    max: connectionLimit,
    connectionTimeoutMillis: connectTimeoutSeconds * 1000,
    idleTimeoutMillis: poolTimeoutSeconds * 1000,
  }
}

const getPrismaLogConfig = (): Prisma.LogLevel[] => (process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"])

const createPrismaClient = () => {
  const databaseUrl = getDatabaseUrl()

  if (!isValidDatabaseUrl(databaseUrl)) {
    return new PrismaClient({
      log: getPrismaLogConfig(),
    })
  }

  const validDatabaseUrl = databaseUrl as string

  return new PrismaClient({
    adapter: new PrismaPg(getPgPoolConfig(validDatabaseUrl)),
    log: getPrismaLogConfig(),
  })
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient()

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

const shouldAttemptInitialConnection =
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  isValidDatabaseUrl(getConfiguredDatabaseUrl())

if (process.env.NODE_ENV === "production" && !isValidDatabaseUrl(getConfiguredDatabaseUrl())) {
  console.error("Invalid database URL. Expected DATABASE_PUBLIC_URL, DIRECT_DATABASE_URL, or DATABASE_URL to start with postgresql:// or postgres://")
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
