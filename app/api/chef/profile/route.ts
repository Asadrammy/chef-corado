import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const profileSchema = z.object({
  bio: z.string().optional(),
  experience: z.number().int().min(0).optional(),
  location: z.string().min(1, "Location is required"),
  radius: z.number().min(1, "Radius must be at least 1 km").max(500, "Radius cannot exceed 500 km"),
  profileImage: z.string().url().optional(),
})

// GET chef profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "CHEF") {
      return NextResponse.json({ error: "Only chefs can access profile" }, { status: 403 })
    }

    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!chefProfile) {
      return NextResponse.json({ 
        error: "Chef profile not found. Please create your chef profile first.",
        needsProfile: true 
      }, { status: 404 })
    }

    return NextResponse.json(chefProfile)
  } catch (error) {
    console.error("Error fetching chef profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT chef profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "CHEF") {
      return NextResponse.json({ error: "Only chefs can update profile" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = profileSchema.parse(body)

    const updatedProfile = await prisma.chefProfile.update({
      where: { userId: session.user.id },
      data: validatedData,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(updatedProfile)
  } catch (error) {
    console.error("Error updating chef profile:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
