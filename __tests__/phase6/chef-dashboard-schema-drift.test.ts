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
  })

  it("does not use broad Request reads on the chef Requests page", () => {
    const source = readSource("app/dashboard/chef/requests/page.tsx")
    const queryStart = source.indexOf("const allRequests = await prisma.request.findMany")
    const queryEnd = source.indexOf("requests = allRequests", queryStart)
    const querySource = source.slice(queryStart, queryEnd)

    expect(querySource).toContain("prisma.request.findMany")
    expect(querySource).toContain("select: {")
    expect(querySource).toContain("geocodingStatus: true")
    expect(querySource).not.toContain("include:")
  })
})
