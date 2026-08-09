import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"

import { requireAdminPermission } from "@/lib/admin-rbac"
import { handleApiError } from "@/lib/error-handler"

export async function POST(request: NextRequest) {
  try {
    await requireAdminPermission("serviceAssets.manage")
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 })
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed." }, { status: 400 })
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const extension = file.name.split(".").pop()?.toLowerCase() || "bin"
    const uploadDirectory = path.join(process.cwd(), "public", "uploads", "admin-service-assets")
    const fileName = `${randomUUID()}.${extension}`
    const filePath = path.join(uploadDirectory, fileName)

    await mkdir(uploadDirectory, { recursive: true })
    await writeFile(filePath, buffer)

    return NextResponse.json({
      url: `/uploads/admin-service-assets/${fileName}`,
      publicId: fileName,
    })
  } catch (error) {
    return handleApiError(error, "Admin Service Asset Upload POST")
  }
}
