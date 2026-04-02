import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@/types"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requestId } = await params
    const userId = session.user.id
    const role = session.user.role

    // Fetch the request
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        proposals: role === Role.CHEF ? {
          where: { chefId: userId },
          include: {
            chef: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        } : false,
      },
    })

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // For chefs, check if the request is within their service radius
    if (role === Role.CHEF) {
      const chefProfile = await prisma.chefProfile.findUnique({
        where: { userId },
      })

      if (!chefProfile) {
        return NextResponse.json({ error: "Chef profile not found" }, { status: 404 })
      }

      // If request has coordinates and chef has location, check distance
      if (request.latitude && request.longitude && chefProfile.latitude && chefProfile.longitude) {
        const distance = Math.sqrt(
          Math.pow(request.latitude - chefProfile.latitude, 2) + 
          Math.pow(request.longitude - chefProfile.longitude, 2)
        )
        
        // Convert to approximate miles (1 degree ≈ 69 miles)
        const distanceInMiles = distance * 69
        
        if (distanceInMiles > chefProfile.radius) {
          return NextResponse.json({ error: "Request not available in your area" }, { status: 403 })
        }
      }
    }

    return NextResponse.json({ request })

  } catch (error) {
    console.error("Request detail API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
