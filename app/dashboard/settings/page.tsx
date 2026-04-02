import { Metadata } from "next"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
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

  return (
    <SettingsDashboard />
  )
}
