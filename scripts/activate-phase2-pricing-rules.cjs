const fs = require("node:fs")
const path = require("node:path")
const { Pool } = require("pg")

const root = path.resolve(__dirname, "..")
const envPath = path.join(root, ".env")
const actor = "system-phase2-pricing-gate"
const version = "2026-08-phase-2-uk-pricing-v1"
const effectiveFrom = "2026-08-05T00:00:00.000Z"
const childrenRuleSummary = "Adults plus children under 10 divided by 2; fractional 0.5 billable units are preserved."

function loadEnv() {
  if (!fs.existsSync(envPath)) return

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match || match[1].startsWith("#")) continue
    let value = match[2]
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[match[1]] ??= value
  }
}

function getConnectionString() {
  const rawUrl = process.env.DATABASE_PUBLIC_URL || process.env.EXTERNAL_DATABASE_URL || process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL
  if (!rawUrl) throw new Error("DATABASE_URL is not configured")

  const url = new URL(rawUrl.trim())
  for (const key of ["connection_limit", "pool_timeout", "connect_timeout", "sslmode", "ssl"]) {
    url.searchParams.delete(key)
  }
  return url.toString()
}

const sources = {
  clientSharingBuffet: "SHARING BUFFET SIMULATION CLIENT DASHBOARD.docx; observed casual dining range around GBP 320-560.",
  privateChefGeneral: "Poptop Christmas private chef guide, yhangry UK private chef pages, Airtasker UK 2026 personal chef cost guide, Hosted Dining UK 2026 private chef cost guide.",
  grazing: "GRAZING TABLE SIMULATION.docx plus Poptop grazing table UK guide: GBP 12-28 per person and GBP 500-1000 common minimum spend.",
  luxuryMenus: "Luxury Private Chef UK menu/pricing page: sharing/buffet/BBQ/canape GBP 50-100 per head; brunch/breakfast/afternoon tea GBP 40-60 per head.",
  cookingClass: "Roam@Home bespoke cookery classes: GBP 690 + VAT base class and additional participants from GBP 50.",
  kidsParty: "MELI kids party catering: GBP 150 minimum, kids GBP 9/head; C Catering children parties around GBP 10/head minimum x12.",
  deliveryPlatter: "UK delivery platter/corporate catering examples: Little Delicious GBP 8-10.50/head, Rudd Events delivery buffet from GBP 12/guest, FGF platter examples serving 10.",
}

const rules = [
  {
    serviceType: "THREE_COURSE_MEAL",
    tier: null,
    minGuests: 2,
    maxGuests: 80,
    minimumSpend: 350,
    pricePerPersonMin: 55,
    pricePerPersonMax: 85,
    customerGuidance: "Typical UK three-course private dining guidance. Chefs may quote higher for premium ingredients, weekends, or added staff.",
    warningCopy: "Your budget is below the current three-course private dining guidance.",
    evidenceSource: sources.privateChefGeneral,
    evidenceNotes: "Chosen minimum is GBP 10 below a published GBP 360 minimum-spend example and aligns with 2026 UK private-chef per-head ranges.",
  },
  {
    serviceType: "FOUR_FIVE_COURSE_MEAL",
    tier: null,
    minGuests: 2,
    maxGuests: 80,
    minimumSpend: 500,
    pricePerPersonMin: 80,
    pricePerPersonMax: 120,
    customerGuidance: "Longer multi-course private dining requires more preparation, service time, and premium ingredients.",
    warningCopy: "Your budget is below the current four-to-five-course private dining guidance.",
    evidenceSource: sources.privateChefGeneral,
    evidenceNotes: "Synthesised from public 2026 UK four/five-course ranges and private-chef per-head benchmarks.",
  },
  {
    serviceType: "SIX_NINE_COURSE_MEAL",
    tier: null,
    minGuests: 2,
    maxGuests: 50,
    minimumSpend: 700,
    pricePerPersonMin: 100,
    pricePerPersonMax: 190,
    customerGuidance: "Tasting menus require specialist preparation and are priced above standard dinner-party formats.",
    warningCopy: "Your budget is below the current tasting-menu guidance.",
    evidenceSource: `${sources.privateChefGeneral} ${sources.luxuryMenus}`,
    evidenceNotes: "Chosen range sits below luxury tasting-menu upper examples while preserving a premium tasting-menu floor.",
  },
  {
    serviceType: "SHARING_PLATES",
    tier: null,
    minGuests: 4,
    maxGuests: 180,
    minimumSpend: 400,
    pricePerPersonMin: 40,
    pricePerPersonMax: 70,
    customerGuidance: "Sharing plates are priced separately from Sharing Buffet and may vary by cuisine and staffing.",
    warningCopy: "Your budget is below the current Sharing Plates guidance.",
    evidenceSource: `${sources.privateChefGeneral} ${sources.luxuryMenus}`,
    evidenceNotes: "Uses UK private-chef sharing/larger-group ranges and keeps Sharing Plates distinct from Sharing Buffet.",
  },
  {
    serviceType: "SHARING_BUFFET",
    tier: null,
    minGuests: 6,
    maxGuests: 250,
    minimumSpend: 320,
    pricePerPersonMin: 40,
    pricePerPersonMax: 70,
    customerGuidance: "Client simulation confirms casual Sharing Buffet guidance around GBP 320-560; final chef quote depends on menu and setup.",
    warningCopy: "Your budget is below the current Sharing Buffet guidance for this tier.",
    evidenceSource: sources.clientSharingBuffet,
    evidenceNotes: "For the simulation's GBP 320-560 range, GBP 40-70/person maps cleanly to an 8-guest example while preserving the observed minimum.",
  },
  {
    serviceType: "CANAPES_AND_DRINKS",
    tier: null,
    minGuests: 6,
    maxGuests: 300,
    minimumSpend: 300,
    pricePerPersonMin: 40,
    pricePerPersonMax: 75,
    customerGuidance: "Canapes and Drinks pricing is distinct from canapes-only catering because drinks/service staffing may be involved.",
    warningCopy: "Your budget is below the current Canapes and Drinks guidance.",
    evidenceSource: `${sources.luxuryMenus} UK canape/finger-food catering examples from public supplier pages.`,
    evidenceNotes: "Keeps the client-approved naming and uses private-chef canape references rather than low-touch drop-off buffet pricing alone.",
  },
  {
    serviceType: "BARBECUE_BBQ",
    tier: null,
    minGuests: 10,
    maxGuests: 250,
    minimumSpend: 500,
    pricePerPersonMin: 30,
    pricePerPersonMax: 65,
    customerGuidance: "BBQ pricing depends on equipment, outdoor setup, menu complexity, and whether the chef brings grill equipment.",
    warningCopy: "Your budget is below the current BBQ guidance.",
    evidenceSource: `${sources.luxuryMenus} Public UK BBQ caterer menus including GBP 15.95-30/person with larger minimum guest counts.`,
    evidenceNotes: "Chef-led BBQ is set above drop-off BBQ menus but below luxury-only upper ranges.",
  },
  {
    serviceType: "BRUNCH",
    tier: null,
    minGuests: 4,
    maxGuests: 150,
    minimumSpend: 300,
    pricePerPersonMin: 35,
    pricePerPersonMax: 60,
    customerGuidance: "Brunch guidance covers chef-led breakfast/brunch service and is not reused from plated dinner pricing.",
    warningCopy: "Your budget is below the current Brunch guidance.",
    evidenceSource: sources.luxuryMenus,
    evidenceNotes: "Anchored to private-chef brunch/breakfast public guidance of GBP 40-60/head, with a slightly lower accessible floor.",
  },
  {
    serviceType: "GRAZING_TABLE",
    tier: null,
    minGuests: 8,
    maxGuests: 250,
    minimumSpend: 490,
    pricePerPersonMin: 15,
    pricePerPersonMax: 28,
    customerGuidance: "Grazing Table pricing includes styling/setup expectations and is separate from Sharing Buffet.",
    warningCopy: "Your budget is below the current Grazing Table guidance.",
    evidenceSource: sources.grazing,
    evidenceNotes: "Chosen minimum is GBP 10 below the low end of Poptop's common GBP 500-1000 minimum-spend guidance; per-person range mirrors public UK grazing evidence.",
  },
  {
    serviceType: "COOKING_CLASS",
    tier: null,
    minGuests: 2,
    maxGuests: 8,
    minimumSpend: 680,
    pricePerPersonMin: 85,
    pricePerPersonMax: 130,
    customerGuidance: "Cooking Class pricing is based on class duration, tuition, ingredients, and equipment requirements.",
    warningCopy: "Your budget is below the current Cooking Class guidance.",
    evidenceSource: sources.cookingClass,
    evidenceNotes: "Chosen minimum is GBP 10 below a public GBP 690 private cookery-class base price and supports small-group instruction.",
  },
  {
    serviceType: "AFTERNOON_TEA",
    tier: null,
    minGuests: 4,
    maxGuests: 120,
    minimumSpend: 290,
    pricePerPersonMin: 40,
    pricePerPersonMax: 60,
    customerGuidance: "Afternoon Tea is priced independently from brunch and dinner services.",
    warningCopy: "Your budget is below the current Afternoon Tea guidance.",
    evidenceSource: "yhangry Afternoon Tea private-chef page and Luxury Private Chef brunch/breakfast/afternoon-tea guidance.",
    evidenceNotes: "Chosen minimum is GBP 10 below a visible GBP 300 yhangry minimum-spend example and aligns with GBP 40-60/head guidance.",
  },
  {
    serviceType: "KIDS_PARTY",
    tier: null,
    minGuests: 8,
    maxGuests: 150,
    minimumSpend: 150,
    pricePerPersonMin: 9,
    pricePerPersonMax: 18,
    customerGuidance: "Kids Party guidance uses child-friendly catering references and the client-confirmed under-10 billing rule.",
    warningCopy: "Your budget is below the current Kids Party guidance.",
    evidenceSource: sources.kidsParty,
    evidenceNotes: "Anchored to public kids-party catering examples around GBP 9-14/head and a GBP 150 minimum package.",
  },
  {
    serviceType: "DELIVERY_PLATTER",
    tier: null,
    minGuests: 8,
    maxGuests: 300,
    minimumSpend: 120,
    pricePerPersonMin: 8,
    pricePerPersonMax: 20,
    customerGuidance: "Delivery Platter pricing is for prepared platter/drop-off style service and does not imply staffed event catering.",
    warningCopy: "Your budget is below the current Delivery Platter guidance.",
    evidenceSource: sources.deliveryPlatter,
    evidenceNotes: "Based on UK delivery platter/corporate catering examples, with a conservative minimum for small orders.",
  },
]

function toDbRule(rule) {
  return {
    ...rule,
    countryCode: "GB",
    currency: "GBP",
    status: "ACTIVE",
    version,
    effectiveFrom,
    effectiveTo: null,
    reviewedBy: actor,
    reviewedAt: effectiveFrom,
    activatedBy: actor,
    activatedAt: effectiveFrom,
    retiredBy: null,
    retiredAt: null,
    lifecycleReason: "Phase 2 pricing activation from client docs and public UK pricing evidence.",
    childrenRuleSummary,
    createdBy: actor,
    updatedBy: actor,
  }
}

async function main() {
  loadEnv()

  const backupDir = path.join(root, ".codex", "phase2-pricing-backups")
  fs.mkdirSync(backupDir, { recursive: true })

  const pool = new Pool({
    connectionString: getConnectionString(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  })

  const client = await pool.connect()
  try {
    await client.query("begin")

    const backup = await client.query('select * from "ServicePricingRule" order by "createdAt", id')
    const backupPath = path.join(backupDir, `service-pricing-rule-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`)
    fs.writeFileSync(backupPath, JSON.stringify(backup.rows, null, 2))

    const results = []

    for (const sourceRule of rules.map(toDbRule)) {
      const existing = await client.query(
        'select * from "ServicePricingRule" where "serviceType" = $1 and "countryCode" = $2 and "currency" = $3 and coalesce("tier", \'\') = coalesce($4, \'\') and "version" = $5 limit 1',
        [sourceRule.serviceType, sourceRule.countryCode, sourceRule.currency, sourceRule.tier, sourceRule.version],
      )

      let saved
      let action

      if (existing.rowCount) {
        const oldValue = existing.rows[0]
        const updated = await client.query(
          `update "ServicePricingRule"
           set "minGuests" = $1, "maxGuests" = $2, "minimumSpend" = $3, "pricePerPersonMin" = $4,
               "pricePerPersonMax" = $5, "customerGuidance" = $6, "warningCopy" = $7,
               "evidenceSource" = $8, "evidenceNotes" = $9, "status" = $10,
               "effectiveFrom" = $11, "effectiveTo" = $12, "reviewedBy" = $13,
               "reviewedAt" = $14, "activatedBy" = $15, "activatedAt" = $16,
               "retiredBy" = $17, "retiredAt" = $18, "lifecycleReason" = $19,
               "childrenRuleSummary" = $20, "updatedBy" = $21, "updatedAt" = now()
           where id = $22
           returning *`,
          [
            sourceRule.minGuests,
            sourceRule.maxGuests,
            sourceRule.minimumSpend,
            sourceRule.pricePerPersonMin,
            sourceRule.pricePerPersonMax,
            sourceRule.customerGuidance,
            sourceRule.warningCopy,
            sourceRule.evidenceSource,
            sourceRule.evidenceNotes,
            sourceRule.status,
            sourceRule.effectiveFrom,
            sourceRule.effectiveTo,
            sourceRule.reviewedBy,
            sourceRule.reviewedAt,
            sourceRule.activatedBy,
            sourceRule.activatedAt,
            sourceRule.retiredBy,
            sourceRule.retiredAt,
            sourceRule.lifecycleReason,
            sourceRule.childrenRuleSummary,
            sourceRule.updatedBy,
            oldValue.id,
          ],
        )
        saved = updated.rows[0]
        action = "PRICING_RULE_UPDATED"
        await client.query(
          'insert into "AuditLog" ("id", "action", "entityType", "entityId", "oldValue", "newValue", "performedBy", "reason", "createdAt") values (concat(\'audit_\', md5(random()::text || clock_timestamp()::text)), $1, $2, $3, $4, $5, $6, $7, now())',
          [action, "ServicePricingRule", saved.id, JSON.stringify(oldValue), JSON.stringify(saved), actor, "Phase 2 idempotent pricing activation update"],
        )
      } else {
        const inserted = await client.query(
          `insert into "ServicePricingRule"
           ("id", "serviceType", "countryCode", "currency", "tier", "minGuests", "maxGuests",
            "minimumSpend", "pricePerPersonMin", "pricePerPersonMax", "customerGuidance",
            "warningCopy", "evidenceSource", "evidenceNotes", "status", "version",
            "effectiveFrom", "effectiveTo", "reviewedBy", "reviewedAt", "activatedBy",
            "activatedAt", "retiredBy", "retiredAt", "lifecycleReason", "childrenRuleSummary",
            "createdBy", "updatedBy", "createdAt", "updatedAt")
           values (concat('spr_', md5(random()::text || clock_timestamp()::text)), $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
            $25, $26, $27, now(), now())
           returning *`,
          [
            sourceRule.serviceType,
            sourceRule.countryCode,
            sourceRule.currency,
            sourceRule.tier,
            sourceRule.minGuests,
            sourceRule.maxGuests,
            sourceRule.minimumSpend,
            sourceRule.pricePerPersonMin,
            sourceRule.pricePerPersonMax,
            sourceRule.customerGuidance,
            sourceRule.warningCopy,
            sourceRule.evidenceSource,
            sourceRule.evidenceNotes,
            sourceRule.status,
            sourceRule.version,
            sourceRule.effectiveFrom,
            sourceRule.effectiveTo,
            sourceRule.reviewedBy,
            sourceRule.reviewedAt,
            sourceRule.activatedBy,
            sourceRule.activatedAt,
            sourceRule.retiredBy,
            sourceRule.retiredAt,
            sourceRule.lifecycleReason,
            sourceRule.childrenRuleSummary,
            sourceRule.createdBy,
            sourceRule.updatedBy,
          ],
        )
        saved = inserted.rows[0]
        action = "PRICING_RULE_CREATED"
        await client.query(
          'insert into "AuditLog" ("id", "action", "entityType", "entityId", "oldValue", "newValue", "performedBy", "reason", "createdAt") values (concat(\'audit_\', md5(random()::text || clock_timestamp()::text)), $1, $2, $3, $4, $5, $6, $7, now())',
          [action, "ServicePricingRule", saved.id, null, JSON.stringify(saved), actor, "Phase 2 idempotent pricing activation create"],
        )
      }

      await client.query(
        `update "ServicePricingRule"
         set "status" = 'RETIRED', "retiredBy" = $1, "retiredAt" = now(),
             "effectiveTo" = coalesce("effectiveTo", now()), "lifecycleReason" = $2,
             "updatedBy" = $1, "updatedAt" = now()
         where id <> $3 and "serviceType" = $4 and "countryCode" = $5 and "currency" = $6
           and coalesce("tier", '') = coalesce($7, '') and "status" = 'ACTIVE'`,
        [actor, `Retired by activation of ${saved.id}`, saved.id, saved.serviceType, saved.countryCode, saved.currency, saved.tier],
      )

      results.push({
        action,
        id: saved.id,
        serviceType: saved.serviceType,
        status: saved.status,
        minimumSpend: saved.minimumSpend,
        pricePerPersonMin: saved.pricePerPersonMin,
        pricePerPersonMax: saved.pricePerPersonMax,
      })
    }

    await client.query("commit")
    console.log(JSON.stringify({ backupPath, version, results }, null, 2))
  } catch (error) {
    await client.query("rollback").catch(() => undefined)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
