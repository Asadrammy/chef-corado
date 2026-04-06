import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { RequestForm } from "@/components/request-form"

export const metadata: Metadata = generateMeta({
  title: "Plan Your Perfect Dining Experience",
  description: "Tell us a few details and get matched with top private chefs for your special event.",
})

export default async function CreateRequestPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CLIENT") {
    redirect("/dashboard")
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-1 py-2 md:px-2 md:py-4">
      <div className="flex flex-col gap-3 border-b border-border pb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Create request
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            Share the essentials of your event and receive tailored proposals from chefs who match your date, location, and budget.
          </p>
        </div>
      </div>

      <RequestForm />
    </div>
  )
}
