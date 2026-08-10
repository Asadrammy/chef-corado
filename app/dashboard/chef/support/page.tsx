import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { SupportTicketWorkspace } from "@/components/support-ticket-workspace"
import { authOptions } from "@/lib/auth"

export default async function ChefSupportPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CHEF") {
    redirect("/dashboard")
  }

  return <SupportTicketWorkspace roleLabel="Chef" />
}
