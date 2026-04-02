import { Metadata } from "next"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"

import { authOptions } from "@/lib/auth"
import { generateMeta } from "@/lib/utils"
import { ClientProposalsList } from "@/components/client-proposals-list"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = generateMeta({
  title: "Client Proposals",
  description: "Review proposals sent by chefs for your event requests.",
})

export default async function ClientProposalsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CLIENT") {
    redirect("/dashboard")
  }

  cookies()

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-6xl mx-auto py-10">
        <header className="flex justify-between items-center mb-8 gap-6">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">Client Workspace</p>
            <h1 className="text-4xl font-semibold tracking-tight">Compare Proposals</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Review offers from chefs, compare pricing, and choose the best fit for your event.
            </p>
          </div>

          <Link href="/dashboard/client/create-request">
            <Button
              className="bg-black text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-900 transition active:scale-95"
            >
              Post New Request
            </Button>
          </Link>
        </header>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-white opacity-60 blur-2xl" />
          <div className="relative z-10">
            <ClientProposalsList />
          </div>
        </div>
      </div>
    </div>
  )
}
