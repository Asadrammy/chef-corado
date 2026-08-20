import { Metadata } from "next"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions, isLocalDemoSessionUser } from "@/lib/auth"
import { isPrismaConnectionError, prisma } from "@/lib/prisma"
import { getUserImageByEmail, getUserImageById } from "@/lib/user-profile-image"
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
    image: string | null
    profileCompletion: number
  } | null = null
  try {
    const user = await prisma.user.findUnique({
      where: isLocalDemoSessionUser(session.user.id, session.user.email) && session.user.email
        ? { email: session.user.email }
        : { id: session.user.id },
      select: {
        name: true,
        email: true,
        profileCompletion: true,
      },
    })
    if (user) {
      profile = {
        ...user,
        image: isLocalDemoSessionUser(session.user.id, session.user.email) && session.user.email
          ? await getUserImageByEmail(session.user.email)
          : await getUserImageById(session.user.id),
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
