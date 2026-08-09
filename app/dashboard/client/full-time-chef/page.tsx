import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { FullTimeChefEnquiryForm } from "@/components/full-time-chef-enquiry-form"
import { authOptions } from "@/lib/auth"
import { generateMeta } from "@/lib/utils"

export const metadata: Metadata = generateMeta({
  title: "Full-Time Chef Placement",
  description: "Submit a full-time or household chef placement enquiry.",
})

export default async function FullTimeChefPage({
  searchParams,
}: {
  searchParams?: Promise<{ draft?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CLIENT") {
    redirect("/dashboard")
  }
  const params = searchParams ? await searchParams : {}

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-5">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Full-Time Chef Placement</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Use this separate placement workflow for household, live-in/live-out, temporary, or permanent chef requirements.</p>
      </header>
      <FullTimeChefEnquiryForm initialDraftId={params.draft} />
    </div>
  )
}
