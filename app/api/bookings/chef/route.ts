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

  const bookings = await prisma.booking.findMany({
    where: { chefId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      client: true,
      proposal: { include: { request: true } },
    },
  })

  return NextResponse.json({ bookings })
}
