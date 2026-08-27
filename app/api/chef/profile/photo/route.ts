import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { imageReferenceSchema } from "@/lib/menu-image-storage"
import { prisma } from "@/lib/prisma"
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
