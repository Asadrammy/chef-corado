const fs = require("node:fs")
const path = require("node:path")
const { Pool } = require("pg")

const root = path.resolve(__dirname, "..")

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

async function main() {
  loadEnv()

  const pool = new Pool({
    connectionString: getConnectionString(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  })

  try {
    const groups = await pool.query('select status, count(*)::int as count from "ServicePricingRule" group by status order by status')
    const active = await pool.query(
      `select "serviceType", "minimumSpend", "pricePerPersonMin", "pricePerPersonMax",
              "minGuests", "maxGuests", version, "activatedAt"
       from "ServicePricingRule"
       where status = 'ACTIVE' and "countryCode" = 'GB' and currency = 'GBP'
       order by "serviceType"`,
    )
    const audits = await pool.query('select count(*)::int as count from "AuditLog" where "entityType" = $1', ["ServicePricingRule"])

    console.log(JSON.stringify({
      groups: groups.rows,
      active: active.rows,
      audits: audits.rows[0]?.count ?? 0,
    }, null, 2))
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
