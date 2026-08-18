import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { isPrismaConnectionError, prisma } from "@/lib/prisma"
import { BookingStatus, Role } from "@/types"

const localDemoChefBookings = [
  {
    id: "local-chef-booking-confirmed",
    totalPrice: "1850",
    status: BookingStatus.CONFIRMED,
    eventDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Downtown",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    client: {
      id: "local-client-maya",
      name: "Maya R.",
    },
    proposal: {
      request: {
        eventDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        details: "Anniversary dinner with a seasonal tasting menu.",
        location: "Downtown",
      },
    },
    payments: null,
    experience: null,
  },
  {
    id: "local-chef-booking-pending",
    totalPrice: "2400",
    status: BookingStatus.PENDING,
    eventDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    location: "West End",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    client: {
      id: "local-client-daniel",
      name: "Daniel K.",
    },
    proposal: {
      request: {
        eventDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        details: "Modern Italian tasting menu for a private celebration.",
        location: "West End",
      },
    },
    payments: null,
    experience: null,
  },
]

export async function GET(request: NextRequest) {
  try {
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
          serviceDates: { orderBy: { sortOrder: "asc" } },
          proposal: {
            include: {
              lineItems: { orderBy: { sortOrder: "asc" } },
              request: {
                include: {
                  multiDayDates: { orderBy: { sortOrder: "asc" } },
                },
              },
            },
          },
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
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      const { searchParams } = new URL(request.url)
      const page = Math.max(Number.parseInt(searchParams.get("page") || "1", 10), 1)
      const limit = Math.min(Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1), 100)
      const status = searchParams.get("status") || undefined
      const bookings = status
        ? localDemoChefBookings.filter((booking) => booking.status === status)
        : localDemoChefBookings

      return NextResponse.json({
        bookings,
        pagination: {
          page,
          limit,
          total: bookings.length,
          pages: 1,
        },
        localDemo: true,
      })
    }

    throw error
  }
}
