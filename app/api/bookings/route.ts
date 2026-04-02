import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@/types"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const status = searchParams.get('status')
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  const userId = session.user.id
  const role = session.user.role
  
  let whereClause: any = {}
  
  if (role === Role.CLIENT) {
    whereClause.clientId = userId
  } else if (role === Role.CHEF) {
    // Get chef profile ID for chef role
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: userId },
    })
    if (chefProfile) {
      whereClause.chefId = chefProfile.id
    } else {
      // Chef profile not found, return empty results
      return NextResponse.json({
        bookings: [],
        pagination: { page, limit, total: 0, pages: 0 }
      })
    }
  }

  // Add status filter if provided
  if (status) {
    whereClause.status = status
  }

  const skip = (page - 1) * limit

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder as 'asc' | 'desc' },
      include: {
        chef: { include: { user: true } },
        client: true,
        proposal: { include: { request: true } },
        payments: true,
      },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where: whereClause })
  ])

  return NextResponse.json({
    bookings,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  })
}
