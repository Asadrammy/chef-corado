import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isPrismaConnectionError, prisma } from "@/lib/prisma"
import { getCurrencyForCountry } from "@/lib/request-options"
import { z } from "zod"
import { validateMessageContent } from "@/lib/security/communication-policy"

const MENU_MAX_COUNT = 20

const menuSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Full menu description is required"),
  price: z.number().min(0, "Price must be positive").optional(),
  currency: z.string().length(3).optional(),
  menuType: z.enum(["PRICED", "SAMPLE", "FREE_FORM"]).default("FREE_FORM"),
  menuImage: z.string().url().optional(),
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

function getLocalDemoMenus() {
  const now = new Date().toISOString()

  return [
    {
      id: "local-menu-anniversary",
      title: "Anniversary Tasting Menu",
      description: "A celebratory five-course private dining menu with seasonal seafood, handmade pasta, a vegetarian course, and a composed dessert.",
      price: 185,
      currency: "USD",
      menuType: "PRICED",
      menuImage: undefined,
      cuisineType: "Modern European",
      eventType: "Anniversary",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "local-menu-italian",
      title: "Modern Italian Chef's Table",
      description: "A relaxed tasting menu built around handmade pasta, bright antipasti, slow-cooked mains, and elegant family-style sides.",
      price: 160,
      currency: "USD",
      menuType: "SAMPLE",
      menuImage: undefined,
      cuisineType: "Italian",
      eventType: "Private Dinner",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "local-menu-brunch",
      title: "Private Weekend Brunch",
      description: "Fresh pastries, seasonal fruit, plated egg dishes, roasted vegetables, and coffee service for an easy hosted morning.",
      price: undefined,
      currency: "USD",
      menuType: "FREE_FORM",
      menuImage: undefined,
      cuisineType: "Brunch",
      eventType: "Family Gathering",
      createdAt: now,
      updatedAt: now,
    },
  ]
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
      select: {
        id: true,
        preferredCurrency: true,
        baseCountryCode: true,
      },
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
    })

    return NextResponse.json(menus.map(formatMenu))
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json(getLocalDemoMenus())
    }

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
      select: {
        id: true,
        preferredCurrency: true,
        baseCountryCode: true,
      },
    })

    if (!chefProfile) {
      return NextResponse.json({ 
        error: "Chef profile not found. Please create your chef profile first.",
        needsProfile: true 
      }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = menuSchema.parse(body)

    // Enforce communication policy on user-generated text
    if (validatedData.title) {
      validateMessageContent(validatedData.title)
    }
    if (validatedData.description) {
      validateMessageContent(validatedData.description)
    }
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

    const existingMenuCount = await prisma.menu.count({
      where: { chefId: chefProfile.id },
    })

    if (existingMenuCount >= MENU_MAX_COUNT) {
      return NextResponse.json({ error: `You can only create up to ${MENU_MAX_COUNT} menus.` }, { status: 400 })
    }

    const defaultCurrency = (chefProfile as any).preferredCurrency || getCurrencyForCountry((chefProfile as any).baseCountryCode)

    const menu = await (prisma as any).menu.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        price: validatedData.price,
        currency: validatedData.currency || defaultCurrency,
        menuType: validatedData.menuType,
        menuImage: validatedData.menuImage,
        cuisineType: validatedData.cuisineType,
        eventType: validatedData.eventType,
        chefId: chefProfile.id,
      },
    })

    return NextResponse.json(formatMenu(menu), { status: 201 })
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json(
        { error: "Menus are unavailable in local demo mode" },
        { status: 503 }
      )
    }

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
