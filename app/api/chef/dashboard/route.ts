import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getChefDashboardData } from "@/lib/chef-dashboard"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "CHEF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dashboardData = await getChefDashboardData(session.user.id)

    if (!dashboardData) {
      return NextResponse.json({ error: "Chef profile not found" }, { status: 404 })
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('Chef dashboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
