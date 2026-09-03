function present(value?: string | null) {
  return Boolean(value && value.trim())
}

function configuredNumber(value?: string | null) {
  if (!present(value)) return false
  return Number.isFinite(Number(value))
}

export function getDeploymentInfo() {
  return {
    appVersion: process.env.npm_package_version || "0.5.0",
    gitCommitSha:
      process.env.RENDER_GIT_COMMIT ||
      process.env.GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_GIT_COMMIT_SHA ||
      null,
    buildTimestamp:
      process.env.RENDER_DEPLOY_CREATED_AT ||
      process.env.BUILD_TIMESTAMP ||
      process.env.NEXT_PUBLIC_BUILD_TIMESTAMP ||
      null,
  }
}

export function getSafeRuntimeConfigStatus() {
  const cloudinary =
    present(process.env.CLOUDINARY_CLOUD_NAME) &&
    present(process.env.CLOUDINARY_API_KEY) &&
    present(process.env.CLOUDINARY_API_SECRET)
  const resend = present(process.env.RESEND_API_KEY) && present(process.env.RESEND_FROM_EMAIL)
  const redis =
    present(process.env.REDIS_URL) ||
    (present(process.env.UPSTASH_REDIS_REST_URL) && present(process.env.UPSTASH_REDIS_REST_TOKEN))

  return {
    database: present(process.env.DATABASE_URL),
    nextAuthUrl: present(process.env.NEXTAUTH_URL),
    nextAuthSecret: present(process.env.NEXTAUTH_SECRET),
    publicBaseUrl: present(process.env.NEXT_PUBLIC_BASE_URL),
    cloudinary,
    imageStorageProvider: process.env.IMAGE_STORAGE_PROVIDER || null,
    resend,
    googleGeocoding: present(process.env.GOOGLE_GEOCODING_API_KEY) || present(process.env.GOOGLE_MAPS_API_KEY),
    redis,
    stripeSecret: present(process.env.STRIPE_SECRET_KEY),
    stripePublishable: present(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    stripeWebhook: present(process.env.STRIPE_WEBHOOK_SECRET),
    cronSecret: present(process.env.CRON_SECRET),
    highIntentThreshold: configuredNumber(process.env.CHEFACHEF_HIGH_INTENT_THRESHOLD),
  }
}
