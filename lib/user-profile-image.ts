import { prisma } from "@/lib/prisma"

type UserImageRow = {
  image: string | null
}

let userImageColumnAvailable: boolean | null = null

function isUserImageColumnUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  return (
    message.includes("Unknown field `image`") ||
    message.includes("column \"image\" does not exist") ||
    message.includes("column User.image does not exist")
  )
}

export async function hasUserImageColumn() {
  if (userImageColumnAvailable !== null) {
    return userImageColumnAvailable
  }

  try {
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'User'
          AND column_name = 'image'
      ) AS "exists"
    `
    const exists = Boolean(rows[0]?.exists)
    if (exists) {
      userImageColumnAvailable = true
    }
    return exists
  } catch (error) {
    if (isUserImageColumnUnavailable(error)) {
      return false
    }

    throw error
  }
}

async function readUserImage(query: () => Promise<UserImageRow[]>) {
  try {
    if (!(await hasUserImageColumn())) {
      return null
    }

    const rows = await query()
    return rows[0]?.image ?? null
  } catch (error) {
    if (isUserImageColumnUnavailable(error)) {
      return null
    }

    throw error
  }
}

export async function getUserImageById(userId: string) {
  return readUserImage(() => prisma.$queryRaw<UserImageRow[]>`
    SELECT "image"
    FROM "User"
    WHERE "id" = ${userId}
    LIMIT 1
  `)
}

export async function getUserImageByEmail(email: string) {
  return readUserImage(() => prisma.$queryRaw<UserImageRow[]>`
    SELECT "image"
    FROM "User"
    WHERE "email" = ${email}
    LIMIT 1
  `)
}
