const { PrismaClient } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")
const bcrypt = require("bcrypt")

function getDatabaseUrl() {
  return process.env.DATABASE_PUBLIC_URL || process.env.EXTERNAL_DATABASE_URL || process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL
}

function getAdapterConfig(connectionString) {
  const url = new URL(connectionString)
  url.searchParams.delete("connection_limit")
  url.searchParams.delete("pool_timeout")
  url.searchParams.delete("connect_timeout")
  url.searchParams.delete("sslmode")

  return {
    connectionString: url.toString(),
    max: 2,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
    keepAlive: true,
    ssl: {
      rejectUnauthorized: false,
    },
  }
}

const databaseUrl = getDatabaseUrl()
const prisma = databaseUrl
  ? new PrismaClient({
      adapter: new PrismaPg(getAdapterConfig(databaseUrl)),
      transactionOptions: { maxWait: 15000, timeout: 30000 },
    })
  : new PrismaClient()

function getArg(name) {
  const prefix = `--${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)

  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0) return process.argv[index + 1]
  return undefined
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase()
}

function getSafeEnvironmentIdentifier() {
  const identifier = {
    nodeEnv: process.env.NODE_ENV || "unset",
    database: "unavailable",
    databaseHost: "unavailable",
    nextAuthHost: "unset",
  }

  try {
    if (databaseUrl) {
      const url = new URL(databaseUrl)
      identifier.databaseHost = url.hostname
      identifier.database = url.pathname.replace(/^\//, "") || "unnamed"
    }
  } catch {
    identifier.database = "invalid-url"
    identifier.databaseHost = "invalid-url"
  }

  try {
    if (process.env.NEXTAUTH_URL) {
      identifier.nextAuthHost = new URL(process.env.NEXTAUTH_URL).hostname
    }
  } catch {
    identifier.nextAuthHost = "invalid-url"
  }

  return identifier
}

async function main() {
  const email = normalizeEmail(getArg("email") || process.env.AUTH_DIAGNOSTIC_EMAIL)
  const passwordToCheck = getArg("password") || process.env.AUTH_DIAGNOSTIC_PASSWORD
  if (!email) {
    throw new Error("Usage: node scripts/staging-auth-diagnostic.cjs --email user@example.com")
  }

  const matches = await prisma.user.findMany({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      email: true,
      role: true,
      verified: true,
      isBanned: true,
      password: true,
      createdAt: true,
      chefProfile: {
        select: {
          id: true,
          isApproved: true,
          isBanned: true,
          verified: true,
          verificationStatus: true,
          rightToWorkUkConfirmed: true,
          foodHygieneLevel2Confirmed: true,
          foodHygieneCertificateUrl: true,
          foodHygieneCertificateReviewStatus: true,
          latitude: true,
          longitude: true,
          radius: true,
          baseCountryCode: true,
          preferredCurrency: true,
        },
      },
      _count: {
        select: {
          requests: true,
          bookings: true,
        },
      },
    },
  })

  const normalizedMatches = matches.filter((user) => normalizeEmail(user.email) === email)
  const user = normalizedMatches[0] || null

  const report = {
    email,
    environment: getSafeEnvironmentIdentifier(),
    userExists: Boolean(user),
    normalizedEmailMatch: Boolean(user && normalizeEmail(user.email) === email),
    duplicateNormalizedEmailCount: normalizedMatches.length,
    role: user?.role || null,
    verified: user?.verified ?? null,
    banned: user?.isBanned ?? null,
    passwordHashPresent: Boolean(user?.password),
    passwordMatches: user && passwordToCheck ? await bcrypt.compare(passwordToCheck, user.password) : null,
    chefProfile: user?.chefProfile
      ? {
          exists: true,
          isApproved: user.chefProfile.isApproved,
          banned: user.chefProfile.isBanned,
          verified: user.chefProfile.verified,
          verificationStatus: user.chefProfile.verificationStatus,
          complianceReady:
            user.chefProfile.rightToWorkUkConfirmed &&
            user.chefProfile.foodHygieneLevel2Confirmed &&
            Boolean(user.chefProfile.foodHygieneCertificateUrl) &&
            user.chefProfile.foodHygieneCertificateReviewStatus === "APPROVED",
          coordinatesPresent: user.chefProfile.latitude != null && user.chefProfile.longitude != null,
          radiusKm: user.chefProfile.radius,
          market: user.chefProfile.baseCountryCode,
          currency: user.chefProfile.preferredCurrency,
        }
      : { exists: false },
    clientProfile: {
      exists: user?.role === "CLIENT" || false,
      model: "User role CLIENT; no separate ClientProfile model in current Prisma schema",
      requestCount: user?._count.requests ?? null,
      bookingCount: user?._count.bookings ?? null,
    },
  }

  console.log(JSON.stringify(report, null, 2))
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
