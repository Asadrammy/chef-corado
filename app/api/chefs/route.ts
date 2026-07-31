import { NextResponse } from "next/server"
import { isPrismaConnectionError, prisma, withPrismaReconnect } from "@/lib/prisma"

export async function GET() {
  try {
    const chefs = await withPrismaReconnect(() => prisma.chefProfile.findMany({
      where: {
        isApproved: true,
        isBanned: false,
        user: {
          role: 'CHEF',
          isBanned: false,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            verified: true,
            experienceLevel: true,
          },
        },
        experiences: {
          where: {
            isActive: true,
          },
          take: 3,
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            experiences: true,
            reviews: true,
            bookings: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }), 1)

    return NextResponse.json(chefs)
  } catch (error) {
    console.error('Failed to fetch chefs:', error)
    if (isPrismaConnectionError(error)) {
      return NextResponse.json(
        { error: 'Database connection temporarily unavailable' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch chefs' },
      { status: 500 }
    )
  }
}
