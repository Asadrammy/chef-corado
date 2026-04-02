import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const chefs = await prisma.chefProfile.findMany({
      where: {
        isApproved: true,
        isBanned: false,
        user: {
          role: 'CHEF',
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
    })

    return NextResponse.json(chefs)
  } catch (error) {
    console.error('Failed to fetch chefs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chefs' },
      { status: 500 }
    )
  }
}
