import { mkdir, readFile, unlink, writeFile } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

import { cloudinary } from "@/lib/cloudinary"

const localCertificateDir = () => path.join(process.cwd(), "private", "uploads", "certificates")
const certificatePrefix = process.env.AWS_S3_CERTIFICATE_PREFIX || "private/certificates"

type CertificateStorageUploadInput = {
  ownerId: string
  bytes: Buffer
  contentType: string
  extension: string
  originalName: string
}

type StoredCloudinaryReference = {
  storage: "cloudinary"
  publicId: string
  resourceType: "raw" | "image"
  format?: string
  contentType: string
  originalName: string
}

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

function safeOriginalName(name: string) {
  return name.replace(/[^\w.\- ]+/g, "").replace(/\s+/g, " ").trim().slice(0, 120) || "certificate"
}

function encodeReference(reference: StoredCloudinaryReference) {
  return `cloudinary_${Buffer.from(JSON.stringify(reference), "utf8").toString("base64url")}`
}

function decodeCloudinaryReference(value: string): StoredCloudinaryReference | null {
  if (!value.startsWith("cloudinary_")) return null

  try {
    return JSON.parse(Buffer.from(value.replace(/^cloudinary_/, ""), "base64url").toString("utf8"))
  } catch {
    return null
  }
}

function publicRouteForReference(reference: string) {
  return `/api/chef/certificates/${encodeURIComponent(reference)}`
}

async function uploadToCloudinary(input: CertificateStorageUploadInput) {
  const resourceType = input.contentType === "application/pdf" ? "raw" : "image"
  const publicId = `${certificatePrefix}/${input.ownerId}/${randomUUID()}`

  const result = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        type: "authenticated",
        public_id: publicId,
        overwrite: false,
        filename_override: safeOriginalName(input.originalName),
        use_filename: false,
      },
      (error, uploadResult) => {
        if (error) reject(error)
        else resolve(uploadResult)
      }
    )

    stream.end(input.bytes)
  })

  const reference = encodeReference({
    storage: "cloudinary",
    publicId: result.public_id,
    resourceType,
    format: result.format || input.extension,
    contentType: input.contentType,
    originalName: safeOriginalName(input.originalName),
  })

  return {
    reference,
    url: publicRouteForReference(reference),
    provider: "cloudinary",
  }
}

async function uploadToLocalPrivateStorage(input: CertificateStorageUploadInput) {
  const uploadDirectory = localCertificateDir()
  const reference = `${input.ownerId}-${randomUUID()}.${input.extension}`
  const filePath = path.join(uploadDirectory, reference)

  await mkdir(uploadDirectory, { recursive: true })
  await writeFile(filePath, input.bytes)

  return {
    reference,
    url: publicRouteForReference(reference),
    provider: "local",
  }
}

export async function uploadCertificate(input: CertificateStorageUploadInput) {
  if (isCloudinaryConfigured()) {
    return uploadToCloudinary(input)
  }

  return uploadToLocalPrivateStorage(input)
}

export async function readCertificateReference(reference: string) {
  const cloudinaryReference = decodeCloudinaryReference(reference)
  if (cloudinaryReference) {
    const expiresAt = Math.floor(Date.now() / 1000) + 60
    const format = cloudinaryReference.format ?? ""
    const url = cloudinary.utils.private_download_url(
      cloudinaryReference.publicId,
      format,
      {
        resource_type: cloudinaryReference.resourceType,
        type: "authenticated",
        expires_at: expiresAt,
      }
    )

    return {
      redirectUrl: String(url),
      contentType: cloudinaryReference.contentType,
      originalName: cloudinaryReference.originalName,
    }
  }

  if (reference.includes("..") || reference.includes("/") || reference.includes("\\")) {
    throw new Error("INVALID_CERTIFICATE_REFERENCE")
  }

  const filePath = path.join(localCertificateDir(), reference)
  const file = await readFile(filePath)
  const extension = reference.split(".").pop()?.toLowerCase() ?? "pdf"
  const contentTypes: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  }

  return {
    file,
    contentType: contentTypes[extension] ?? "application/octet-stream",
    originalName: reference,
  }
}

export async function deleteCertificateReference(referenceOrUrl?: string | null) {
  if (!referenceOrUrl) return

  const reference = referenceOrUrl.split("/").pop()
  if (!reference) return

  const cloudinaryReference = decodeCloudinaryReference(decodeURIComponent(reference))
  if (cloudinaryReference) {
    await cloudinary.uploader.destroy(cloudinaryReference.publicId, {
      resource_type: cloudinaryReference.resourceType,
      type: "authenticated",
    })
    return
  }

  if (reference.includes("..") || reference.includes("/") || reference.includes("\\")) {
    return
  }

  try {
    await unlink(path.join(localCertificateDir(), reference))
  } catch {
    // Old local certificates may already be missing after deployment migration.
  }
}
