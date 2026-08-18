import { NextResponse } from "next/server"
import { requireAdminPermission } from "@/lib/admin-rbac"
import { getConfiguredAppBaseUrl } from "@/lib/site-config"

/**
 * Manual cron trigger for development/admin use
 * Only accessible by admins
 */

export async function POST(request: Request) {
  try {
    await requireAdminPermission("platformSettings.manage")

    const { searchParams } = new URL(request.url)
    const job = searchParams.get("job")

    if (!job) {
      return NextResponse.json({ error: "Job parameter required" }, { status: 400 })
    }

    let jobUrl: string
    switch (job) {
      case "expire-proposals":
        jobUrl = "/api/cron/expire-proposals"
        break
      case "process-events":
        jobUrl = "/api/cron/process-events"
        break
      default:
        return NextResponse.json({ error: "Invalid job type" }, { status: 400 })
    }

    // Call the cron endpoint
    const baseUrl = getConfiguredAppBaseUrl()
    const cronSecret = process.env.CRON_SECRET

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (cronSecret) {
      headers["Authorization"] = `Bearer ${cronSecret}`
    }

    const response = await fetch(`${baseUrl}${jobUrl}`, {
      method: "GET",
      headers,
    })

    const result = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        error: "Cron job failed",
        job,
        details: result,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      job,
      result,
    })

  } catch (error) {
    return NextResponse.json({
      error: "Unauthorized",
    }, { status: 401 })
  }
}
