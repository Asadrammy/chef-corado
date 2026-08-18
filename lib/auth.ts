import { compare } from "bcrypt"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { type AuthOptions, DefaultSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

import { isPrismaConnectionError, prisma, withPrismaReconnect } from "@/lib/prisma"
import { TERMS_VERSION } from "@/lib/request-options"
import { roleDashboardPath } from "@/lib/role-routes"
import { requiresEmailVerification } from "@/lib/email-verification"
import { Role } from "@/types"

// Extend NextAuth types to include isBanned
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      isBanned?: boolean
      needsTermsAcceptance?: boolean
      needsEmailVerification?: boolean
      complianceStatus?: string | null
      needsChefCompliance?: boolean
      adminRole?: string | null
      adminPermissions?: string | null
      // Backward-compatible legacy aliases
      insuranceStatus?: string | null
      needsInsuranceVerification?: boolean
    } & DefaultSession["user"]
  }

  interface User {
    isBanned?: boolean
    needsTermsAcceptance?: boolean
    needsEmailVerification?: boolean
    complianceStatus?: string | null
    needsChefCompliance?: boolean
    adminRole?: string | null
    adminPermissions?: string | null
    insuranceStatus?: string | null
    needsInsuranceVerification?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isBanned?: boolean
    needsTermsAcceptance?: boolean
    needsEmailVerification?: boolean
    complianceStatus?: string | null
    needsChefCompliance?: boolean
    adminRole?: string | null
    adminPermissions?: string | null
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

export type SessionComplianceRecord = {
  isBanned: boolean
  verified: boolean
  createdAt: Date
  termsAcceptedAt: Date | null
  termsVersion: string | null
  acceptedVia: string | null
  role: Role | string
  adminRole?: string | null
  adminPermissions?: string | null
  chefProfile: {
    rightToWorkUkConfirmed: boolean
    foodHygieneLevel2Confirmed: boolean
    foodHygieneCertificateUrl: string | null
    foodHygieneCertificateReviewStatus: string | null
    verificationStatus: string | null
    isApproved: boolean
    isBanned: boolean
  } | null
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

const localDemoUserById = Object.values(localDemoUsers).reduce<Record<string, AuthUser & { password: string }>>(
  (acc, user) => {
    acc[user.id] = user
    return acc
  },
  {}
)

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

export function isLocalDemoSessionUser(userId?: string | null, email?: string | null) {
  if (process.env.NODE_ENV !== "development") {
    return false
  }

  return Boolean(
    (email && localDemoUsers[email.toLowerCase()]) ||
    (userId && localDemoUserById[userId]) ||
    userId?.startsWith("local-demo-")
  )
}

export function getLocalDemoSessionRecord(userId?: string | null, email?: string | null, role?: Role | string | null): SessionComplianceRecord | null {
  if (process.env.NODE_ENV !== "development") {
    return null
  }

  const demoUser = (email ? localDemoUsers[email.toLowerCase()] : null) || (userId ? localDemoUserById[userId] : null)
  const isSyntheticDemoUser = Boolean(userId?.startsWith("local-demo-"))
  const resolvedRole = (demoUser?.role || role) as Role | undefined

  if (!resolvedRole || (!demoUser && !isSyntheticDemoUser)) {
    return null
  }

  return {
    isBanned: false,
    verified: true,
    createdAt: new Date(),
    termsAcceptedAt: new Date(),
    termsVersion: TERMS_VERSION,
    acceptedVia: "local-demo",
    role: resolvedRole,
    adminRole: resolvedRole === Role.ADMIN ? "SUPER_ADMIN" : null,
    adminPermissions: null,
    chefProfile: resolvedRole === Role.CHEF
      ? {
          rightToWorkUkConfirmed: true,
          foodHygieneLevel2Confirmed: true,
          foodHygieneCertificateUrl: "local-demo",
          foodHygieneCertificateReviewStatus: "APPROVED",
          verificationStatus: "APPROVED",
          isApproved: true,
          isBanned: false,
        }
      : null,
  }
}

const nextAuthSecret = process.env.NEXTAUTH_SECRET ?? (process.env.NODE_ENV === "production" ? undefined : "chef-development-nextauth-secret")

export { roleDashboardPath }

export const authOptions: AuthOptions = {
  adapter: process.env.NODE_ENV === "development" ? undefined : PrismaAdapter(prisma),
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
        const localDemoUser = getLocalDemoUser(normalizedEmail, credentials.password)

        if (localDemoUser) {
          console.log("Local demo login successful for:", localDemoUser.email)
          return localDemoUser
        }

        let user
        try {
          user = await withPrismaReconnect(() =>
            prisma.user.findUnique({
              where: { email: normalizedEmail },
              select: {
                id: true,
                name: true,
                email: true,
                password: true,
                role: true,
                isBanned: true,
                verified: true,
                createdAt: true,
              },
            }),
            2
          )
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

        if (requiresEmailVerification({ role: user.role, verified: user.verified, createdAt: user.createdAt })) {
          throw new Error("EMAIL_NOT_VERIFIED")
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
      const tokenUserId = user?.id ?? token.sub
      // Refresh legal/compliance flags whenever the JWT callback runs so re-acceptance updates are reflected.
      if (tokenUserId) {
        const currentRole = (user?.role ?? token.role) as Role | undefined
        let dbUser: SessionComplianceRecord | null = getLocalDemoSessionRecord(tokenUserId, token.email, currentRole)
        if (!dbUser) {
          try {
            dbUser = await withPrismaReconnect(() =>
              prisma.user.findUnique({
                where: { id: tokenUserId },
                select: {
                  isBanned: true,
                  verified: true,
                  createdAt: true,
                  termsAcceptedAt: true,
                  termsVersion: true,
                  acceptedVia: true,
                  role: true,
                  adminRole: true,
                  adminPermissions: true,
                  chefProfile: {
                    select: {
                      rightToWorkUkConfirmed: true,
                      foodHygieneLevel2Confirmed: true,
                      foodHygieneCertificateUrl: true,
                      foodHygieneCertificateReviewStatus: true,
                      verificationStatus: true,
                      isApproved: true,
                      isBanned: true,
                    },
                  },
                },
              }),
              2
            )
          } catch (error) {
            if (isPrismaConnectionError(error) && currentRole) {
              dbUser = getLocalDemoSessionRecord(tokenUserId, token.email, currentRole)
            } else {
              throw error
            }
          }
        }

        if (dbUser) {
          token.isBanned = dbUser.isBanned
          token.needsEmailVerification = requiresEmailVerification({ role: dbUser.role, verified: dbUser.verified, createdAt: dbUser.createdAt })
          token.needsTermsAcceptance = !dbUser.termsAcceptedAt || dbUser.termsVersion !== TERMS_VERSION || !dbUser.acceptedVia
          token.complianceStatus = null
          token.adminRole = dbUser.adminRole ?? null
          token.adminPermissions = dbUser.adminPermissions ?? null
          token.needsChefCompliance = dbUser.role === Role.CHEF
            ? !dbUser.chefProfile ||
              dbUser.chefProfile.isBanned ||
              !dbUser.chefProfile.rightToWorkUkConfirmed ||
              !dbUser.chefProfile.foodHygieneLevel2Confirmed ||
              !dbUser.chefProfile.foodHygieneCertificateUrl ||
              dbUser.chefProfile.foodHygieneCertificateReviewStatus !== "APPROVED" ||
              dbUser.chefProfile.verificationStatus !== "APPROVED" ||
              !dbUser.chefProfile.isApproved
            : false
          token.insuranceStatus = null
          token.needsInsuranceVerification = false
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
      if (token.needsEmailVerification !== undefined) {
        session.user.needsEmailVerification = token.needsEmailVerification
      }
      if (token.complianceStatus !== undefined) {
        session.user.complianceStatus = token.complianceStatus
      }
      if (token.adminRole !== undefined) {
        session.user.adminRole = token.adminRole
      }
      if (token.adminPermissions !== undefined) {
        session.user.adminPermissions = token.adminPermissions
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
