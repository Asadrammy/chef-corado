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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "CHEF") {
      return NextResponse.json({ error: "Only chefs can create profiles" }, { status: 403 })
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if profile already exists
    const existingProfile = await prisma.chefProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (existingProfile) {
      return NextResponse.json({ error: "Profile already exists" }, { status: 409 })
    }

    const body = await request.json()
    const validatedData = profileSchema.parse(body)

    const chefProfile = await prisma.chefProfile.create({
      data: {
        ...validatedData,
        user: { connect: { id: session.user.id } },
        isApproved: true, // Auto-approve for development
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(chefProfile, { status: 201 })
  } catch (error) {
    console.error("Error creating chef profile:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
