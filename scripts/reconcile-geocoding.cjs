#!/usr/bin/env node

require("dotenv").config()

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

const executeMode = process.argv.includes("--execute")
const legacyWriteMode = process.argv.includes("--write")
const ownerApproved = process.argv.includes("--owner-approved")
const allowApproximate = process.argv.includes("--allow-approximate")
const writeMode = executeMode || legacyWriteMode
const target = process.argv.find((arg) => arg.startsWith("--target="))?.split("=")[1] ?? "all"
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1]
const limit = Number.isFinite(Number(limitArg)) && Number(limitArg) > 0 ? Math.floor(Number(limitArg)) : 50
const googleApiKey = process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_MAPS_API_KEY

const cityFallbacks = [
  { pattern: /\blondon\b/i, latitude: 51.5074, longitude: -0.1278, city: "London", region: "England" },
  { pattern: /\bwestminster\b/i, latitude: 51.4975, longitude: -0.1357, city: "London", region: "England" },
  { pattern: /\bmanchester\b/i, latitude: 53.4808, longitude: -2.2426, city: "Manchester", region: "England" },
  { pattern: /\bbirmingham\b/i, latitude: 52.4862, longitude: -1.8904, city: "Birmingham", region: "England" },
  { pattern: /\bleeds\b/i, latitude: 53.8008, longitude: -1.5491, city: "Leeds", region: "England" },
  { pattern: /\bliverpool\b/i, latitude: 53.4084, longitude: -2.9916, city: "Liverpool", region: "England" },
  { pattern: /\bbristol\b/i, latitude: 51.4545, longitude: -2.5879, city: "Bristol", region: "England" },
  { pattern: /\bnottingham\b/i, latitude: 52.9548, longitude: -1.1581, city: "Nottingham", region: "England" },
]

function fallbackFor(location, countryCode) {
  const country = String(countryCode ?? "").toUpperCase()
  if (country && country !== "GB" && country !== "UK") return null
  const text = String(location ?? "")
  if (!text.trim()) return null

  const match = cityFallbacks.find((item) => item.pattern.test(text))
  if (!match) return null

  return {
    latitude: match.latitude,
    longitude: match.longitude,
    locationCity: match.city,
    locationRegion: match.region,
    formattedAddress: text,
    geocodingProvider: "local-uk-fallback",
    geocodingStatus: "APPROXIMATE",
  }
}

async function geocodeWithGoogle(location, countryCode) {
  if (!googleApiKey) return null
  const text = String(location ?? "").trim()
  if (!text) return null

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json")
  url.searchParams.set("address", text)
  if (countryCode) {
    url.searchParams.set("components", `country:${String(countryCode).toUpperCase() === "UK" ? "GB" : countryCode}`)
  }
  url.searchParams.set("key", googleApiKey)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`GOOGLE_GEOCODING_HTTP_${response.status}`)
  }
  const payload = await response.json()
  const result = payload.results?.[0]
  const locationData = result?.geometry?.location
  if (!locationData || typeof locationData.lat !== "number" || typeof locationData.lng !== "number") {
    return null
  }

  return {
    latitude: locationData.lat,
    longitude: locationData.lng,
    locationCity: result.address_components?.find((item) => item.types?.includes("postal_town") || item.types?.includes("locality"))?.long_name ?? null,
    locationRegion: result.address_components?.find((item) => item.types?.includes("administrative_area_level_1"))?.long_name ?? null,
    formattedAddress: result.formatted_address ?? text,
    geocodingProvider: "google",
    geocodingStatus: result.geometry?.location_type === "ROOFTOP" ? "ROOFTOP" : "APPROXIMATE",
  }
}

async function resolveCoordinates(location, countryCode) {
  const google = await geocodeWithGoogle(location, countryCode)
  if (google) return google
  return fallbackFor(location, countryCode)
}

function canWriteResult(result) {
  if (!result) return false
  if (result.geocodingProvider === "google") return true
  return allowApproximate && process.env.NODE_ENV !== "production"
}

async function reconcileChefProfiles() {
  const rows = await prisma.chefProfile.findMany({
    where: {
      OR: [
        { latitude: null },
        { longitude: null },
        { geocodingStatus: { in: ["UNAVAILABLE", "UNVERIFIED"] } },
      ],
      location: { not: null },
    },
    select: { id: true, userId: true, location: true, baseCountryCode: true },
    take: limit,
    orderBy: { updatedAt: "desc" },
  })

  const reconciled = []
  for (const row of rows) {
    const coordinates = await resolveCoordinates(row.location, row.baseCountryCode)
    if (!coordinates) continue
    reconciled.push({ model: "ChefProfile", id: row.id, userId: row.userId, provider: coordinates.geocodingProvider, status: coordinates.geocodingStatus, city: coordinates.locationCity, writeEligible: canWriteResult(coordinates) })
    if (writeMode) {
      if (!canWriteResult(coordinates)) throw new Error(`Refusing approximate production geocoding write for ChefProfile ${row.id}`)
      await prisma.chefProfile.update({ where: { id: row.id }, data: coordinates })
    }
  }

  return reconciled
}

async function reconcileRequests() {
  const rows = await prisma.request.findMany({
    where: {
      OR: [
        { latitude: null },
        { longitude: null },
        { geocodingStatus: { in: ["UNAVAILABLE", "UNVERIFIED"] } },
      ],
    },
    select: { id: true, clientId: true, location: true, countryCode: true },
    take: limit,
    orderBy: { createdAt: "desc" },
  })

  const reconciled = []
  for (const row of rows) {
    const coordinates = await resolveCoordinates(row.location, row.countryCode)
    if (!coordinates) continue
    reconciled.push({ model: "Request", id: row.id, clientId: row.clientId, provider: coordinates.geocodingProvider, status: coordinates.geocodingStatus, city: coordinates.locationCity, writeEligible: canWriteResult(coordinates) })
    if (writeMode) {
      if (!canWriteResult(coordinates)) throw new Error(`Refusing approximate production geocoding write for Request ${row.id}`)
      await prisma.request.update({ where: { id: row.id }, data: coordinates })
    }
  }

  return reconciled
}

async function main() {
  if (writeMode && !ownerApproved) {
    throw new Error("Refusing geocoding writes without --owner-approved. Run dry-run first, then use --execute --owner-approved only after approval.")
  }
  if (process.env.NODE_ENV === "production" && writeMode && process.env.ALLOW_PRODUCTION_GEOCODING_RECONCILE !== "true") {
    throw new Error("Refusing production write without ALLOW_PRODUCTION_GEOCODING_RECONCILE=true")
  }

  const results = []
  if (target === "all" || target === "chefs") results.push(...await reconcileChefProfiles())
  if (target === "all" || target === "requests") results.push(...await reconcileRequests())

  console.log(JSON.stringify({
    mode: writeMode ? "write" : "dry-run",
    target,
    provider: googleApiKey ? "google" : "local-uk-fallback-dry-run",
    count: results.length,
    results,
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
