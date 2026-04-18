import { NextRequest, NextResponse } from "next/server"

import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { bookingService } from "@/lib/services/booking-service"

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

  const result = await bookingService.listBookings({
    userId: getSessionUserId(session),
    role: session.user.role,
    page,
    limit,
    status,
    sortBy,
    sortOrder,
  })

  return NextResponse.json(result)
}
