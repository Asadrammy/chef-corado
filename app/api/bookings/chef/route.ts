import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@/types"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== Role.CHEF) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const chefProfile = await prisma.chefProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!chefProfile) {
    return NextResponse.json({ bookings: [] })
  }

  const bookings = await prisma.booking.findMany({
    where: { chefId: chefProfile.id },
    orderBy: { createdAt: "desc" },
    include: {
      client: true,
      proposal: { include: { request: true } },
      payments: true,
      experience: true,
    },
  })

  return NextResponse.json({ bookings })
}
