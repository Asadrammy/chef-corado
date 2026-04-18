import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@/types"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== Role.CHEF) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(Number.parseInt(searchParams.get("page") || "1", 10), 1)
  const limit = Math.min(Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1), 100)
  const status = searchParams.get("status") || undefined
  const skip = (page - 1) * limit

  const chefProfile = await prisma.chefProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!chefProfile) {
    return NextResponse.json({ bookings: [], pagination: { page, limit, total: 0, pages: 0 } })
  }

  const where = {
    chefId: chefProfile.id,
    ...(status ? { status } : {}),
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        proposal: { include: { request: true } },
        payments: true,
        experience: true,
      },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ])

  return NextResponse.json({
    bookings,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
}
