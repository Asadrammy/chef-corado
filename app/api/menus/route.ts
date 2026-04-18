import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const menuItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

const menuSectionSchema = z.object({
  title: z.string().min(1, "Section title is required"),
  sortOrder: z.number().int().min(0).optional(),
  items: z.array(menuItemSchema).default([]),
})

const menuSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  menuImage: z.string().url().optional(),
  cuisineType: z.string().optional(),
  eventType: z.string().optional(),
  sections: z.array(menuSectionSchema).default([]),
})

type FormattedMenuItem = {
  id: string
  name: string
  description?: string
  sortOrder: number
}

type FormattedMenuSection = {
  id: string
  title: string
  sortOrder: number
  items?: FormattedMenuItem[]
}

function formatMenu(menu: any) {
  return {
    ...menu,
    description: menu.description ?? undefined,
    menuImage: menu.menuImage ?? undefined,
    cuisineType: menu.cuisineType ?? undefined,
    eventType: menu.eventType ?? undefined,
    createdAt: menu.createdAt.toISOString(),
    updatedAt: menu.updatedAt.toISOString(),
    sections: ((menu.sections ?? []) as FormattedMenuSection[])
      .sort((left: FormattedMenuSection, right: FormattedMenuSection) => left.sortOrder - right.sortOrder)
      .map((section: FormattedMenuSection) => ({
        ...section,
        items: [...(section.items ?? [])]
          .sort((left: FormattedMenuItem, right: FormattedMenuItem) => left.sortOrder - right.sortOrder)
          .map((item: FormattedMenuItem) => ({
            ...item,
            description: item.description ?? undefined,
          })),
      })),
  }
}

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

    const userId = session.user.id

    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId },
    })

    if (!chefProfile) {
      return NextResponse.json({ 
        error: "Chef profile not found. Please create your chef profile first.",
        needsProfile: true 
      }, { status: 404 })
    }

    const menus = await (prisma as any).menu.findMany({
      where: { chefId: chefProfile.id },
      orderBy: { createdAt: "desc" },
      include: {
        sections: {
          include: {
            items: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    return NextResponse.json(menus.map(formatMenu))
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

    const userId = session.user.id

    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId },
    })

    if (!chefProfile) {
      return NextResponse.json({ 
        error: "Chef profile not found. Please create your chef profile first.",
        needsProfile: true 
      }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = menuSchema.parse(body)

    const menu = await (prisma as any).menu.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        price: validatedData.price,
        menuImage: validatedData.menuImage,
        cuisineType: validatedData.cuisineType,
        eventType: validatedData.eventType,
        chefId: chefProfile.id,
        sections: {
          create: validatedData.sections.map((section, sectionIndex) => ({
            title: section.title,
            sortOrder: section.sortOrder ?? sectionIndex,
            items: {
              create: section.items.map((item, itemIndex) => ({
                name: item.name,
                description: item.description,
                sortOrder: item.sortOrder ?? itemIndex,
              })),
            },
          })),
        },
      },
      include: {
        sections: {
          include: {
            items: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    return NextResponse.json(formatMenu(menu), { status: 201 })
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
