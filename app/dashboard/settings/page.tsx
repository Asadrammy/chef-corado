import { Metadata } from "next"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions, isLocalDemoSessionUser } from "@/lib/auth"
import { isPrismaConnectionError, prisma } from "@/lib/prisma"
import { getUserImageByEmail, getUserImageById } from "@/lib/user-profile-image"
import { buildUserProfileSelect } from "@/lib/user-profile-schema"
import { generateMeta } from "@/lib/utils"
import { SettingsDashboard } from "@/components/settings-dashboard"

export const metadata: Metadata = generateMeta({
  title: "Settings",
  description: "Manage your account, profile, and preferences.",
})

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  cookies()

  let profile: {
    name: string
    email: string
    username: string | null
    bio: string | null
    phone: string | null
    website: string | null
    socialProfile: string | null
    image: string | null
    profileCompletion: number
  } | null = null
  try {
    const select = await buildUserProfileSelect()
    const user = await prisma.user.findUnique({
      where: isLocalDemoSessionUser(session.user.id, session.user.email) && session.user.email
        ? { email: session.user.email }
        : { id: session.user.id },
      select,
    })
    if (user) {
      const safeUser = user as unknown as {
        name: string
        email: string
        username?: string | null
        bio?: string | null
        phone?: string | null
        website?: string | null
        socialProfile?: string | null
        profileCompletion?: number | null
      }

      profile = {
        name: safeUser.name,
        email: safeUser.email,
        username: safeUser.username ?? null,
        bio: safeUser.bio ?? null,
        phone: safeUser.phone ?? null,
        website: safeUser.website ?? null,
        socialProfile: safeUser.socialProfile ?? null,
        image: isLocalDemoSessionUser(session.user.id, session.user.email) && session.user.email
          ? await getUserImageByEmail(session.user.email)
          : await getUserImageById(session.user.id),
        profileCompletion: safeUser.profileCompletion ?? 0,
      }
    }
  } catch (error) {
    if (!isPrismaConnectionError(error)) {
      throw error
    }
  }

  return (
    <SettingsDashboard initialProfile={profile} />
  )
}
