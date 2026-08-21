import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions, isLocalDemoSessionUser } from "@/lib/auth"
import { isPrismaConnectionError, prisma } from "@/lib/prisma"
import { fileToUserProfileImageData, userProfilePhotoUrl } from "@/lib/user-profile-photo-storage"
import { ensureUserProfileImageColumns } from "@/lib/user-profile-image"

type PersistedProfilePhoto = {
  id: string
  image: string | null
  name: string
  email: string
  profileCompletion: number
}

const localDemoProfilePhotoBackedEmails: Record<string, string> = {
  "client@example.com": "michael.thompson@example.com",
}

function uploadErrorResponse(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "INVALID_IMAGE_TYPE") {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." }, { status: 400 })
    }
    if (error.message === "IMAGE_TOO_LARGE") {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 })
    }
    if (error.message === "DURABLE_IMAGE_STORAGE_NOT_CONFIGURED") {
      return NextResponse.json({ error: "Durable image storage is not configured." }, { status: 503 })
    }
  }

  console.error("Client profile photo upload failed", error)
  return NextResponse.json({ error: "Unable to update profile photo. Please try again." }, { status: 500 })
}

async function persistProfilePhotoData(userId: string, image: string, imageData: string): Promise<PersistedProfilePhoto | null> {
  const rows = await prisma.$queryRaw<PersistedProfilePhoto[]>`
    UPDATE "User"
    SET "image" = ${image}, "imageData" = ${imageData}, "updatedAt" = NOW()
    WHERE "id" = ${userId} AND "role" = 'CLIENT'
    RETURNING "id", "image", "name", "email", "profileCompletion"
  `

  return rows[0] ?? null
}

async function resolveAuthenticatedClientId(sessionUser: {
  id?: string | null
  email?: string | null
}) {
  if (!sessionUser.id) return null

  if (isLocalDemoSessionUser(sessionUser.id, sessionUser.email)) {
    if (!sessionUser.email) return null

    const demoBackedUser = await prisma.user.findUnique({
      where: { email: localDemoProfilePhotoBackedEmails[sessionUser.email.toLowerCase()] ?? sessionUser.email },
      select: {
        id: true,
        role: true,
      },
    })

    return demoBackedUser?.role === "CLIENT" ? demoBackedUser.id : null
  }

  const client = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      role: true,
    },
  })

  return client?.role === "CLIENT" ? client.id : null
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "CLIENT") {
      return NextResponse.json({ error: "Only client accounts can update this profile photo." }, { status: 403 })
    }

    let persistedClientId: string | null = null
    try {
      persistedClientId = await resolveAuthenticatedClientId(session.user)
    } catch (error) {
      if (isPrismaConnectionError(error)) {
        return NextResponse.json({ error: "Unable to verify your client profile. Please try again." }, { status: 503 })
      }
      throw error
    }

    if (!persistedClientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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
    const imageUrl = userProfilePhotoUrl(persistedClientId)
    const persistedUser = await persistProfilePhotoData(persistedClientId, imageUrl, imageData)

    if (!persistedUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({
      image: persistedUser.image,
      user: persistedUser,
    })
  } catch (error) {
    return uploadErrorResponse(error)
  }
}
