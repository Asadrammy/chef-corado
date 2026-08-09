import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { MultiDayChefHireForm } from "@/components/multi-day-chef-hire-form"
import { authOptions } from "@/lib/auth"
import { generateMeta } from "@/lib/utils"

export const metadata: Metadata = generateMeta({
  title: "Multi-Day Chef Hire",
  description: "Create a multi-day chef hire enquiry with separate dates and service needs.",
})

export default async function MultiDayChefHirePage({
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
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Multi-Day Chef Hire</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Use this separate workflow for multiple dates, daily service needs, accommodation, travel, and grouped proposals.</p>
      </header>
      <MultiDayChefHireForm initialDraftId={params.draft} />
    </div>
  )
}
