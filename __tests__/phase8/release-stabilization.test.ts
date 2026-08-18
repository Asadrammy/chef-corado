import fs from "fs"
import path from "path"

const root = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8")

describe("final production stabilization source contracts", () => {
  it("separates admin chef review from email verification", () => {
    const adminChefService = read("lib/services/admin-chef-service.ts")
    const adminVerificationService = read("lib/services/admin-verification-service.ts")
    const emailVerification = read("lib/email-verification.ts")

    expect(emailVerification).toContain("requiresEmailVerification")
    expect(emailVerification).toContain("verified: true")
    expect(adminChefService).toContain("verificationStatus: status")
    expect(adminChefService).not.toContain("tx.user.update")
    expect(adminChefService).not.toContain("verified: approved")
    expect(adminVerificationService).not.toContain("prisma.user.update")
    expect(adminVerificationService).not.toContain('verified: action === "APPROVE"')
  })

  it("keeps active runtime support email centralized on the final confirmed address", () => {
    const rules = read("lib/marketplace-rules.ts")
    const chat = read("components/chat/chat-window.tsx")
    const publicSite = read("lib/public-site.ts")
    const siteConfig = read("lib/site-config.ts")

    expect(rules).toContain('email: "info@chefachef.com"')
    expect(chat).toContain("APPROVED_PUBLIC_CONTACT.email")
    expect(publicSite).toContain("APPROVED_PUBLIC_CONTACT.email")
    expect(siteConfig).toContain('OFFICIAL_WEBSITE_URL = "https://chefachef.co.uk"')
    expect(rules).not.toContain("info@chefachef.co.uk")
  })

  it("requires durable image storage in production while allowing local development fallback", () => {
    const storage = read("lib/menu-image-storage.ts")
    const uploadStorage = read("lib/image-upload-storage.ts")
    const adminAssetUpload = read("app/api/admin/service-assets/upload/route.ts")

    expect(storage).toContain("cloudinary")
    expect(storage).toContain('process.env.NODE_ENV === "production" ? "cloudinary" : "local-public"')
    expect(storage).toContain("CLOUDINARY_CLOUD_NAME")
    expect(uploadStorage).toContain("DURABLE_IMAGE_STORAGE_NOT_CONFIGURED")
    expect(uploadStorage).toContain('process.env.NODE_ENV === "production"')
    expect(uploadStorage).toContain("randomUUID()")
    expect(uploadStorage).toContain("MENU_IMAGE_ALLOWED_TYPES")
    expect(uploadStorage).toContain("MENU_IMAGE_MAX_BYTES")
    expect(adminAssetUpload).toContain("uploadImageFile")
    expect(adminAssetUpload).toContain('purpose: "admin-service-asset"')
    expect(adminAssetUpload).not.toContain("writeFile")
  })

  it("rejects insecure external image references while allowing app uploads and secure URLs", async () => {
    const {
      isValidMenuImageReference,
      menuImageReferenceSchema,
    } = await import("../../lib/menu-image-storage")

    expect(isValidMenuImageReference("/uploads/images/menu-owner-id.webp")).toBe(true)
    expect(isValidMenuImageReference("https://res.cloudinary.com/demo/image/upload/sample.webp")).toBe(true)
    expect(isValidMenuImageReference("http://example.com/insecure.jpg")).toBe(false)
    expect(() => menuImageReferenceSchema.parse("http://example.com/insecure.jpg")).toThrow()
  })

  it("prevents production Redis checkout locks from silently downgrading to memory", () => {
    const redis = read("lib/redis.ts")
    const checkout = read("app/api/payments/checkout/route.ts")

    expect(redis).toContain("REDIS_REQUIRED_IN_PRODUCTION")
    expect(redis).toContain("Memory fallback for development")
    expect(redis).toContain("process.env.NODE_ENV === 'production'")
    expect(redis).toContain("UPSTASH_REDIS_REST_URL")
    expect(redis).toContain("UPSTASH_REDIS_REST_TOKEN")
    expect(checkout).toContain("Locking system unavailable")
  })

  it("uses migration history rather than db push or production seeding during Render builds", () => {
    const renderYaml = read("render.yaml")
    const renderBuild = read("render-build.sh")
    const packageJson = JSON.parse(read("package.json"))

    expect(renderYaml).toContain("prisma migrate deploy")
    expect(renderBuild).toContain("npx prisma migrate deploy")
    expect(renderBuild).not.toContain("prisma db push")
    expect(renderBuild).not.toContain("seed-production")
    expect(packageJson.scripts["migrate:deploy"]).toBe("prisma migrate deploy")
    expect(packageJson.scripts.migrate).toBe("prisma migrate dev")
  })
})
