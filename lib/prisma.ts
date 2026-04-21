import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL
  if (!url) return url

  // Add connection pool parameters for Render/PgBouncer if not present
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
    // Connection pool settings for production
    ...(process.env.NODE_ENV === "production" && {
      connectionLimit: 10,
    }),
  })

// Handle connection errors in production with retry logic
if (process.env.NODE_ENV === "production") {
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
