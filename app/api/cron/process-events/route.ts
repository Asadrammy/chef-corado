import { NextResponse } from "next/server"
import { eventQueueService } from "@/lib/services/event-queue-service"
import { logger } from "@/lib/logger"

/**
 * Event Queue Processing Worker
 * This endpoint is called by Vercel Cron to process pending events
 * 
 * Configuration in vercel.json:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/process-events",
 *       "schedule": "*\/5 * * * *"
 *     }
 *   ]
 * }
 */

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startTime = Date.now()

  try {
    logger.info("[CRON] Starting event queue processing")

    // Process pending events in batches
    const result = await eventQueueService.processPendingEvents(50)

    const duration = Date.now() - startTime

    logger.info("[CRON] Event queue processing completed", {
      duration: `${duration}ms`,
      processed: result.processed,
      failed: result.failed,
      remaining: result.remaining,
    })

    return NextResponse.json({
      success: true,
      processed: result.processed,
      failed: result.failed,
      remaining: result.remaining,
      duration: `${duration}ms`,
    })
  } catch (error) {
    logger.error("[CRON] Event queue processing failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
