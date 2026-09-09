import { z } from "zod"

import { isValidMenuImageReference } from "@/lib/menu-image-storage"
import { USER_PROFILE_PHOTO_ROUTE_PREFIX } from "@/lib/user-profile-photo-storage"

const userProfilePhotoRoutePattern = new RegExp(
  `^${USER_PROFILE_PHOTO_ROUTE_PREFIX.replaceAll("/", "\\/")}\\/[A-Za-z0-9_-]+(?:\\?v=\\d+)?$`
)

export function isAppUserProfilePhotoReference(value: string) {
  return userProfilePhotoRoutePattern.test(value.trim())
}

export function isValidChefProfileImageReference(value: string) {
  const trimmed = value.trim()
  return isValidMenuImageReference(trimmed) || isAppUserProfilePhotoReference(trimmed)
}

export const chefProfileImageReferenceSchema = z.string()
  .trim()
  .refine(
    isValidChefProfileImageReference,
    "Profile image must be a ChefaChef upload path, saved profile photo, or a valid HTTPS image URL"
  )
