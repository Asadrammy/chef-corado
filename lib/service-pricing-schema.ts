import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

export type ServicePricingRuleColumnAvailability = {
  id: boolean
  serviceType: boolean
  countryCode: boolean
  currency: boolean
  tier: boolean
  minGuests: boolean
  maxGuests: boolean
  minimumSpend: boolean
  pricePerPersonMin: boolean
  pricePerPersonMax: boolean
  customerGuidance: boolean
  warningCopy: boolean
  evidenceSource: boolean
  evidenceNotes: boolean
  status: boolean
  version: boolean
  effectiveFrom: boolean
  effectiveTo: boolean
  reviewedBy: boolean
  reviewedAt: boolean
  activatedBy: boolean
  activatedAt: boolean
  retiredBy: boolean
  retiredAt: boolean
  lifecycleReason: boolean
  childrenRuleSummary: boolean
  createdBy: boolean
  updatedBy: boolean
  createdAt: boolean
  updatedAt: boolean
}

const SERVICE_PRICING_RULE_COLUMNS = [
  "id",
  "serviceType",
  "countryCode",
  "currency",
  "tier",
  "minGuests",
  "maxGuests",
  "minimumSpend",
  "pricePerPersonMin",
  "pricePerPersonMax",
  "customerGuidance",
  "warningCopy",
  "evidenceSource",
  "evidenceNotes",
  "status",
  "version",
  "effectiveFrom",
  "effectiveTo",
  "reviewedBy",
  "reviewedAt",
  "activatedBy",
  "activatedAt",
  "retiredBy",
  "retiredAt",
  "lifecycleReason",
  "childrenRuleSummary",
  "createdBy",
  "updatedBy",
  "createdAt",
  "updatedAt",
] as const satisfies readonly (keyof ServicePricingRuleColumnAvailability)[]

let cachedAvailability: ServicePricingRuleColumnAvailability | null = null

async function hasServicePricingRuleColumn(columnName: string) {
  if (typeof prisma.$queryRaw !== "function") {
    return process.env.NODE_ENV === "test"
  }

  if (process.env.NODE_ENV === "test") {
    return true
  }

  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'ServicePricingRule'
        AND column_name = ${columnName}
    ) AS "exists"
  `

  return Boolean(rows[0]?.exists)
}

export async function getServicePricingRuleColumnAvailability(): Promise<ServicePricingRuleColumnAvailability> {
  if (cachedAvailability) {
    return cachedAvailability
  }

  const entries = await Promise.all(
    SERVICE_PRICING_RULE_COLUMNS.map(async (column) => [column, await hasServicePricingRuleColumn(column)] as const)
  )

  cachedAvailability = Object.fromEntries(entries) as ServicePricingRuleColumnAvailability
  return cachedAvailability
}

export function isServicePricingSchemaMismatch(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return [
    "P2021",
    "P2022",
    "ColumnNotFound",
    "TableDoesNotExist",
    "relation \"ServicePricingRule\" does not exist",
    "does not exist in the current database",
  ].some((pattern) => message.includes(pattern))
}

export async function buildServicePricingRuleSelect(
  fields: readonly (keyof ServicePricingRuleColumnAvailability)[]
): Promise<Prisma.ServicePricingRuleSelect | null> {
  const availability = await getServicePricingRuleColumnAvailability()
  const select: Prisma.ServicePricingRuleSelect = {}

  for (const field of fields) {
    if (availability[field]) {
      select[field] = true
    }
  }

  return Object.keys(select).length > 0 ? select : null
}

export async function buildServicePricingRuleOrderBy(
  fields: readonly (keyof ServicePricingRuleColumnAvailability)[],
  direction: "asc" | "desc" = "asc"
): Promise<Prisma.ServicePricingRuleOrderByWithRelationInput[] | null> {
  const availability = await getServicePricingRuleColumnAvailability()
  const orderBy = fields
    .filter((field) => availability[field])
    .map((field) => ({ [field]: direction }) as Prisma.ServicePricingRuleOrderByWithRelationInput)

  return orderBy.length > 0 ? orderBy : null
}

export async function buildActiveServicePricingRuleWhere(input: {
  serviceType: string
  countryCode: string
  tier?: string | null
  now?: Date
}) {
  const availability = await getServicePricingRuleColumnAvailability()
  if (!availability.serviceType || !availability.countryCode || !availability.status) {
    return null
  }

  const now = input.now ?? new Date()
  const where: Prisma.ServicePricingRuleWhereInput = {}
  const andClauses: Prisma.ServicePricingRuleWhereInput[] = []

  if (availability.serviceType) {
    where.serviceType = input.serviceType
  }

  if (availability.countryCode) {
    where.countryCode = input.countryCode
  }

  if (availability.status) {
    where.status = "ACTIVE"
  }

  if (availability.effectiveFrom) {
    where.effectiveFrom = { lte: now }
  }

  if (availability.effectiveTo) {
    andClauses.push({
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
    })
  }

  if (availability.tier && input.tier !== undefined) {
    andClauses.push({
      OR: [
        { tier: input.tier ?? null },
        { tier: null },
      ],
    })
  }

  if (andClauses.length > 0) {
    where.AND = andClauses
  }

  return Object.keys(where).length > 0 ? where : null
}
