import { compare } from "bcrypt"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { type AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

import { prisma } from "@/lib/prisma"
import { Role } from "@/types"

type AuthUser = {
  id: string
  name: string
  email: string
  role: Role
}

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
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user) {
          return null
        }

        const isValidPassword = await compare(credentials.password, user.password)

        if (!isValidPassword) {
          return null
        }

        const authUser: AuthUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as Role,
        }

        return authUser
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
    async redirect({ url, baseUrl }) {
      const configuredBaseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? baseUrl

      if (url.startsWith("/")) {
        return `${configuredBaseUrl}${url}`
      }

      try {
        const redirectUrl = new URL(url)
        const allowedBaseUrl = new URL(configuredBaseUrl)

        if (redirectUrl.origin === allowedBaseUrl.origin) {
          return url
        }
      } catch {
        return configuredBaseUrl
      }

      return configuredBaseUrl
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
}
