import { NextRequest, NextResponse } from "next/server"

import { requireAdminPermission } from "@/lib/admin-rbac"
import { handleApiError } from "@/lib/error-handler"
import { uploadImageFile } from "@/lib/image-upload-storage"

export async function POST(request: NextRequest) {
  try {
    await requireAdminPermission("serviceAssets.manage")
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 })
    }

    const uploaded = await uploadImageFile({
      file,
      ownerId: "admin-service-assets",
      purpose: "admin-service-asset",
    })

    return NextResponse.json({
      url: uploaded.url,
      publicId: uploaded.publicId,
      storage: uploaded.storage,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_IMAGE_TYPE") {
        return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed." }, { status: 400 })
      }
      if (error.message === "IMAGE_TOO_LARGE") {
        return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 })
      }
      if (error.message === "DURABLE_IMAGE_STORAGE_NOT_CONFIGURED") {
        return NextResponse.json({ error: "Durable image storage is not configured." }, { status: 503 })
      }
    }

    return handleApiError(error, "Admin Service Asset Upload POST")
  }
}
