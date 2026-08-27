import fs from "fs"
import path from "path"

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("chef dashboard schema-drift hardening", () => {
  it("does not use broad proposal request includes that require every Request schema column", () => {
    const source = readSource("lib/chef-dashboard.ts")

    expect(source).not.toContain("request: true")
    expect(source).toContain("request: {")
    expect(source).toContain("eventDate: true")
    expect(source).toContain("getSafeClientGreetingName(request.client)")
  })

  it("does not use broad Request reads on the chef Requests page", () => {
    const source = readSource("app/dashboard/chef/requests/page.tsx")
    expect(source).toContain("proposalService.listProposals(userId, Role.CHEF)")
    expect(source).toContain("proposals: {")
    expect(source).toContain("none: {")
    expect(source).toContain("chefId: chefProfile.id")
    expect(source).toContain("_count: {")
    expect(source).toContain("buildChefRespondedRequestView")
    expect(source).not.toContain("request: true")
  })
})
