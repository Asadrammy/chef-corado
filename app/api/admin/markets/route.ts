import { NextResponse } from "next/server"
import { z } from "zod"

import { adminApiError, requireAdminPermission } from "@/lib/admin-rbac"
import { marketConfigurationService } from "@/lib/services/market-configuration-service"

const marketPatchSchema = z.object({
  countryCode: z.enum(["GB", "US", "IT", "KE"]),
  active: z.boolean().optional(),
  bookingEnabled: z.boolean().optional(),
  paymentsEnabled: z.boolean().optional(),
  legalEnabled: z.boolean().optional(),
  internalNotes: z.string().max(2000).optional().nullable(),
  reason: z.string().max(1000).optional().nullable(),
})

export async function GET() {
  try {
    await requireAdminPermission("platformSettings.manage")
    const markets = await marketConfigurationService.listMarketConfigurations()
    return NextResponse.json({ markets })
  } catch (error) {
    return adminApiError(error, "Admin Markets GET")
  }
}

export async function PATCH(request: Request) {
  let actor
  try {
    actor = await requireAdminPermission("platformSettings.manage")
  } catch (error) {
    return adminApiError(error, "Admin Markets PATCH")
  }

  if (actor.adminRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Super Admin users can change market activation." }, { status: 403 })
  }

  const payload = marketPatchSchema.safeParse(await request.json().catch(() => null))
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.errors }, { status: 422 })
  }

  try {
    const updated = await marketConfigurationService.updateMarketConfiguration({
      countryCode: payload.data.countryCode,
      actorId: actor.userId,
      reason: payload.data.reason,
      patch: {
        active: payload.data.active,
        bookingEnabled: payload.data.bookingEnabled,
        paymentsEnabled: payload.data.paymentsEnabled,
        legalEnabled: payload.data.legalEnabled,
        internalNotes: payload.data.internalNotes,
      },
    })

    return NextResponse.json({ market: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.startsWith("MARKET_PREREQUISITES_FAILED:")) {
      return NextResponse.json({ error: message.replace("MARKET_PREREQUISITES_FAILED:", "") }, { status: 422 })
    }
    if (message.startsWith("UNKNOWN_MARKET:")) {
      return NextResponse.json({ error: "Unknown market." }, { status: 422 })
    }
    return adminApiError(error, "Admin Markets PATCH")
  }
}
