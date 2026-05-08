import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcrypt"
import { prisma } from "@/lib/prisma"
import { registerSchema } from "@/lib/validation-schemas"
import { Role } from "@/types"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email.toLowerCase(),
        password: hashedPassword,
        role: validatedData.role,
      } as any,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    // If role is CHEF, create ChefProfile
    if (validatedData.role === Role.CHEF) {
      await prisma.chefProfile.create({
        data: {
          userId: user.id,
          location: "",
          radius: 50, // Default radius
          insuranceStatus: "pending",
        } as any,
      })
    }

    return NextResponse.json(
      {
        message: "User registered successfully",
        user,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)

    if (error && typeof error === "object" && "errors" in error) {
      return NextResponse.json(
        { error: "Validation failed", details: (error as { errors: unknown }).errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
