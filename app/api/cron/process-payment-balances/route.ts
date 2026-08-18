import Stripe from "stripe"
import { NextRequest, NextResponse } from "next/server"

import { paymentPlanService } from "@/lib/services/payment-plan-service"

function assertCronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) throw new Error("CRON_SECRET_NOT_CONFIGURED")
  const header = request.headers.get("authorization")
  if (header !== `Bearer ${secret}`) throw new Error("UNAUTHORIZED")
}

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes("placeholder")) {
    throw new Error("STRIPE_NOT_CONFIGURED")
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia" as Stripe.LatestApiVersion,
  })
}

export async function POST(request: NextRequest) {
  try {
    assertCronAuthorized(request)
    const stripe = getStripeClient()
    const result = await paymentPlanService.processDueBalanceCharges({ stripe })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process due balances"
    const status = message === "UNAUTHORIZED" ? 401 : message.endsWith("_NOT_CONFIGURED") ? 503 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
