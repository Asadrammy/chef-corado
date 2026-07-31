import { NextRequest, NextResponse } from "next/server"

import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { readCertificateReference } from "@/lib/certificate-storage"
import { prisma } from "@/lib/prisma"
import { Role } from "@/types"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ fileName: string }> }
) {
  const session = await getRequiredSession()
  const userId = getSessionUserId(session)
  const { fileName: rawFileName } = await context.params
  const fileName = decodeURIComponent(rawFileName)

  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return NextResponse.json({ error: "Invalid certificate reference" }, { status: 400 })
  }

  const certificateUrl = `/api/chef/certificates/${fileName}`
  const profile = await prisma.chefProfile.findFirst({
    where: { foodHygieneCertificateUrl: certificateUrl },
    select: { userId: true },
  })

  if (!profile) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 })
  }

  if (session.user.role !== Role.ADMIN && profile.userId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const certificate = await readCertificateReference(fileName)

  if ("redirectUrl" in certificate && certificate.redirectUrl) {
    return NextResponse.redirect(certificate.redirectUrl)
  }

  return new NextResponse(certificate.file, {
    headers: {
      "Content-Type": certificate.contentType,
      "Content-Disposition": `inline; filename="${certificate.originalName}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
