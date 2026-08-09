import { NextResponse } from "next/server"
import { z } from "zod"

import { adminApiError, requireAdminPermission } from "@/lib/admin-rbac"
import { prisma } from "@/lib/prisma"
import { COUNTRY_OPTIONS, REQUEST_SERVICE_TYPES } from "@/lib/request-options"
import { canTransitionPricingRule, PRICING_RULE_STATUSES, transitionPricingRule } from "@/lib/services/pricing-rule-service"

const serviceTypes = [...REQUEST_SERVICE_TYPES] as [string, ...string[]]
const countryCodes = COUNTRY_OPTIONS.map((country) => country.value) as [string, ...string[]]
const currencies = COUNTRY_OPTIONS.map((country) => country.currency) as [string, ...string[]]

const pricingRuleSchema = z.object({
  id: z.string().min(1).optional(),
  serviceType: z.enum(serviceTypes),
  countryCode: z.enum(countryCodes),
  currency: z.enum(currencies),
  tier: z.string().max(100).optional().nullable(),
  minGuests: z.number().int().min(1).max(1000).optional().nullable(),
  maxGuests: z.number().int().min(1).max(1000).optional().nullable(),
  minimumSpend: z.number().positive().optional().nullable(),
  pricePerPersonMin: z.number().positive().optional().nullable(),
  pricePerPersonMax: z.number().positive().optional().nullable(),
  customerGuidance: z.string().max(2000).optional().nullable(),
  warningCopy: z.string().max(1000).optional().nullable(),
  evidenceSource: z.string().max(1000).optional().nullable(),
  evidenceNotes: z.string().max(3000).optional().nullable(),
  status: z.enum(PRICING_RULE_STATUSES).default("DRAFT"),
  version: z.string().min(3).max(100),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional().nullable(),
}).superRefine((data, context) => {
  if (data.minGuests && data.maxGuests && data.minGuests > data.maxGuests) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maxGuests"],
      message: "Maximum guests must be greater than or equal to minimum guests",
    })
  }

  if (data.pricePerPersonMin && data.pricePerPersonMax && data.pricePerPersonMin > data.pricePerPersonMax) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["pricePerPersonMax"],
      message: "Maximum price per person must be greater than or equal to minimum",
    })
  }
})

export async function GET() {
  try {
    await requireAdminPermission("servicePricing.view")

    const rules = await prisma.servicePricingRule.findMany({
      orderBy: [{ serviceType: "asc" }, { countryCode: "asc" }, { tier: "asc" }],
    })

    return NextResponse.json({ rules })
  } catch (error) {
    return adminApiError(error, "Admin Pricing Rules GET")
  }
}

export async function POST(request: Request) {
  let session
  try {
    session = await requireAdminPermission("servicePricing.view")
  } catch (error) {
    return adminApiError(error, "Admin Pricing Rules POST")
  }

  const json = await request.json().catch(() => null)
  const parsed = pricingRuleSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 422 })
  }

  const payload = parsed.data
  const existing = payload.id
    ? await prisma.servicePricingRule.findUnique({ where: { id: payload.id } })
    : null

  if (!existing && payload.status !== "DRAFT") {
    return NextResponse.json({ error: "New pricing rules must be created as DRAFT before review or activation." }, { status: 422 })
  }

  try {
    if (!existing) {
      await requireAdminPermission("servicePricing.create")
    } else if (payload.status !== existing.status && payload.status === "ACTIVE") {
      await requireAdminPermission("servicePricing.activate")
    } else {
      await requireAdminPermission("servicePricing.edit")
    }
  } catch (error) {
    return adminApiError(error, "Admin Pricing Rules permission")
  }

  if (existing && payload.status !== existing.status && !canTransitionPricingRule(existing.status, payload.status)) {
    return NextResponse.json({ error: `Invalid pricing rule transition from ${existing.status} to ${payload.status}.` }, { status: 422 })
  }

  const saved = existing
    ? await prisma.servicePricingRule.update({
      where: { id: existing.id },
      data: {
        serviceType: payload.serviceType,
        countryCode: payload.countryCode,
        currency: payload.currency,
        tier: payload.tier ?? null,
        minGuests: payload.minGuests ?? null,
        maxGuests: payload.maxGuests ?? null,
        minimumSpend: payload.minimumSpend ?? null,
        pricePerPersonMin: payload.pricePerPersonMin ?? null,
        pricePerPersonMax: payload.pricePerPersonMax ?? null,
        customerGuidance: payload.customerGuidance ?? null,
        warningCopy: payload.warningCopy ?? null,
        evidenceSource: payload.evidenceSource ?? null,
        evidenceNotes: payload.evidenceNotes ?? null,
        version: payload.version,
        effectiveFrom: payload.effectiveFrom ? new Date(payload.effectiveFrom) : existing.effectiveFrom,
        effectiveTo: payload.effectiveTo ? new Date(payload.effectiveTo) : null,
        updatedBy: session.userId,
      },
    })
    : await prisma.servicePricingRule.create({
      data: {
      serviceType: payload.serviceType,
      countryCode: payload.countryCode,
      currency: payload.currency,
      tier: payload.tier ?? null,
      minGuests: payload.minGuests ?? null,
      maxGuests: payload.maxGuests ?? null,
      minimumSpend: payload.minimumSpend ?? null,
      pricePerPersonMin: payload.pricePerPersonMin ?? null,
      pricePerPersonMax: payload.pricePerPersonMax ?? null,
      customerGuidance: payload.customerGuidance ?? null,
      warningCopy: payload.warningCopy ?? null,
      evidenceSource: payload.evidenceSource ?? null,
      evidenceNotes: payload.evidenceNotes ?? null,
      status: "DRAFT",
      version: payload.version,
      effectiveFrom: payload.effectiveFrom ? new Date(payload.effectiveFrom) : new Date(),
      effectiveTo: payload.effectiveTo ? new Date(payload.effectiveTo) : null,
      createdBy: session.userId,
      updatedBy: session.userId,
      },
    })

  await prisma.auditLog.create({
    data: {
      action: existing ? "PRICING_RULE_UPDATED" : "PRICING_RULE_CREATED",
      entityType: "ServicePricingRule",
      entityId: saved.id,
      oldValue: existing ? JSON.stringify(existing) : null,
      newValue: JSON.stringify(saved),
      performedBy: session.userId,
      reason: "Admin pricing configuration change",
    },
  })

  const finalRule = existing && payload.status !== existing.status
    ? await transitionPricingRule({
      ruleId: saved.id,
      toStatus: payload.status,
      actorId: session.userId,
      reason: "Admin pricing configuration lifecycle change",
    })
    : saved

  return NextResponse.json({ rule: finalRule })
}
