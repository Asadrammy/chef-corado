import { getDeploymentInfo, getSafeRuntimeConfigStatus } from "@/lib/deployment-info"
import { PLATFORM_NOTIFICATION_SENDER } from "@/lib/email"

describe("deployment health diagnostic", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("exposes deployment metadata and config presence without secret values", () => {
    process.env.RENDER_GIT_COMMIT = "34af3f68c403825ce555267d78152347c390e90c"
    process.env.CLOUDINARY_CLOUD_NAME = "cloud"
    process.env.CLOUDINARY_API_KEY = "key"
    process.env.CLOUDINARY_API_SECRET = "secret"
    process.env.RESEND_API_KEY = "resend"
    process.env.RESEND_FROM_EMAIL = "ChefaChef <notifications@chefachef.co.uk>"
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example"
    process.env.UPSTASH_REDIS_REST_TOKEN = "token"
    process.env.CHEFACHEF_HIGH_INTENT_THRESHOLD = "45"

    expect(getDeploymentInfo()).toMatchObject({
      gitCommitSha: "34af3f68c403825ce555267d78152347c390e90c",
    })
    expect(getSafeRuntimeConfigStatus()).toMatchObject({
      cloudinary: true,
      resend: true,
      resendFromEmailExpected: true,
      redis: true,
      highIntentThreshold: true,
    })
    expect(JSON.stringify(getSafeRuntimeConfigStatus())).not.toContain("secret")
    expect(JSON.stringify(getSafeRuntimeConfigStatus())).not.toContain("token")
  })

  it("uses the verified platform notification sender separate from public support", () => {
    expect(PLATFORM_NOTIFICATION_SENDER).toBe("ChefaChef <notifications@chefachef.co.uk>")
  })
})
