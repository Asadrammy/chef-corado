import { MENU_IMAGE_ALLOWED_TYPES, MENU_IMAGE_MAX_BYTES } from "@/lib/menu-image-storage"

export const USER_PROFILE_PHOTO_ROUTE_PREFIX = "/api/user/profile-photo"

export type StoredUserProfilePhoto = {
  data: Buffer
  contentType: typeof MENU_IMAGE_ALLOWED_TYPES[number]
}

export function userProfilePhotoUrl(userId: string, version = Date.now()) {
  return `${USER_PROFILE_PHOTO_ROUTE_PREFIX}/${encodeURIComponent(userId)}?v=${version}`
}

export async function fileToUserProfileImageData(file: File) {
  if (!MENU_IMAGE_ALLOWED_TYPES.includes(file.type as typeof MENU_IMAGE_ALLOWED_TYPES[number])) {
    throw new Error("INVALID_IMAGE_TYPE")
  }

  if (file.size > MENU_IMAGE_MAX_BYTES) {
    throw new Error("IMAGE_TOO_LARGE")
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  return `data:${file.type};base64,${bytes.toString("base64")}`
}

export function parseUserProfileImageData(value?: string | null): StoredUserProfilePhoto | null {
  if (!value) return null

  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/)
  if (!match) return null

  try {
    return {
      contentType: match[1] as StoredUserProfilePhoto["contentType"],
      data: Buffer.from(match[2], "base64"),
    }
  } catch {
    return null
  }
}
