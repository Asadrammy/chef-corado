import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isPrismaConnectionError, prisma } from "@/lib/prisma"
import { z } from "zod"
import { validateMessageContent } from "@/lib/security/communication-policy"
import { logger } from "@/lib/logger"
import { menuImageReferenceSchema, normalizeMenuImageReference } from "@/lib/menu-image-storage"

const menuSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Full menu description is required"),
  price: z.number().positive("Price must be positive").optional(),
  currency: z.string().length(3).optional(),
  menuType: z.enum(["PRICED", "SAMPLE", "FREE_FORM"]).default("FREE_FORM"),
  menuImage: menuImageReferenceSchema.optional(),
  cuisineType: z.string().optional(),
  eventType: z.string().optional(),
})

function formatMenu(menu: any) {
  return {
    ...menu,
    description: menu.description ?? undefined,
    price: menu.price ?? undefined,
    currency: menu.currency ?? undefined,
    menuType: menu.menuType ?? "FREE_FORM",
    menuImage: menu.menuImage ?? undefined,
    cuisineType: menu.cuisineType ?? undefined,
    eventType: menu.eventType ?? undefined,
    createdAt: menu.createdAt.toISOString(),
    updatedAt: menu.updatedAt.toISOString(),
  }
}

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
    const validatedData = menuSchema.parse({
      ...body,
      menuImage: normalizeMenuImageReference(body?.menuImage),
    })

    validateMessageContent(validatedData.title)
    validateMessageContent(validatedData.description)
    if (validatedData.cuisineType) {
      validateMessageContent(validatedData.cuisineType)
    }
    if (validatedData.eventType) {
      validateMessageContent(validatedData.eventType)
    }

    // Enforce price required only for PRICED menus
    if (validatedData.menuType === "PRICED" && (validatedData.price === undefined || validatedData.price === null)) {
      return NextResponse.json({ error: "Price is required for PRICED menus" }, { status: 400 })
    }

    const updatedMenu = await prisma.menu.update({
      where: { id },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        price: validatedData.price,
        currency: validatedData.currency,
        menuType: validatedData.menuType,
        menuImage: validatedData.menuImage,
        cuisineType: validatedData.cuisineType,
        eventType: validatedData.eventType,
      },
    })

    return NextResponse.json(formatMenu(updatedMenu))
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json(
        { error: "Menus are unavailable in local demo mode" },
        { status: 503 }
      )
    }

    logger.error("[MENUS] Update failed", {
      action: "update",
      error: error instanceof Error ? error.message : String(error),
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.startsWith("COMMUNICATION_POLICY_VIOLATION")) {
      return NextResponse.json(
        { error: error.message.replace(/^COMMUNICATION_POLICY_VIOLATION:?\s*/, "") || "Menu content violates platform policy" },
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
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json(
        { error: "Menus are unavailable in local demo mode" },
        { status: 503 }
      )
    }

    logger.error("[MENUS] Delete failed", {
      action: "delete",
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
