import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions, isLocalDemoSessionUser } from "@/lib/auth"
import { isPrismaConnectionError, prisma } from "@/lib/prisma"
import { parseUserProfileImageData } from "@/lib/user-profile-photo-storage"
import { ensureUserProfileImageColumns } from "@/lib/user-profile-image"

const localDemoProfilePhotoBackedEmails: Record<string, string> = {
  "client@example.com": "michael.thompson@example.com",
}

type UserProfileImageDataRow = {
  imageData: string | null
  role: string | null
}

async function canReadProfilePhoto(requestedUserId: string, sessionUser: {
  id?: string | null
  email?: string | null
  role?: string | null
}) {
  if (sessionUser.id === requestedUserId) return true

  if (isLocalDemoSessionUser(sessionUser.id, sessionUser.email) && sessionUser.email) {
    const demoBackedUser = await prisma.user.findUnique({
      where: { email: localDemoProfilePhotoBackedEmails[sessionUser.email.toLowerCase()] ?? sessionUser.email },
      select: { id: true },
    })

    if (demoBackedUser?.id === requestedUserId) return true
  }

  return false
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    const { userId } = await params

    if (!(await ensureUserProfileImageColumns())) {
      return NextResponse.json({ error: "Profile photo storage is not configured." }, { status: 503 })
    }

    const rows = await prisma.$queryRaw<UserProfileImageDataRow[]>`
      SELECT "imageData", "role"
      FROM "User"
      WHERE "id" = ${userId}
      LIMIT 1
    `
    const row = rows[0]

    if (!row) {
      return NextResponse.json({ error: "Profile photo not found." }, { status: 404 })
    }

    if (row.role !== "CHEF") {
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      if (!(await canReadProfilePhoto(userId, session.user))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const photo = parseUserProfileImageData(row.imageData)

    if (!photo) {
      return NextResponse.json({ error: "Profile photo not found." }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(photo.data), {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Length": String(photo.data.byteLength),
        "Content-Type": photo.contentType,
      },
    })
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      return NextResponse.json({ error: "Unable to load profile photo. Please try again." }, { status: 503 })
    }

    console.error("Client profile photo fetch failed", error)
    return NextResponse.json({ error: "Unable to load profile photo." }, { status: 500 })
  }
}
