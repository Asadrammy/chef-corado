import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@/types"

// GET all users (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        chefProfile: {
          select: {
            isApproved: true,
            location: true,
            radius: true,
          },
        },
        _count: {
          select: {
            requests: true,
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Transform data to match the expected User type for the data table
    const transformedUsers = users.map((user, index) => ({
      id: index + 1, // Use sequential ID for display
      firstName: user.name.split(' ')[0] || 'Unknown',
      lastName: user.name.split(' ').slice(1).join(' ') || '',
      image: `https://avatar.vercel.sh/${user.name.replace(' ', '')}?size=32`,
      country: user.chefProfile?.location || 'Not specified',
      status: user.chefProfile?.isApproved ? 'Approved' : user.role === 'CHEF' ? 'Pending' : 'Active',
      plan_name: user.role === 'ADMIN' ? 'Admin Plan' : user.role === 'CHEF' ? 'Chef Plan' : 'Client Plan',
      // Include original data for reference if needed
      originalId: user.id,
      email: user.email,
      role: user.role,
    }))

    return NextResponse.json(transformedUsers)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
