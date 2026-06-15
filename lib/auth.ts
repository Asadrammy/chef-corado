import { compare } from "bcrypt"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { type AuthOptions, DefaultSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

import { isPrismaConnectionError, prisma } from "@/lib/prisma"
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
      complianceStatus?: string | null
      needsChefCompliance?: boolean
      // Backward-compatible legacy aliases
      insuranceStatus?: string | null
      needsInsuranceVerification?: boolean
    } & DefaultSession["user"]
  }

  interface User {
    isBanned?: boolean
    needsTermsAcceptance?: boolean
    complianceStatus?: string | null
    needsChefCompliance?: boolean
    insuranceStatus?: string | null
    needsInsuranceVerification?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isBanned?: boolean
    needsTermsAcceptance?: boolean
    complianceStatus?: string | null
    needsChefCompliance?: boolean
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

const localDemoUsers: Record<string, AuthUser & { password: string }> = {
  "admin@example.com": {
    id: "local-demo-admin-user",
    name: "Sarah Mitchell",
    email: "admin@example.com",
    password: "admin123",
    role: Role.ADMIN,
  },
  "chef@example.com": {
    id: "cmph911b10001byd5xgn4e5o1",
    name: "John Anderson",
    email: "chef@example.com",
    password: "chef123",
    role: Role.CHEF,
  },
  "client@example.com": {
    id: "local-demo-client-user",
    name: "Olivia Parker",
    email: "client@example.com",
    password: "client123",
    role: Role.CLIENT,
  },
}

function getLocalDemoUser(email: string, password: string): AuthUser | null {
  if (process.env.NODE_ENV !== "development") {
    return null
  }

  const demoUser = localDemoUsers[email.toLowerCase()]
  if (!demoUser || demoUser.password !== password) {
    return null
  }

  const { password: _password, ...authUser } = demoUser
  return authUser
}

const nextAuthSecret = process.env.NEXTAUTH_SECRET ?? (process.env.NODE_ENV === "production" ? undefined : "chef-development-nextauth-secret")

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
          console.log("Missing credentials")
          return null
        }

        console.log("Attempting login for:", credentials.email.toLowerCase())

        const normalizedEmail = credentials.email.toLowerCase()

        let user
        try {
          user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: {
              id: true,
              name: true,
              email: true,
              password: true,
              role: true,
              isBanned: true,
            },
          })
        } catch (error) {
          if (isPrismaConnectionError(error)) {
            const localDemoUser = getLocalDemoUser(normalizedEmail, credentials.password)
            if (localDemoUser) {
              console.log("Local demo login successful for:", localDemoUser.email)
              return localDemoUser
            }
          }

          throw error
        }

        if (!user) {
          console.log("User not found:", normalizedEmail)
          return null
        }

        if (user.isBanned) {
          console.log("User is banned:", user.email)
          throw new Error("ACCOUNT_BANNED")
        }

        const isValidPassword = await compare(credentials.password, user.password)
        console.log("Password valid:", isValidPassword)

        if (!isValidPassword) {
          return null
        }

        const authUser: AuthUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as Role,
        }

        console.log("Login successful for:", authUser.email)
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
        let dbUser
        try {
          dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
              isBanned: true,
              termsAcceptedAt: true,
              termsVersion: true,
              acceptedVia: true,
              role: true,
            },
          })
        } catch (error) {
          if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
            dbUser = {
              isBanned: false,
              termsAcceptedAt: new Date(),
              termsVersion: TERMS_VERSION,
              acceptedVia: "local-demo",
              role: user.role,
            }
          } else {
            throw error
          }
        }

        if (dbUser) {
          token.isBanned = dbUser.isBanned
          token.needsTermsAcceptance = !dbUser.termsAcceptedAt || dbUser.termsVersion !== TERMS_VERSION || !dbUser.acceptedVia
          token.complianceStatus = null
          token.needsChefCompliance = dbUser.role === Role.CHEF
          token.insuranceStatus = null
          token.needsInsuranceVerification = dbUser.role === Role.CHEF
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
      if (token.complianceStatus !== undefined) {
        session.user.complianceStatus = token.complianceStatus
      }
      if (token.needsChefCompliance !== undefined) {
        session.user.needsChefCompliance = token.needsChefCompliance
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
  secret: nextAuthSecret,
  debug: false,
}
