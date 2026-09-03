import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { imageReferenceSchema } from "@/lib/menu-image-storage"
import { prisma } from "@/lib/prisma"
import { fileToUserProfileImageData, userProfilePhotoUrl } from "@/lib/user-profile-photo-storage"
import { ensureUserProfileImageColumns } from "@/lib/user-profile-image"
import { Role } from "@/types"

const profilePhotoSchema = z.object({
  profileImage: imageReferenceSchema,
})

export async function PUT(request: NextRequest) {
  try {
    const session = await getRequiredSession(Role.CHEF)
    const userId = getSessionUserId(session)
    const payload = profilePhotoSchema.parse(await request.json())

    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId },
      select: { id: true },
    })

    if (!chefProfile) {
      return NextResponse.json({ error: "Chef profile not found" }, { status: 404 })
    }

    const updatedProfile = await prisma.chefProfile.update({
      where: { id: chefProfile.id },
      data: { profileImage: payload.profileImage },
      select: {
        id: true,
        profileImage: true,
      },
    })

    return NextResponse.json({ profileImage: updatedProfile.profileImage })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid profile photo reference", details: error.errors }, { status: 400 })
    }

    return handleApiError(error, "Chef Profile Photo PUT")
  }
}

function uploadErrorResponse(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "INVALID_IMAGE_TYPE") {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." }, { status: 400 })
    }
    if (error.message === "IMAGE_TOO_LARGE") {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 })
    }
  }

  return handleApiError(error, "Chef Profile Photo POST")
}

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession(Role.CHEF)
    const userId = getSessionUserId(session)

    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId },
      select: { id: true },
    })

    if (!chefProfile) {
      return NextResponse.json({ error: "Chef profile not found" }, { status: 404 })
    }

    if (!(await ensureUserProfileImageColumns())) {
      return NextResponse.json({ error: "Profile photo storage is not configured. Please apply the latest database migration." }, { status: 503 })
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (formData.has("imageUrl") || formData.has("url")) {
      return NextResponse.json({ error: "Remote image URLs are not accepted for profile photos." }, { status: 400 })
    }

    const submittedFile = formData.get("file")
    if (!(submittedFile instanceof File) || submittedFile.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const imageData = await fileToUserProfileImageData(submittedFile)
    const profileImage = userProfilePhotoUrl(userId)

    const updatedProfile = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "User"
        SET "image" = ${profileImage}, "imageData" = ${imageData}, "updatedAt" = NOW()
        WHERE "id" = ${userId} AND "role" = 'CHEF'
      `

      return tx.chefProfile.update({
        where: { id: chefProfile.id },
        data: { profileImage },
        select: {
          id: true,
          profileImage: true,
        },
      })
    })

    return NextResponse.json({ profileImage: updatedProfile.profileImage })
  } catch (error) {
    return uploadErrorResponse(error)
  }
}
