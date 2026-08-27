import { Metadata } from "next"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { formatCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"
import { COUNTRY_OPTIONS, SERVICE_TYPE_OPTIONS } from "@/lib/request-options"
import { buildServicePricingRuleOrderBy, buildServicePricingRuleSelect, isServicePricingSchemaMismatch } from "@/lib/service-pricing-schema"
import { generateMeta } from "@/lib/utils"

export const metadata: Metadata = generateMeta({
  title: "Service Pricing",
  description: "Configure service-specific pricing guidance and evidence.",
})

export default async function AdminPricingPage() {
  await requireAdminPagePermission("servicePricing.view")

  let persistedRules: Array<{
    id: string
    serviceType: string
    countryCode: string
    currency: string
    tier: string | null
    minimumSpend: number | null
    pricePerPersonMin: number | null
    pricePerPersonMax: number | null
    status: string
    version: string
    evidenceSource: string | null
  }> = []

  try {
    const select = await buildServicePricingRuleSelect([
      "id",
      "serviceType",
      "countryCode",
      "currency",
      "tier",
      "minimumSpend",
      "pricePerPersonMin",
      "pricePerPersonMax",
      "status",
      "version",
      "evidenceSource",
    ])
    const orderBy = await buildServicePricingRuleOrderBy(["serviceType", "countryCode", "tier"])

    if (!select) {
      persistedRules = []
    } else {
      persistedRules = await prisma.servicePricingRule.findMany({
        ...(orderBy ? { orderBy } : {}),
        select,
      })
    }
  } catch (error) {
    if (!isServicePricingSchemaMismatch(error)) {
      throw error
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border bg-background p-6 shadow-sm">
        <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Admin pricing</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Service pricing configuration</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Pricing rules are versioned by service, country, currency, and tier. Active rules can be enforced by backend proposal validation; draft and client-confirmation rules remain guidance only.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        {SERVICE_TYPE_OPTIONS.map((service) => {
          const countryLabels = service.supportedCountries
            .map((code) => COUNTRY_OPTIONS.find((country) => country.value === code)?.label ?? code)
            .join(", ")
          const dbRules = persistedRules.filter((rule) => rule.serviceType === service.id)

          return (
            <Card key={service.id} className="rounded-2xl">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{service.label}</CardTitle>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{service.description}</p>
                  </div>
                  <Badge variant={service.status === "ACTIVE" ? "default" : "secondary"}>{service.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Booking mode</p>
                    <p className="font-medium text-foreground">{service.bookingMode}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Countries</p>
                    <p className="font-medium text-foreground">{countryLabels}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Guest range</p>
                    <p className="font-medium text-foreground">{service.minGuests ?? "Any"} - {service.maxGuests ?? "Any"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Version</p>
                    <p className="font-medium text-foreground">{service.version}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <p className="font-medium text-foreground">Configured guidance</p>
                  <div className="mt-2 space-y-2">
                    {[...service.pricingRules, ...dbRules].map((rule) => (
                      <div key={rule.id} className="rounded-lg border border-border bg-background p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-foreground">{rule.countryCode} {rule.tier ? `- ${rule.tier}` : ""}</p>
                          <Badge variant={rule.status === "ACTIVE" ? "default" : "secondary"}>{rule.status}</Badge>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          Minimum: {rule.minimumSpend ? formatCurrency(rule.minimumSpend, rule.currency) : "Not set"}
                          {rule.pricePerPersonMin && rule.pricePerPersonMax
                            ? ` - Guidance: ${formatCurrency(rule.pricePerPersonMin, rule.currency)} to ${formatCurrency(rule.pricePerPersonMax, rule.currency)}`
                            : ""}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{rule.evidenceSource ?? "No evidence source recorded"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>
    </div>
  )
}
