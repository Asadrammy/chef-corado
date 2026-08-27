import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadImageFile } from "@/lib/image-upload-storage"
import { Role } from "@/types"
import { isRequestPhotoSchemaMismatch } from "@/lib/request-photo-schema"

function serializePhoto(photo: {
  id: string
  url: string
  originalName: string | null
  contentType: string | null
  sizeBytes: number | null
  sortOrder: number
  createdAt: Date
}) {
  return {
    id: photo.id,
    url: photo.url,
    originalName: photo.originalName,
    contentType: photo.contentType,
    sizeBytes: photo.sizeBytes,
    sortOrder: photo.sortOrder,
    createdAt: photo.createdAt.toISOString(),
  }
}

async function canViewRequestPhotos(requestId: string, userId: string, role?: string | null) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      clientId: true,
      eventDate: true,
      multiDayDates: {
        select: { date: true },
      },
    },
  })

  if (!request) return { allowed: false, status: 404 as const }
  if (request.clientId === userId || role === Role.ADMIN) return { allowed: true, request }

  if (role === Role.CHEF) {
    const hasUpcomingDate =
      request.eventDate.getTime() >= Date.now() ||
      request.multiDayDates.some((date) => date.date.getTime() >= Date.now())
    return { allowed: hasUpcomingDate, status: hasUpcomingDate ? undefined : 403 as const, request }
  }

  return { allowed: false, status: 403 as const, request }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ requestId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { requestId } = await context.params
  const access = await canViewRequestPhotos(requestId, session.user.id, session.user.role)
  if (!access.allowed) {
    return NextResponse.json({ error: access.status === 404 ? "Request not found" : "Forbidden" }, { status: access.status ?? 403 })
  }

  try {
    const photos = await prisma.requestPhoto.findMany({
      where: { requestId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        url: true,
        originalName: true,
        contentType: true,
        sizeBytes: true,
        sortOrder: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ photos: photos.map(serializePhoto) })
  } catch (error) {
    if (isRequestPhotoSchemaMismatch(error)) {
      return NextResponse.json({ photos: [] })
    }

    throw error
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== Role.CLIENT) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { requestId } = await context.params
  const existingRequest = await prisma.request.findUnique({
    where: { id: requestId },
    select: { id: true, clientId: true },
  })

  if (!existingRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 })
  }

  if (existingRequest.clientId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const uploaded = await uploadImageFile({
      file,
      ownerId: session.user.id,
      purpose: "request",
    })

    try {
      const existingCount = await prisma.requestPhoto.count({ where: { requestId } })
      const photo = await prisma.requestPhoto.create({
        data: {
          requestId,
          uploaderId: session.user.id,
          url: uploaded.url,
          publicId: uploaded.publicId,
          originalName: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          sortOrder: existingCount,
        },
        select: {
          id: true,
          url: true,
          originalName: true,
          contentType: true,
          sizeBytes: true,
          sortOrder: true,
          createdAt: true,
        },
      })

      return NextResponse.json({ photo: serializePhoto(photo) }, { status: 201 })
    } catch (error) {
      if (isRequestPhotoSchemaMismatch(error)) {
        return NextResponse.json({ error: "Request photo storage is not available yet." }, { status: 503 })
      }

      throw error
    }
  } catch (error) {
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

    console.error("Request photo upload failed", error)
    return NextResponse.json({ error: "Failed to upload request photo" }, { status: 500 })
  }
}
