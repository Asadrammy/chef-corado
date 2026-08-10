import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { SupportTicketWorkspace } from "@/components/support-ticket-workspace"
import { authOptions } from "@/lib/auth"

export default async function ClientSupportPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CLIENT") {
    redirect("/dashboard")
  }

  return <SupportTicketWorkspace roleLabel="Client" />
}
