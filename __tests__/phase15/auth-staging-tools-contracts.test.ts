import { readFileSync } from "fs"
import path from "path"

describe("staging auth tooling contracts", () => {
  it("diagnostic script reports password presence without printing stored hashes", () => {
    const source = readFileSync(path.join(process.cwd(), "scripts/staging-auth-diagnostic.cjs"), "utf8")

    expect(source).toContain("passwordHashPresent")
    expect(source).not.toContain("console.log(user.password")
    expect(source).not.toContain("password.substring")
  })

  it("reconcile script requires an explicit staging gate before account writes", () => {
    const source = readFileSync(path.join(process.cwd(), "scripts/staging-account-reconcile.cjs"), "utf8")

    expect(source).toContain("ALLOW_STAGING_ACCOUNT_RECONCILIATION")
    expect(source).toContain("Refusing to modify accounts")
    expect(source).toContain("chefachef.co.uk")
  })
})
