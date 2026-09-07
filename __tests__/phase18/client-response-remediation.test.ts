import { uploadCertificate } from "@/lib/certificate-storage"

jest.mock("@/lib/cloudinary", () => ({
  cloudinary: {
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
    utils: {
      private_download_url: jest.fn(),
    },
  },
}))

describe("7 September client response remediation", () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = originalEnv
    jest.restoreAllMocks()
  })

  it("refuses certificate upload success in production when durable private storage is not configured", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      CLOUDINARY_CLOUD_NAME: "",
      CLOUDINARY_API_KEY: "",
      CLOUDINARY_API_SECRET: "",
    }

    await expect(uploadCertificate({
      ownerId: "chef-1",
      bytes: Buffer.from("fake certificate"),
      contentType: "application/pdf",
      extension: "pdf",
      originalName: "certificate.pdf",
    })).rejects.toThrow("DURABLE_CERTIFICATE_STORAGE_NOT_CONFIGURED")
  })
})
