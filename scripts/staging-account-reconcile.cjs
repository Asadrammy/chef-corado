const bcrypt = require("bcrypt")
const { PrismaClient } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")

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

function hasFlag(name) {
  return process.argv.includes(`--${name}`) || process.env[`STAGING_ACCOUNT_${name.replaceAll("-", "_").toUpperCase()}`] === "true"
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase()
}

function parseNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function safeHost(value) {
  try {
    return value ? new URL(value).hostname : ""
  } catch {
    return ""
  }
}

function assertStagingOnly() {
  if (process.env.ALLOW_STAGING_ACCOUNT_RECONCILIATION !== "true") {
    throw new Error("Refusing to modify accounts. Set ALLOW_STAGING_ACCOUNT_RECONCILIATION=true for staging-only use.")
  }

  const appEnv = String(process.env.APP_ENV || process.env.RENDER_ENV || process.env.NODE_ENV || "").toLowerCase()
  const nextAuthHost = safeHost(process.env.NEXTAUTH_URL).toLowerCase()
  const publicHost = safeHost(process.env.NEXT_PUBLIC_BASE_URL).toLowerCase()
  const stagingHost =
    appEnv === "staging" ||
    nextAuthHost.includes("staging") ||
    publicHost.includes("staging")

  if (!stagingHost) {
    throw new Error("Refusing to modify accounts because the environment is not identifiable as staging.")
  }

  if (nextAuthHost === "chefachef.co.uk" || publicHost === "chefachef.co.uk") {
    throw new Error("Refusing to modify accounts on the public production domain.")
  }
}

async function main() {
  assertStagingOnly()

  const email = normalizeEmail(getArg("email") || process.env.STAGING_ACCOUNT_EMAIL)
  const role = String(getArg("role") || process.env.STAGING_ACCOUNT_ROLE || "").toUpperCase()
  const password = getArg("password") || process.env.STAGING_ACCOUNT_PASSWORD
  const requestedName = getArg("name") || process.env.STAGING_ACCOUNT_NAME
  const execute = hasFlag("execute") || process.env.EXECUTE_STAGING_ACCOUNT_RECONCILIATION === "true"
  const createMissing = hasFlag("create-missing")
  const allowNameChange = hasFlag("allow-name-change")
  const allowRoleChange = hasFlag("allow-role-change")
  const repairChefProfile = hasFlag("repair-chef-profile")

  if (!email || !password || !["CHEF", "CLIENT"].includes(role)) {
    throw new Error("Usage: node scripts/staging-account-reconcile.cjs --email user@example.com --role CHEF|CLIENT --password <secret> [--execute] [--create-missing] [--allow-name-change --name Name] [--allow-role-change] [--repair-chef-profile]")
  }

  const matchingUsers = await prisma.user.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      surname: true,
      role: true,
      verified: true,
      isBanned: true,
      createdAt: true,
      updatedAt: true,
      chefProfile: { select: { id: true } },
    },
  })

  const normalizedMatches = matchingUsers.filter((user) => normalizeEmail(user.email) === email)
  if (normalizedMatches.length > 1) {
    throw new Error(`Ambiguous account repair refused. ${normalizedMatches.length} users share the normalized email.`)
  }

  const existingUser = normalizedMatches[0] || null
  const plannedActions = []
  if (!existingUser && !createMissing) {
    throw new Error("No existing user found. Creation refused unless --create-missing is provided after manual review.")
  }

  if (existingUser && existingUser.role !== role && !allowRoleChange) {
    throw new Error(`Existing user role is ${existingUser.role}. Role change to ${role} refused unless --allow-role-change is provided after manual review.`)
  }

  if (requestedName && existingUser?.name !== requestedName && !allowNameChange) {
    throw new Error("Name change refused. Authentication repair must preserve business identity unless --allow-name-change is provided after manual review.")
  }

  if (role === "CHEF" && existingUser && !existingUser.chefProfile && !repairChefProfile) {
    throw new Error("Existing chef user has no ChefProfile. Profile creation refused unless --repair-chef-profile is provided after manual review.")
  }

  plannedActions.push(existingUser ? "update-auth-fields" : "create-missing-user")
  if (requestedName && allowNameChange) plannedActions.push("update-name")
  if (existingUser?.role !== role && allowRoleChange) plannedActions.push("update-role")
  if (role === "CHEF" && (!existingUser?.chefProfile || repairChefProfile)) plannedActions.push("repair-chef-profile")

  if (!execute) {
    console.log(JSON.stringify({
      dryRun: true,
      email,
      existingUser: existingUser ? {
        id: existingUser.id,
        role: existingUser.role,
        name: existingUser.name,
        firstName: existingUser.firstName,
        surname: existingUser.surname,
        verified: existingUser.verified,
        isBanned: existingUser.isBanned,
        createdAt: existingUser.createdAt,
        updatedAt: existingUser.updatedAt,
        chefProfileId: existingUser.chefProfile?.id ?? null,
      } : null,
      plannedActions,
      executeRequired: "--execute or EXECUTE_STAGING_ACCOUNT_RECONCILIATION=true",
    }, null, 2))
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          ...(allowNameChange && requestedName ? { name: requestedName } : {}),
          ...(allowRoleChange ? { role } : {}),
          password: passwordHash,
          verified: true,
          isBanned: false,
          termsAcceptedAt: new Date(),
          termsVersion: process.env.CURRENT_TERMS_VERSION || "2026-04",
          acceptedVia: "staging-reconcile",
        },
        select: {
          id: true,
          email: true,
          role: true,
          chefProfile: { select: { id: true } },
        },
      })
    : await prisma.user.create({
        data: {
      email,
      name: requestedName || (role === "CHEF" ? "Simulation Chef" : "Simulation Client"),
      role,
      password: passwordHash,
      verified: true,
      isBanned: false,
      profileCompletion: role === "CHEF" ? 100 : 85,
      termsAcceptedAt: new Date(),
      termsVersion: process.env.CURRENT_TERMS_VERSION || "2026-04",
      acceptedVia: "staging-reconcile",
        },
        select: {
          id: true,
          email: true,
          role: true,
          chefProfile: { select: { id: true } },
        },
      })

  let chefProfileStatus = "not-applicable"
  if (role === "CHEF") {
    const latitude = parseNumber(process.env.STAGING_CHEF_LATITUDE, 51.5074)
    const longitude = parseNumber(process.env.STAGING_CHEF_LONGITUDE, -0.1278)
    const radius = parseNumber(process.env.STAGING_CHEF_RADIUS_KM, 50)
    const existingChefProfile = user.chefProfile
    if (!existingChefProfile && !repairChefProfile) {
      throw new Error("ChefProfile creation refused unless --repair-chef-profile is provided after manual review.")
    }

    const chefProfile = existingChefProfile
      ? await prisma.chefProfile.update({
          where: { id: existingChefProfile.id },
          data: {
            isApproved: true,
            isBanned: false,
            verified: true,
            verificationStatus: "APPROVED",
            rightToWorkUkConfirmed: true,
            foodHygieneLevel2Confirmed: true,
            ...(process.env.STAGING_CHEF_FOOD_HYGIENE_CERTIFICATE_URL ? {
              foodHygieneCertificateUrl: process.env.STAGING_CHEF_FOOD_HYGIENE_CERTIFICATE_URL,
              foodHygieneCertificateReviewStatus: "PENDING",
            } : {}),
            latitude,
            longitude,
            radius,
            location: process.env.STAGING_CHEF_LOCATION || "London, UK",
            baseCountryCode: process.env.STAGING_CHEF_COUNTRY || "GB",
            preferredCurrency: process.env.STAGING_CHEF_CURRENCY || "GBP",
          },
          select: { id: true },
        })
      : await prisma.chefProfile.create({
          data: {
            userId: user.id,
            isApproved: true,
            isBanned: false,
            verified: true,
            verificationStatus: "APPROVED",
            rightToWorkUkConfirmed: true,
            foodHygieneLevel2Confirmed: true,
            ...(process.env.STAGING_CHEF_FOOD_HYGIENE_CERTIFICATE_URL ? {
              foodHygieneCertificateUrl: process.env.STAGING_CHEF_FOOD_HYGIENE_CERTIFICATE_URL,
              foodHygieneCertificateReviewStatus: "PENDING",
            } : {}),
            latitude,
            longitude,
            radius,
            location: process.env.STAGING_CHEF_LOCATION || "London, UK",
            baseCountryCode: process.env.STAGING_CHEF_COUNTRY || "GB",
            preferredCurrency: process.env.STAGING_CHEF_CURRENCY || "GBP",
            profileCompletion: 100,
          },
          select: { id: true },
        })

    chefProfileStatus = chefProfile.id
  }

  console.log(JSON.stringify({
    reconciled: true,
    email,
    role: user.role,
    userId: user.id,
    passwordUpdated: true,
    chefProfile: chefProfileStatus,
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
