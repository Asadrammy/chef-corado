import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        message: "Not authenticated",
        session: null 
      })
    }

    return NextResponse.json({ 
      message: "Authenticated",
      session: {
        user: {
          id: session.user?.id,
          name: session.user?.name,
          email: session.user?.email,
          role: session.user?.role,
        }
      },
      testUsers: {
        admin: "admin@example.com / admin123",
        chef: "chef@example.com / chef123", 
        client: "client@example.com / client123"
      }
    })
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
