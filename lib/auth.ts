import { compare } from "bcrypt"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { type AuthOptions, DefaultSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

import { prisma } from "@/lib/prisma"
import { TERMS_VERSION } from "@/lib/request-options"
import { Role } from "@/types"

// Extend NextAuth types to include isBanned
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      isBanned?: boolean
      needsTermsAcceptance?: boolean
      insuranceStatus?: string | null
      needsInsuranceVerification?: boolean
    } & DefaultSession["user"]
  }

  interface User {
    isBanned?: boolean
    needsTermsAcceptance?: boolean
    insuranceStatus?: string | null
    needsInsuranceVerification?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isBanned?: boolean
    needsTermsAcceptance?: boolean
    insuranceStatus?: string | null
    needsInsuranceVerification?: boolean
  }
}

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

        if (user.isBanned) {
          throw new Error("ACCOUNT_BANNED")
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
      // Add isBanned flag to token for middleware checks
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            isBanned: true,
            termsAcceptedAt: true,
            termsVersion: true,
            acceptedVia: true,
            role: true,
            chefProfile: {
              select: {
                insuranceStatus: true,
                insuranceDocumentUrl: true,
                insuranceVerifiedAt: true,
                insuranceExpiryDate: true,
              },
            },
          },
        })
        if (dbUser) {
          token.isBanned = dbUser.isBanned
          token.needsTermsAcceptance = !dbUser.termsAcceptedAt || dbUser.termsVersion !== TERMS_VERSION || !dbUser.acceptedVia
          const insuranceExpired = dbUser.chefProfile?.insuranceExpiryDate
            ? dbUser.chefProfile.insuranceExpiryDate.getTime() < Date.now()
            : false
          token.insuranceStatus = dbUser.chefProfile?.insuranceStatus ?? null
          token.needsInsuranceVerification = dbUser.role === Role.CHEF
            ? dbUser.chefProfile?.insuranceStatus !== "verified"
              || !dbUser.chefProfile?.insuranceDocumentUrl
              || !dbUser.chefProfile?.insuranceVerifiedAt
              || insuranceExpired
            : false
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.role) {
        session.user.role = token.role as Role
      }
      if (token.sub) {
        session.user.id = token.sub
      }
      if (token.isBanned !== undefined) {
        session.user.isBanned = token.isBanned
      }
      if (token.needsTermsAcceptance !== undefined) {
        session.user.needsTermsAcceptance = token.needsTermsAcceptance
      }
      if (token.insuranceStatus !== undefined) {
        session.user.insuranceStatus = token.insuranceStatus
      }
      if (token.needsInsuranceVerification !== undefined) {
        session.user.needsInsuranceVerification = token.needsInsuranceVerification
      }
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
