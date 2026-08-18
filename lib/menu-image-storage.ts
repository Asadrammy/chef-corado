import { z } from "zod"

export const MENU_IMAGE_UPLOAD_PUBLIC_PREFIX = "/uploads/images/"
export const MENU_IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
export const MENU_IMAGE_MAX_BYTES = 5 * 1024 * 1024

const localUploadPattern = /^\/uploads\/images\/[a-zA-Z0-9._-]+\.(jpe?g|png|webp)$/i
export const IMAGE_STORAGE_PROVIDERS = ["local-public", "cloudinary"] as const
export type ImageStorageProvider = typeof IMAGE_STORAGE_PROVIDERS[number]

export function getImageStorageProvider(): ImageStorageProvider {
  const configured = (process.env.IMAGE_STORAGE_PROVIDER || process.env.UPLOAD_STORAGE_PROVIDER || "").trim().toLowerCase()
  if (configured === "cloudinary") return "cloudinary"
  if (configured === "local-public") return "local-public"

  if (configured) {
    return "local-public"
  }

  return process.env.NODE_ENV === "production" ? "cloudinary" : "local-public"
}

export function isCloudinaryImageStorageConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

export function isAppLocalMenuImageReference(value: string) {
  return localUploadPattern.test(value)
}

export function isHttpMenuImageReference(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:"
  } catch {
    return false
  }
}

export function isValidMenuImageReference(value: string) {
  return isAppLocalMenuImageReference(value) || isHttpMenuImageReference(value)
}

export const menuImageReferenceSchema = z.string()
  .trim()
  .refine(
    isValidMenuImageReference,
    "Menu image must be a ChefaChef upload path or a valid HTTPS image URL"
  )

export const imageReferenceSchema = menuImageReferenceSchema

export function normalizeMenuImageReference(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function getMenuImageStorageStatus() {
  const provider = getImageStorageProvider()
  const configuredDurableProvider = provider !== "local-public"
  const cloudinaryReady = provider === "cloudinary" && isCloudinaryImageStorageConfigured()

  return {
    provider,
    durable: configuredDurableProvider && cloudinaryReady,
    publicPrefix: MENU_IMAGE_UPLOAD_PUBLIC_PREFIX,
    configurationRequired:
      process.env.NODE_ENV === "production"
        ? !configuredDurableProvider || !cloudinaryReady
        : configuredDurableProvider && !cloudinaryReady,
  } as const
}
