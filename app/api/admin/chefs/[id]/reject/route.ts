import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST reject a chef (delete their profile)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // First check if chef exists
    const chef = await prisma.chefProfile.findUnique({
      where: { id },
    })

    if (!chef) {
      return NextResponse.json({ error: "Chef not found" }, { status: 404 })
    }

    // Delete the chef profile (this will cascade delete menus, proposals, etc.)
    await prisma.chefProfile.delete({
      where: { id },
    })

    return NextResponse.json({ 
      message: "Chef rejected and profile removed successfully"
    })
  } catch (error) {
    console.error("Error rejecting chef:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
