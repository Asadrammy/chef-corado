import fs from "fs"
import path from "path"

const root = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8")

describe("Pass 5 remediation contracts", () => {
  it("keeps admin guest reductions restricted to recognized admin staff roles", () => {
    const route = read("app/api/admin/bookings/[id]/guest-amendments/reduce/route.ts")
    const service = read("lib/services/booking-guest-amendment-service.ts")

    expect(route).toContain('requireAdminPermission("bookings.modify")')
    expect(route).toContain("adminRole: actor.adminRole")
    expect(route).not.toContain('adminRole: "ADMIN"')
    expect(service).toContain("isAdminStaffRole")
    expect(service).toContain("if (!isAdminStaffRole(input.adminRole)) throw new Error(\"FORBIDDEN\")")
    expect(service).not.toContain('input.adminRole !== "ADMIN"')
    expect(service).toContain("getSnapshotPricing")
    expect(service).toContain("refundAmountMinor")
    expect(service).toContain("refundService.createRefundRequest")
  })

  it("persists client profile text and social settings through an authenticated API", () => {
    const schema = read("prisma/schema.prisma")
    const route = read("app/api/user/profile/route.ts")
    const helper = read("lib/user-profile-schema.ts")
    const settingsPage = read("app/dashboard/settings/page.tsx")
    const settingsComponent = read("components/settings-dashboard.tsx")

    expect(schema).toMatch(/username\s+String\?\s+@unique/)
    expect(schema).toMatch(/bio\s+String\?/)
    expect(schema).toMatch(/website\s+String\?/)
    expect(schema).toMatch(/socialProfile\s+String\?/)
    expect(route).toContain("getServerSession(authOptions)")
    expect(route).toContain("buildUserProfileUpdateData(payload)")
    expect(route).toContain("id: { not: session.user.id }")
    expect(helper).toContain("data.username = input.username ?? null")
    expect(helper).toContain("data.bio = input.bio ?? null")
    expect(helper).toContain("data.website = input.website ?? null")
    expect(helper).toContain("data.socialProfile = input.socialProfile ?? null")
    expect(settingsPage).toContain("buildUserProfileSelect()")
    expect(settingsComponent).toContain('fetch("/api/user/profile"')
    expect(settingsComponent).toContain("handleSaveProfile")
  })

  it("implements request photos end to end without adding a second storage stack", () => {
    const schema = read("prisma/schema.prisma")
    const migration = read("prisma/migrations/20260824090000_pass5_request_photos_profile_and_payout_ledger/migration.sql")
    const uploadRoute = read("app/api/requests/[requestId]/photos/route.ts")
    const deleteRoute = read("app/api/requests/[requestId]/photos/[photoId]/route.ts")
    const wizard = read("components/request-wizard-form.tsx")
    const clientDetail = read("app/dashboard/client/requests/[requestId]/page.tsx")
    const chefDetailPage = read("app/dashboard/chef/requests/[requestId]/page.tsx")
    const chefDetailComponent = read("components/chef-request-detail.tsx")

    expect(schema).toContain("model RequestPhoto")
    expect(schema).toMatch(/photos\s+RequestPhoto\[\]/)
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "RequestPhoto"')
    expect(uploadRoute).toContain("uploadImageFile")
    expect(uploadRoute).toContain('purpose: "request"')
    expect(uploadRoute).toContain("existingRequest.clientId !== session.user.id")
    expect(uploadRoute).toContain("hasUpcomingDate")
    expect(deleteRoute).toContain("deleteUploadedImage")
    expect(deleteRoute).toContain("photo.request.clientId !== session.user.id")
    expect(wizard).toContain("handleRequestPhotosSelected")
    expect(wizard).toContain("uploadRequestPhotos")
    expect(clientDetail).toContain("Request Photos")
    expect(chefDetailPage).toContain("photos:")
    expect(chefDetailComponent).toContain("Request Photos")
  })

  it("removes runtime DDL for profile images and relies on migrations", () => {
    const runtime = read("lib/user-profile-image.ts")
    const migration = read("prisma/migrations/20260819090000_add_user_profile_image/migration.sql")
    const imageDataMigration = read("prisma/migrations/20260821123000_add_user_profile_image_data/migration.sql")

    expect(runtime).not.toContain("ALTER TABLE")
    expect(runtime).toContain("return hasUserProfileImageColumns()")
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "image"')
    expect(imageDataMigration).toContain('ADD COLUMN IF NOT EXISTS "imageData"')
  })

  it("records payout ledger entries inside the payout transaction with duplicate protection", () => {
    const service = read("lib/services/payout-service.ts")
    const ledger = read("lib/services/ledger-service.ts")
    const schema = read("prisma/schema.prisma")
    const migration = read("prisma/migrations/20260824090000_pass5_request_photos_profile_and_payout_ledger/migration.sql")

    expect(service).toContain("ledgerService.recordPayout")
    expect(service).toContain("updatedPayout.currency")
    expect(service).toContain("tx")
    expect(ledger).toContain("client: Prisma.TransactionClient | typeof prisma = prisma")
    expect(ledger).toContain("await this.recordTransaction({")
    expect(ledger).toContain("}, client)")
    expect(schema).toContain("@@unique([transactionType, payoutId])")
    expect(migration).toContain('"Ledger"("transactionType", "payoutId")')
  })

  it("uses ChefaChef metadata, official robots, and no malformed cuisine encoding", () => {
    const utils = read("lib/utils.ts")
    const robots = read("public/robots.txt")
    const cuisine = read("lib/cuisine-registry.ts")

    expect(utils).toContain("ChefaChef")
    expect(utils).toContain("getConfiguredAppBaseUrl")
    expect(utils).not.toContain("Shadcn UI Kit")
    expect(robots).toContain("Sitemap: https://chefachef.co.uk/sitemap.xml")
    expect(robots).toContain("Disallow: /dashboard/")
    expect(cuisine).toContain("Canapé Party")
    expect(cuisine).not.toContain("CanapÃ")
    expect(cuisine).not.toContain("\\u00c3")
  })
})
