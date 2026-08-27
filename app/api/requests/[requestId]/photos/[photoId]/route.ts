import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { deleteUploadedImage } from "@/lib/image-upload-storage"
import { prisma } from "@/lib/prisma"
import { Role } from "@/types"

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ requestId: string; photoId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== Role.CLIENT) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { requestId, photoId } = await context.params
  const photo = await prisma.requestPhoto.findUnique({
    where: { id: photoId },
    include: {
      request: {
        select: { id: true, clientId: true },
      },
    },
  })

  if (!photo || photo.requestId !== requestId) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 })
  }

  if (photo.request.clientId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.requestPhoto.delete({ where: { id: photo.id } })

  if (photo.publicId) {
    await deleteUploadedImage(photo.publicId).catch((error) => {
      console.error("Request photo storage delete failed", error)
    })
  }

  return NextResponse.json({ deleted: true })
}
