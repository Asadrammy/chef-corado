import { prisma } from "@/lib/prisma"
import { isAppLocalMenuImageReference } from "@/lib/menu-image-storage"

type UserImageRow = {
  image: string | null
}

let userImageColumnAvailable: boolean | null = null
let userImageDataColumnAvailable: boolean | null = null

function isUserImageColumnUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  return (
    message.includes("Unknown field `image`") ||
    message.includes("column \"image\" does not exist") ||
    message.includes("column User.image does not exist")
  )
}

function isUserImageDataColumnUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  return (
    message.includes("Unknown field `imageData`") ||
    message.includes("column \"imageData\" does not exist") ||
    message.includes("column User.imageData does not exist")
  )
}

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

export async function hasUserImageColumn() {
  if (userImageColumnAvailable !== null) {
    return userImageColumnAvailable
  }

  try {
    const exists = await hasUserColumn("image")
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

export async function hasUserImageDataColumn() {
  if (userImageDataColumnAvailable !== null) {
    return userImageDataColumnAvailable
  }

  try {
    const exists = await hasUserColumn("imageData")
    if (exists) {
      userImageDataColumnAvailable = true
    }
    return exists
  } catch (error) {
    if (isUserImageDataColumnUnavailable(error)) {
      return false
    }

    throw error
  }
}

export async function hasUserProfileImageColumns() {
  const [hasImage, hasImageData] = await Promise.all([
    hasUserImageColumn(),
    hasUserImageDataColumn(),
  ])

  return hasImage && hasImageData
}

export async function ensureUserProfileImageColumns() {
  return hasUserProfileImageColumns()
}

async function readUserImage(query: () => Promise<UserImageRow[]>) {
  try {
    if (!(await hasUserImageColumn())) {
      return null
    }

    const rows = await query()
    const image = rows[0]?.image ?? null
    if (process.env.NODE_ENV === "production" && image && isAppLocalMenuImageReference(image)) {
      return null
    }

    return image
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
