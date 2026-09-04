import fs from "fs"
import path from "path"

const root = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8")

describe("cron authentication source contracts", () => {
  it("fails closed when proposal-expiry cron secret is not configured", () => {
    const route = read("app/api/cron/expire-proposals/route.ts")

    expect(route).toContain('if (!cronSecret)')
    expect(route).toContain('"CRON_SECRET not configured"')
    expect(route).toContain('{ status: 503 }')
    expect(route).not.toContain("x-vercel-cron")
  })

  it("fails closed when reconciliation cron secret is not configured", () => {
    const route = read("app/api/cron/reconciliation/route.ts")

    expect(route).toContain("if (!cronAuth)")
    expect(route).toContain("'CRON_SECRET not configured'")
    expect(route).toContain("{ status: 503 }")
    expect(route).toContain("getRequiredSession")
  })
})
