import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET all chefs for admin
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const chefs = await prisma.chefProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            menus: true,
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(chefs)
  } catch (error) {
    console.error("Error fetching chefs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
