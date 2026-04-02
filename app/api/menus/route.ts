import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const menuSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  menuImage: z.string().url().optional(),
})

// GET all menus for the authenticated chef
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "CHEF") {
      return NextResponse.json({ error: "Only chefs can access menus" }, { status: 403 })
    }

    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!chefProfile) {
      return NextResponse.json({ 
        error: "Chef profile not found. Please create your chef profile first.",
        needsProfile: true 
      }, { status: 404 })
    }

    const menus = await prisma.menu.findMany({
      where: { chefId: chefProfile.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(menus)
  } catch (error) {
    console.error("Error fetching menus:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST create a new menu
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "CHEF") {
      return NextResponse.json({ error: "Only chefs can create menus" }, { status: 403 })
    }

    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!chefProfile) {
      return NextResponse.json({ 
        error: "Chef profile not found. Please create your chef profile first.",
        needsProfile: true 
      }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = menuSchema.parse(body)

    const menu = await prisma.menu.create({
      data: {
        ...validatedData,
        chefId: chefProfile.id,
      },
    })

    return NextResponse.json(menu, { status: 201 })
  } catch (error) {
    console.error("Error creating menu:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
