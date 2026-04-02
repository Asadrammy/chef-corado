import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { getServerSession } from "next-auth"
import { Prisma } from "@prisma/client"
import { Role } from "@/types"
import { calculateDistance } from "@/lib/geo"
import { sendEmail, emailTemplates } from "@/lib/email"

const requestSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  eventDate: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid eventDate",
  }),
  location: z.string().min(5),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  budget: z.number().positive(),
  details: z.string().min(10),
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== Role.CLIENT) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: z.infer<typeof requestSchema>

  try {
    const json = await request.json()
    body = requestSchema.parse(json)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const created = await prisma.request.create({
    data: {
      clientId: session.user.id,
      title: body.title,
      description: body.description || null,
      eventDate: new Date(body.eventDate),
      location: body.location,
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      budget: body.budget,
      details: body.details || null,
    },
  })

  // Send email notifications to matching chefs
  if (created.latitude && created.longitude) {
    const matchingChefs = await prisma.chefProfile.findMany({
      where: {
        isApproved: true,
        isBanned: false,
        latitude: { not: null },
        longitude: { not: null },
        radius: { gt: 0 }, // Ensure radius is greater than 0
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

    // Filter chefs within radius and send emails
    const eligibleChefs = matchingChefs.filter(chef => {
      if (!chef.latitude || !chef.longitude || chef.radius <= 0) return false
      const distance = calculateDistance(
        created.latitude!,
        created.longitude!,
        chef.latitude,
        chef.longitude
      )
      return distance <= chef.radius
    })

    // Send emails to eligible chefs
    const emailPromises = eligibleChefs.map(chef =>
      sendEmail({
        to: chef.user.email,
        subject: `New Service Request: ${created.title}`,
        html: emailTemplates.newRequest(
          chef.user.name,
          created.title,
          created.location,
          created.budget
        ),
      }).catch(error => console.error('Failed to send email to chef:', chef.user.email, error))
    )

    await Promise.allSettled(emailPromises)
  }

  return NextResponse.json(created)
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  const userId = session.user.id

  if (role === Role.CLIENT && !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (role === Role.CLIENT) {
    // Clients see all their own requests
    const requests = await prisma.request.findMany({
      where: { clientId: userId! },
      orderBy: { eventDate: "desc" },
    })
    return NextResponse.json({ requests })
  }

  if (role === Role.CHEF) {
    // Chefs only see requests within their service radius
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: userId! },
    })

    if (!chefProfile) {
      return NextResponse.json({ 
        error: "Chef profile not found. Please create your chef profile first.",
        needsProfile: true,
        requests: []
      }, { status: 404 })
    }

    // If chef doesn't have location coordinates or invalid radius, return empty array
    if (!chefProfile.latitude || !chefProfile.longitude || chefProfile.radius <= 0) {
      return NextResponse.json({ 
        error: "Chef location or radius not properly set. Please update your profile.",
        needsLocation: !chefProfile.latitude || !chefProfile.longitude,
        needsRadius: chefProfile.radius <= 0,
        requests: []
      }, { status: 400 })
    }

    // Get all requests with coordinates - limit to recent requests for performance
    const allRequests = await prisma.request.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        eventDate: { gte: new Date() } // Only future events
      },
      orderBy: { eventDate: "desc" },
      take: 100 // Limit to 100 most recent requests for performance
    })

    // Filter requests by real distance calculation using Haversine formula
    const filteredRequests = allRequests.filter((request: any) => {
      const distance = calculateDistance(
        chefProfile.latitude!,
        chefProfile.longitude!,
        request.latitude!,
        request.longitude!
      )
      return distance <= chefProfile.radius
    })

    return NextResponse.json({ requests: filteredRequests })
  }

  // Admin sees all requests
  const requests = await prisma.request.findMany({
    orderBy: { eventDate: "desc" },
  })

  return NextResponse.json({ requests })
}
