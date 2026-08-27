import { prisma } from "@/lib/prisma"

type UserColumnAvailability = {
  firstName: boolean
  surname: boolean
  username: boolean
  bio: boolean
  phone: boolean
  website: boolean
  socialProfile: boolean
  profileCompletion: boolean
}

let cachedAvailability: UserColumnAvailability | null = null

async function hasUserColumn(columnName: string) {
  if (typeof prisma.$queryRaw !== "function") {
    return false
  }

  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'User'
        AND column_name = ${columnName}
    ) AS "exists"
  `

  return Boolean(rows[0]?.exists)
}

export async function getUserProfileColumnAvailability(): Promise<UserColumnAvailability> {
  if (cachedAvailability) {
    return cachedAvailability
  }

  const entries = await Promise.all(
    ([
      "firstName",
      "surname",
      "username",
      "bio",
      "phone",
      "website",
      "socialProfile",
      "profileCompletion",
    ] as const).map(async (column) => [column, await hasUserColumn(column)] as const)
  )

  cachedAvailability = Object.fromEntries(entries) as UserColumnAvailability
  return cachedAvailability
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/)
  return {
    firstName: parts[0] ?? null,
    surname: parts.slice(1).join(" ") || null,
  }
}

export async function buildUserProfileSelect() {
  const availability = await getUserProfileColumnAvailability()

  const select: Record<string, true> = {
    name: true,
    email: true,
  }

  if (availability.username) select.username = true
  if (availability.bio) select.bio = true
  if (availability.phone) select.phone = true
  if (availability.website) select.website = true
  if (availability.socialProfile) select.socialProfile = true
  if (availability.profileCompletion) select.profileCompletion = true

  return select
}

export async function buildUserProfileUpdateData(input: {
  name: string
  username?: string | null
  bio?: string | null
  phone?: string | null
  website?: string | null
  socialProfile?: string | null
}) {
  const availability = await getUserProfileColumnAvailability()
  const nameParts = splitName(input.name)

  const data: Record<string, unknown> = {
    name: input.name,
  }

  if (availability.firstName) {
    data.firstName = nameParts.firstName
  }

  if (availability.surname) {
    data.surname = nameParts.surname
  }

  if (availability.username) {
    data.username = input.username ?? null
  }

  if (availability.bio) {
    data.bio = input.bio ?? null
  }

  if (availability.phone) {
    data.phone = input.phone ?? null
  }

  if (availability.website) {
    data.website = input.website ?? null
  }

  if (availability.socialProfile) {
    data.socialProfile = input.socialProfile ?? null
  }

  return data
}
