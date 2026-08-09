const fs = require("node:fs")
const path = require("node:path")
const { Pool } = require("pg")

const root = path.resolve(__dirname, "..")
const actor = "system-phase3-asset-governance"

function loadEnv() {
  const envPath = path.join(root, ".env")
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

const assets = [
  {
    serviceType: "BARBECUE_BBQ",
    imageUrl: "/images/service-types/barbecue-bbq.jpg",
    altText: "Meat and vegetables cooking on a barbecue grill",
    source: "Client-supplied chat attachment",
    licence: "CLIENT_SUPPLIED_APPROVED",
    suppliedByClient: true,
    clientApproved: true,
    usageLocations: "Service type cards, request wizard, admin service asset registry",
    internalNotes: "Client screenshot states: This is BBQ.",
  },
  {
    serviceType: "BRUNCH",
    imageUrl: "/images/service-types/brunch.jpg",
    altText: "Brunch dishes and coffee arranged on a table",
    source: "Client-supplied chat attachment; filename references Unsplash",
    photographer: "Duncan Shaffer",
    licence: "CLIENT_SUPPLIED_APPROVED_SOURCE_URL_PENDING",
    suppliedByClient: true,
    clientApproved: true,
    usageLocations: "Service type cards, request wizard, admin service asset registry",
    internalNotes: "Filename references duncan-shaffer-I0_nRa5tu40-unsplash; external source URL still should be retained when supplied.",
  },
  {
    serviceType: "SHARING_BUFFET",
    imageUrl: "/images/service-types/sharing-buffet.jpg",
    altText: "Guests sharing buffet dishes at an outdoor table",
    source: "Client-supplied chat attachment",
    licence: "CLIENT_SUPPLIED_APPROVED",
    suppliedByClient: true,
    clientApproved: true,
    usageLocations: "Service type cards, request wizard, admin service asset registry",
    internalNotes: "Client screenshot states: This is Sharing Buffet.",
  },
  {
    serviceType: "GRAZING_TABLE",
    imageUrl: "/images/service-types/grazing-table.jpg",
    altText: "Grazing table board with cheese, charcuterie, fruit, and crackers",
    source: "Client-supplied chat attachment",
    licence: "CLIENT_SUPPLIED_APPROVED",
    suppliedByClient: true,
    clientApproved: true,
    usageLocations: "Service type cards, request wizard, admin service asset registry",
    internalNotes: "Client screenshot states this is grazing table; duplicate/alternate grazing table image was also supplied.",
  },
  {
    serviceType: "KIDS_PARTY",
    imageUrl: "/images/service-types/kids-party.jpg",
    altText: "Kids party dessert table with cake, balloons, cupcakes, and decorations",
    source: "Client-supplied chat attachment",
    photographer: "Yulia Gapeenko",
    licence: "CLIENT_SUPPLIED_APPROVED_SOURCE_URL_PENDING",
    suppliedByClient: true,
    clientApproved: true,
    usageLocations: "Service type cards, request wizard, admin service asset registry",
    internalNotes: "Client screenshot states: This is kids party. Filename says licence-free but external proof should still be preserved when supplied.",
  },
  {
    serviceType: "BRAND_ORANGE_CHEF_ILLUSTRATION",
    imageUrl: "/images/brand/orange-chef-illustration.jpg",
    altText: "Orange chef illustration with pizza paddle",
    source: "Client-supplied chat attachment",
    licence: "CLIENT_SUPPLIED_APPROVED",
    suppliedByClient: true,
    clientApproved: true,
    usageLocations: "Login/register illustration candidate and brand companion; not primary logo",
    internalNotes: "Client screenshot says it can be used as a logo or main image near the login area. Primary logo replacement remains a separate brand decision.",
  },
]

async function main() {
  loadEnv()
  const pool = new Pool({ connectionString: getConnectionString(), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 })
  const client = await pool.connect()

  try {
    await client.query("begin")
    const results = []

    for (const asset of assets) {
      const diskPath = path.join(root, "public", asset.imageUrl.replace(/^\//, ""))
      if (!fs.existsSync(diskPath)) {
        results.push({ serviceType: asset.serviceType, action: "SKIPPED_MISSING_FILE", imageUrl: asset.imageUrl })
        continue
      }

      const existing = await client.query(
        'select * from "ServiceAsset" where "serviceType" = $1 and "imageUrl" = $2 limit 1',
        [asset.serviceType, asset.imageUrl],
      )

      let saved
      let action
      if (existing.rowCount) {
        const update = await client.query(
          `update "ServiceAsset"
           set "altText" = $1, "source" = $2, "photographer" = $3, "licence" = $4,
               "licenceUrl" = $5, "suppliedByClient" = $6, "clientApproved" = $7,
               "usageLocations" = $8, "status" = 'ACTIVE', "internalNotes" = $9,
               "updatedBy" = $10, "updatedAt" = now()
           where id = $11 returning *`,
          [
            asset.altText,
            asset.source,
            asset.photographer ?? null,
            asset.licence,
            asset.licenceUrl ?? null,
            asset.suppliedByClient,
            asset.clientApproved,
            asset.usageLocations,
            asset.internalNotes,
            actor,
            existing.rows[0].id,
          ],
        )
        saved = update.rows[0]
        action = "SERVICE_ASSET_UPDATED"
      } else {
        const insert = await client.query(
          `insert into "ServiceAsset"
           ("id", "serviceType", "imageUrl", "altText", "source", "photographer", "licence",
            "licenceUrl", "suppliedByClient", "clientApproved", "usageLocations", "status",
            "internalNotes", "createdBy", "updatedBy", "createdAt", "updatedAt")
           values (concat('asset_', md5(random()::text || clock_timestamp()::text)), $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, 'ACTIVE', $11, $12, $12, now(), now())
           returning *`,
          [
            asset.serviceType,
            asset.imageUrl,
            asset.altText,
            asset.source,
            asset.photographer ?? null,
            asset.licence,
            asset.licenceUrl ?? null,
            asset.suppliedByClient,
            asset.clientApproved,
            asset.usageLocations,
            asset.internalNotes,
            actor,
          ],
        )
        saved = insert.rows[0]
        action = "SERVICE_ASSET_CREATED"
      }

      await client.query(
        'insert into "AuditLog" ("id", "action", "entityType", "entityId", "oldValue", "newValue", "performedBy", "reason", "createdAt") values (concat(\'audit_\', md5(random()::text || clock_timestamp()::text)), $1, $2, $3, $4, $5, $6, $7, now())',
        [action, "ServiceAsset", saved.id, existing.rowCount ? JSON.stringify(existing.rows[0]) : null, JSON.stringify(saved), actor, "Phase 3 service asset governance sync"],
      )

      results.push({ serviceType: saved.serviceType, imageUrl: saved.imageUrl, action })
    }

    await client.query("commit")
    console.log(JSON.stringify({ results }, null, 2))
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
