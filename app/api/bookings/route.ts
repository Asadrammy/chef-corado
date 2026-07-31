import { NextRequest, NextResponse } from "next/server"

import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { isLocalDemoSessionUser } from "@/lib/auth"
import { bookingService } from "@/lib/services/booking-service"
import { isPrismaConnectionError } from "@/lib/prisma"
import { localDemoBookings } from "@/lib/local-demo-data"

export async function GET(request: NextRequest) {
  let session
  try {
    session = await getRequiredSession()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const status = searchParams.get('status')
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

  if (isLocalDemoSessionUser(session.user.id, session.user.email)) {
    const bookings = status
      ? localDemoBookings.filter((booking) => booking.status === status)
      : localDemoBookings

    return NextResponse.json({
      bookings: bookings.slice(0, limit),
      pagination: {
        page,
        limit,
        total: bookings.length,
        pages: 1,
      },
      localDemo: true,
    })
  }

  let result

  try {
    result = await bookingService.listBookings({
      userId: getSessionUserId(session),
      role: session.user.role,
      page,
      limit,
      status,
      sortBy,
      sortOrder,
    })
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      const bookings = status
        ? localDemoBookings.filter((booking) => booking.status === status)
        : localDemoBookings

      return NextResponse.json({
        bookings: bookings.slice(0, limit),
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

  return NextResponse.json(result)
}
