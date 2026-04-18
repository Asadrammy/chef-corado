import { NextResponse } from "next/server"
import { proposalService } from "@/lib/services/proposal-service"
import { logger } from "@/lib/logger"

/**
 * Proposal Expiry Cron Job
 * Runs every hour to expire stale proposals
 * 
 * Configuration in vercel.json:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/expire-proposals",
 *       "schedule": "0 * * * *"
 *     }
 *   ]
 * }
 */

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const isVercelCron = request.headers.get("x-vercel-cron") === "1"
    if (!isVercelCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const startTime = Date.now()

  try {
    logger.info("[CRON] Starting proposal expiry check")

    const result = await proposalService.checkAndExpireProposals()

    const duration = Date.now() - startTime

    logger.info("[CRON] Proposal expiry check completed", {
      duration: `${duration}ms`,
      expired: result.expired,
    })

    return NextResponse.json({
      success: true,
      expired: result.expired,
      duration: `${duration}ms`,
    })
  } catch (error) {
    logger.error("[CRON] Proposal expiry check failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
