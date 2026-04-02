import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

import { authOptions } from "@/lib/auth"
import { ChefRequestsMarketplace } from "@/components/chef-requests-marketplace"

export const metadata: Metadata = generateMeta({
  title: "Incoming Requests",
  description: "Browse and respond to client requests in your area",
})

export default async function ChefRequestsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CHEF") {
    redirect("/dashboard")
  }

  const cookieHeader = (await cookies()).toString()
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
  const response = await fetch(`${baseUrl}/api/requests`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    if (errorData.needsProfile) {
      redirect("/dashboard/chef/profile")
    }
    redirect("/dashboard")
  }

  const payload = await response.json().catch(() => ({ requests: [] }))
  const requests = payload.requests ?? []

  return (
    <div className="bg-gray-50 min-h-screen">
      <ChefRequestsMarketplace requests={requests} />
    </div>
  )
}
