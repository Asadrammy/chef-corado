import { NextRequest, NextResponse } from "next/server"

import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { deleteCertificateReference, uploadCertificate } from "@/lib/certificate-storage"
import { prisma } from "@/lib/prisma"
import { Role } from "@/types"

const allowedTypes = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
])

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession(Role.CHEF)
    const userId = getSessionUserId(session)
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No certificate file provided" }, { status: 400 })
    }

    const extension = allowedTypes.get(file.type)
    if (!extension) {
      return NextResponse.json({ error: "Only PDF, JPEG, PNG, and WebP certificate files are allowed." }, { status: 400 })
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Certificate file is too large. Maximum size is 10MB." }, { status: 400 })
    }

    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId },
      select: { id: true, foodHygieneCertificateUrl: true },
    })

    if (!chefProfile) {
      return NextResponse.json({ error: "Chef profile not found" }, { status: 404 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const storedCertificate = await uploadCertificate({
      ownerId: userId,
      bytes: buffer,
      contentType: file.type,
      extension,
      originalName: file.name,
    })

    const updatedProfile = await prisma.chefProfile.update({
      where: { id: chefProfile.id },
      data: {
        foodHygieneCertificateUrl: storedCertificate.url,
        foodHygieneCertificateUploadedAt: new Date(),
        foodHygieneCertificateReviewedAt: null,
        foodHygieneCertificateReviewedBy: null,
        foodHygieneCertificateReviewStatus: "PENDING",
      },
      select: {
        foodHygieneCertificateUrl: true,
        foodHygieneCertificateUploadedAt: true,
        foodHygieneCertificateReviewStatus: true,
      },
    })

    await deleteCertificateReference(chefProfile.foodHygieneCertificateUrl)

    return NextResponse.json({
      url: updatedProfile.foodHygieneCertificateUrl,
      uploadedAt: updatedProfile.foodHygieneCertificateUploadedAt,
      reviewStatus: updatedProfile.foodHygieneCertificateReviewStatus,
      storageProvider: storedCertificate.provider,
    })
  } catch (error) {
    console.error("Certificate upload failed", error)
    return NextResponse.json({ error: "Failed to upload certificate" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await getRequiredSession(Role.CHEF)
    const userId = getSessionUserId(session)

    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId },
      select: { id: true, foodHygieneCertificateUrl: true },
    })

    if (!chefProfile) {
      return NextResponse.json({ error: "Chef profile not found" }, { status: 404 })
    }

    await prisma.chefProfile.update({
      where: { id: chefProfile.id },
      data: {
        foodHygieneCertificateUrl: null,
        foodHygieneCertificateUploadedAt: null,
        foodHygieneCertificateReviewedAt: null,
        foodHygieneCertificateReviewedBy: null,
        foodHygieneCertificateReviewStatus: null,
      },
    })

    await deleteCertificateReference(chefProfile.foodHygieneCertificateUrl)

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error("Certificate deletion failed", error)
    return NextResponse.json({ error: "Failed to delete certificate" }, { status: 500 })
  }
}
