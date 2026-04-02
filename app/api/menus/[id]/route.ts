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

// PUT update a menu
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "CHEF") {
      return NextResponse.json({ error: "Only chefs can update menus" }, { status: 403 })
    }

    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!chefProfile) {
      return NextResponse.json({ error: "Chef profile not found" }, { status: 404 })
    }

    // Check if the menu belongs to this chef
    const existingMenu = await prisma.menu.findFirst({
      where: {
        id,
        chefId: chefProfile.id,
      },
    })

    if (!existingMenu) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = menuSchema.parse(body)

    const updatedMenu = await prisma.menu.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json(updatedMenu)
  } catch (error) {
    console.error("Error updating menu:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE a menu
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "CHEF") {
      return NextResponse.json({ error: "Only chefs can delete menus" }, { status: 403 })
    }

    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!chefProfile) {
      return NextResponse.json({ error: "Chef profile not found" }, { status: 404 })
    }

    // Check if the menu belongs to this chef
    const existingMenu = await prisma.menu.findFirst({
      where: {
        id,
        chefId: chefProfile.id,
      },
    })

    if (!existingMenu) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 })
    }

    await prisma.menu.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Menu deleted successfully" })
  } catch (error) {
    console.error("Error deleting menu:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
