import fs from "fs"
import path from "path"

const root = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8")

describe("Chef profile and admin approval Pass A contracts", () => {
  it("adds normalized identity and review fields additively", () => {
    const schema = read("prisma/schema.prisma")
    const migration = read("prisma/migrations/20260814090000_chef_profile_onboarding_and_admin_review/migration.sql")

    expect(schema).toContain("firstName                   String?")
    expect(schema).toContain("surname                     String?")
    expect(schema).toContain("careerStage                        String?")
    expect(schema).toContain("reviewNotes                        String?")
    expect(migration).toContain('ALTER TABLE "User"')
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "firstName" TEXT')
    expect(migration).toContain('ALTER TABLE "ChefProfile"')
    expect(migration).not.toMatch(/\bDROP\b|\bDELETE\b|\bTRUNCATE\b/i)
  })

  it("persists first name and surname through the repository user path", () => {
    const repository = read("lib/repositories/chef-profile-repository.ts")

    expect(repository).toContain("firstName: true")
    expect(repository).toContain("surname: true")
    expect(repository).toContain("displayName")
    expect(repository).toContain("name: displayName")
    expect(repository).toContain("careerStage: data.careerStage")
    expect(repository).toContain("specialties: data.specialties")
  })

  it("keeps pending chefs able to edit profile fields while validating image references", () => {
    const profilePage = read("app/dashboard/chef/profile/page.tsx")
    const profileRoute = read("app/api/chef/profile/route.ts")

    expect(profilePage).toContain("Upload profile photo")
    expect(profilePage).toContain("Chef career stage / background")
    expect(profilePage).toContain("Chef specialties")
    expect(profilePage).not.toContain("disabled={approvalStatus")
    expect(profileRoute).toContain("imageReferenceSchema.optional()")
    expect(profileRoute).toContain("careerStage: z.enum(CHEF_CAREER_STAGE_VALUES)")
    expect(profileRoute).toContain("specialties: z.array(z.enum(CHEF_SPECIALTY_VALUES))")
  })

  it("uses a shared storage contract for profile/menu image uploads", () => {
    const storage = read("lib/menu-image-storage.ts")
    const serverStorage = read("lib/image-upload-storage.ts")
    const uploadRoute = read("app/api/upload/route.ts")

    expect(storage).toContain("IMAGE_STORAGE_PROVIDER")
    expect(storage).toContain("cloudinary")
    expect(storage).toContain("configurationRequired")
    expect(storage).toContain('process.env.NODE_ENV === "production"')
    expect(serverStorage).toContain("uploadImageFile")
    expect(serverStorage).toContain("DURABLE_IMAGE_STORAGE_NOT_CONFIGURED")
    expect(serverStorage).toContain("uploadToCloudinary")
    expect(uploadRoute).toContain("purpose")
    expect(uploadRoute).toContain("uploadImageFile")
    expect(uploadRoute).not.toContain("writeFile")
  })

  it("makes admin review role-safe and non-destructive", () => {
    const service = read("lib/services/admin-chef-service.ts")
    const verificationService = read("lib/services/admin-verification-service.ts")
    const rejectRoute = read("app/api/admin/chefs/[id]/reject/route.ts")
    const reviewRoute = read("app/api/admin/chefs/[id]/review/route.ts")

    expect(service).toContain("CHANGES_REQUESTED")
    expect(service).toContain("reviewNotes")
    expect(service).toContain("tx.chefProfile.update")
    expect(service).not.toContain("chefProfile.delete")
    expect(service).not.toContain("tx.user.update")
    expect(service).not.toContain("verified: approved")
    expect(verificationService).not.toContain("prisma.user.update")
    expect(verificationService).not.toContain('verified: action === "APPROVE"')
    expect(rejectRoute).toContain('requireAdminPermission("chefs.approve")')
    expect(reviewRoute).toContain('requireAdminPermission("chefs.approve")')
    expect(reviewRoute).toContain("CHANGES_REQUESTED")
  })

  it("routes admin review to a dedicated admin chef detail page", () => {
    const adminPage = read("app/dashboard/admin/chefs/page.tsx")
    const detailPage = read("app/dashboard/admin/chefs/[id]/page.tsx")

    expect(adminPage).toContain("/dashboard/admin/chefs/${chef.id}")
    expect(adminPage).not.toContain("/dashboard/chef/profile`, '_blank'")
    expect(adminPage).toContain("Review pending applications")
    expect(detailPage).toContain("Review Decision")
    expect(detailPage).toContain("Request changes")
  })

  it("clarifies Experience versus bookable services labels", () => {
    const adminPage = read("app/dashboard/admin/chefs/page.tsx")
    const chefProfile = read("app/dashboard/chef/profile/page.tsx")
    const servicesPage = read("app/dashboard/chef/experiences/page.tsx")

    expect(adminPage).toContain("Years of Experience")
    expect(adminPage).toContain("Bookable Services")
    expect(chefProfile).toContain("Years of Experience")
    expect(servicesPage).toContain("My Bookable Services")
    expect(servicesPage).toContain("Total Bookable Services")
  })
})
