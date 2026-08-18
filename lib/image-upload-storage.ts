import { randomUUID } from "crypto"
import { mkdir, unlink, writeFile } from "fs/promises"
import path from "path"

import { cloudinary } from "@/lib/cloudinary"
import {
  MENU_IMAGE_ALLOWED_TYPES,
  MENU_IMAGE_MAX_BYTES,
  MENU_IMAGE_UPLOAD_PUBLIC_PREFIX,
  getMenuImageStorageStatus,
  isCloudinaryImageStorageConfigured,
} from "@/lib/menu-image-storage"

type UploadImageInput = {
  file: File
  ownerId: string
  purpose: "menu" | "profile" | "admin-service-asset"
}

type UploadImageResult = {
  url: string
  publicId: string
  storage: ReturnType<typeof getMenuImageStorageStatus>
}

function safeExtension(fileName: string, contentType: string) {
  const extension = fileName.split(".").pop()?.toLowerCase()
  if (extension && ["jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension
  }

  if (contentType === "image/jpeg") return "jpg"
  if (contentType === "image/png") return "png"
  if (contentType === "image/webp") return "webp"
  return "bin"
}

function safeOwnerSegment(ownerId: string) {
  return ownerId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80)
}

function safePurposeSegment(purpose: UploadImageInput["purpose"]) {
  return purpose.replace(/[^a-z0-9-]/gi, "-").toLowerCase()
}

async function uploadToCloudinary(input: UploadImageInput, bytes: Buffer, storageStatus: ReturnType<typeof getMenuImageStorageStatus>) {
  if (!isCloudinaryImageStorageConfigured()) {
    throw new Error("DURABLE_IMAGE_STORAGE_NOT_CONFIGURED")
  }

  const safePurpose = safePurposeSegment(input.purpose)
  const ownerSegment = safeOwnerSegment(input.ownerId)
  const publicId = `chefachef/${safePurpose}/${ownerSegment}/${randomUUID()}`

  const result = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        public_id: publicId,
        overwrite: false,
        use_filename: false,
        folder: undefined,
      },
      (error, uploadResult) => {
        if (error) reject(error)
        else resolve(uploadResult)
      }
    )

    stream.end(bytes)
  })

  return {
    url: result.secure_url as string,
    publicId: result.public_id as string,
    storage: storageStatus,
  }
}

async function uploadToLocalPublicStorage(input: UploadImageInput, bytes: Buffer, storageStatus: ReturnType<typeof getMenuImageStorageStatus>) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("DURABLE_IMAGE_STORAGE_NOT_CONFIGURED")
  }

  const extension = safeExtension(input.file.name, input.file.type)
  const uploadDirectory = path.join(process.cwd(), "public", "uploads", "images")
  const safePurpose = safePurposeSegment(input.purpose)
  const ownerSegment = safeOwnerSegment(input.ownerId)
  const fileName = `${safePurpose}-${ownerSegment}-${randomUUID()}.${extension}`
  const filePath = path.join(uploadDirectory, fileName)

  await mkdir(uploadDirectory, { recursive: true })
  await writeFile(filePath, bytes)

  return {
    url: `${MENU_IMAGE_UPLOAD_PUBLIC_PREFIX}${fileName}`,
    publicId: fileName,
    storage: storageStatus,
  }
}

export async function uploadImageFile({ file, ownerId, purpose }: UploadImageInput): Promise<UploadImageResult> {
  if (!MENU_IMAGE_ALLOWED_TYPES.includes(file.type as typeof MENU_IMAGE_ALLOWED_TYPES[number])) {
    throw new Error("INVALID_IMAGE_TYPE")
  }

  if (file.size > MENU_IMAGE_MAX_BYTES) {
    throw new Error("IMAGE_TOO_LARGE")
  }

  const storageStatus = getMenuImageStorageStatus()
  if (storageStatus.configurationRequired) {
    throw new Error("DURABLE_IMAGE_STORAGE_NOT_CONFIGURED")
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  if (storageStatus.provider === "cloudinary") {
    return uploadToCloudinary({ file, ownerId, purpose }, buffer, storageStatus)
  }

  return uploadToLocalPublicStorage({ file, ownerId, purpose }, buffer, storageStatus)
}

export async function deleteUploadedImage(publicId: string, storage?: ReturnType<typeof getMenuImageStorageStatus>) {
  const storageStatus = storage ?? getMenuImageStorageStatus()
  if (!publicId) return false

  if (storageStatus.provider === "cloudinary") {
    if (!isCloudinaryImageStorageConfigured()) {
      throw new Error("DURABLE_IMAGE_STORAGE_NOT_CONFIGURED")
    }
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" })
    return true
  }

  if (!publicId.match(/^[a-z0-9._-]+\.(jpe?g|png|webp)$/i)) {
    throw new Error("INVALID_IMAGE_REFERENCE")
  }

  const uploadDirectory = path.join(process.cwd(), "public", "uploads", "images")
  const filePath = path.join(uploadDirectory, publicId)
  const relative = path.relative(uploadDirectory, filePath)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("INVALID_IMAGE_REFERENCE")
  }

  try {
    await unlink(filePath)
    return true
  } catch {
    return false
  }
}
