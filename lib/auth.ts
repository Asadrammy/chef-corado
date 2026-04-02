import { compare } from "bcrypt"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { type AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

import { prisma } from "@/lib/prisma"
import { Role } from "@/types"

export const roleDashboardPath: Record<Role, string> = {
  [Role.CLIENT]: "/dashboard/client",
  [Role.CHEF]: "/dashboard/chef",
  [Role.ADMIN]: "/dashboard/admin",
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("🔍 AUTH DEBUG - Authorize function called")
        console.log("🔍 AUTH DEBUG - Credentials:", { 
          email: credentials?.email, 
          passwordLength: credentials?.password?.length 
        })

        if (!credentials?.email || !credentials?.password) {
          console.log("❌ AUTH DEBUG - Missing credentials")
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        console.log("🔍 AUTH DEBUG - User found:", !!user)
        if (user) {
          console.log("🔍 AUTH DEBUG - User details:", {
            id: user.id,
            email: user.email,
            role: user.role,
            hasPassword: !!user.password
          })
        }

        if (!user) {
          console.log("❌ AUTH DEBUG - User not found")
          return null
        }

        const isValidPassword = await compare(credentials.password, user.password)
        console.log("🔍 AUTH DEBUG - Password match:", isValidPassword)

        if (!isValidPassword) {
          console.log("❌ AUTH DEBUG - Invalid password")
          return null
        }

        console.log("✅ AUTH DEBUG - Authentication successful")
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as Role,
        } as any
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.role) {
        token.role = user.role
      }
      if (user?.id) {
        token.sub = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token.role) {
        session.user.role = token.role as Role
      }
      session.user.id = token.sub
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
}
