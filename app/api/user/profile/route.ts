import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateMessageContent } from "@/lib/security/communication-policy"
import { buildUserProfileSelect, buildUserProfileUpdateData, getUserProfileColumnAvailability } from "@/lib/user-profile-schema"

const optionalUrl = z.string().trim().max(500).optional().nullable().transform((value) => value || null).refine((value) => {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === "https:"
  } catch {
    return false
  }
}, "Use a valid HTTPS URL")

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{2,39}$/, "Use 3-40 letters, numbers, underscores, or hyphens").optional().nullable().transform((value) => value || null),
  bio: z.string().trim().max(200).optional().nullable().transform((value) => value || null),
  phone: z.string().trim().max(40).optional().nullable().transform((value) => value || null),
  website: optionalUrl,
  socialProfile: optionalUrl,
})

function splitName(name: string) {
  const parts = name.trim().split(/\s+/)
  return {
    firstName: parts[0] ?? null,
    surname: parts.slice(1).join(" ") || null,
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: z.infer<typeof profileSchema>
  try {
    payload = profileSchema.parse(await request.json())
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 422 })
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  try {
    for (const value of [payload.name, payload.username, payload.bio]) {
      if (value) validateMessageContent(value)
    }
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Profile text contains content that is not allowed.",
    }, { status: 422 })
  }

  if (payload.username) {
    const availability = await getUserProfileColumnAvailability()
    if (!availability.username) {
      return NextResponse.json({
        error: "Username updates are temporarily unavailable until the profile database is fully migrated.",
      }, { status: 503 })
    }

    const existing = await prisma.user.findFirst({
      where: {
        username: payload.username,
        id: { not: session.user.id },
      },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 })
    }
  }

  const data = await buildUserProfileUpdateData(payload)
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      id: true,
      ...(await buildUserProfileSelect()),
    },
  })

  return NextResponse.json({ user })
}
