import fs from "fs"
import path from "path"
import { NextRequest } from "next/server"

const mockGetServerSession = jest.fn()
const mockUpdateMany = jest.fn()
const mockFindUnique = jest.fn()
const mockQueryRaw = jest.fn()

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

jest.mock("../../lib/prisma", () => ({
  isPrismaConnectionError: () => false,
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
    user: {
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}))

const root = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8")

function requestWithFormData(formData: FormData) {
  return {
    formData: async () => formData,
  } as NextRequest
}

function imageFile(type = "image/png", size = 128) {
  return new File([new Uint8Array(size)], "profile.png", { type })
}

describe("client profile photo upload flow", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue({
      user: {
        id: "client-user-1",
        role: "CLIENT",
        name: "Olivia Parker",
        email: "client@example.com",
      },
    })
    mockQueryRaw.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = Array.from(strings).join("")
      if (query.includes("information_schema.columns")) {
        return Promise.resolve([{ exists: true }])
      }

      if (query.includes('UPDATE "User"')) {
        return Promise.resolve([
          {
            id: "client-user-1",
            image: values[0],
            name: "Olivia Parker",
            email: "client@example.com",
            profileCompletion: 72,
          },
        ])
      }

      return Promise.resolve([
        {
          id: "client-user-1",
          image: "/api/user/profile-photo/client-user-1?v=123",
          name: "Olivia Parker",
          email: "client@example.com",
          profileCompletion: 72,
        },
      ])
    })
    mockUpdateMany.mockResolvedValue({ count: 1 })
    mockFindUnique.mockImplementation((args) => {
      if (args?.select?.role) {
        return Promise.resolve({
          id: "client-user-1",
          role: "CLIENT",
        })
      }

      return Promise.resolve({
        id: "client-user-1",
        image: "/api/user/profile-photo/client-user-1?v=123",
        name: "Olivia Parker",
        email: "client@example.com",
        profileCompletion: 72,
      })
    })
  })

  it("wires the visible Edit photo button to the hidden image picker and blocks duplicate uploads", () => {
    const settingsDashboard = read("components/settings-dashboard.tsx")

    expect(settingsDashboard).toContain("fileInputRef.current?.click()")
    expect(settingsDashboard).toContain('accept="image/jpeg,image/png,image/webp"')
    expect(settingsDashboard).toContain("MENU_IMAGE_ALLOWED_TYPES.includes")
    expect(settingsDashboard).toContain("MENU_IMAGE_MAX_BYTES")
    expect(settingsDashboard).toContain('fetch("/api/user/profile-photo"')
    expect(settingsDashboard).toContain('disabled={uploadingPhoto}')
    expect(settingsDashboard).toContain("if (uploadingPhoto) return")
    expect(settingsDashboard).toContain("Uploading...")
    expect(settingsDashboard).toContain("toast.error")
  })

  it("rejects unauthenticated upload requests", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const { POST } = await import("../../app/api/user/profile-photo/route")
    const formData = new FormData()
    formData.append("file", imageFile())

    const response = await POST(requestWithFormData(formData))

    expect(response.status).toBe(401)
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it("allows an authenticated client to upload and persist their own database-backed image", async () => {
    const { POST } = await import("../../app/api/user/profile-photo/route")
    const formData = new FormData()
    formData.append("file", imageFile())

    const response = await POST(requestWithFormData(formData))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockQueryRaw).toHaveBeenCalled()
    expect(body.image).toMatch(/^\/api\/user\/profile-photo\/client-user-1\?v=\d+$/)
    expect(JSON.stringify(mockQueryRaw.mock.calls)).toContain("data:image/png;base64,")
    expect(JSON.stringify(body)).not.toContain("publicId")
    expect(JSON.stringify(body)).not.toContain("api_secret")
  })

  it("rejects non-client roles before uploading", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "chef-user-1", role: "CHEF" } })
    const { POST } = await import("../../app/api/user/profile-photo/route")
    const formData = new FormData()
    formData.append("file", imageFile())

    const response = await POST(requestWithFormData(formData))

    expect(response.status).toBe(403)
  })

  it("rejects arbitrary remote image URLs instead of persisting them", async () => {
    const { POST } = await import("../../app/api/user/profile-photo/route")
    const formData = new FormData()
    formData.append("imageUrl", "https://example.com/profile.png")

    const response = await POST(requestWithFormData(formData))

    expect(response.status).toBe(400)
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it("maps invalid MIME and oversized file validation failures", async () => {
    const { POST } = await import("../../app/api/user/profile-photo/route")
    const invalidMime = new FormData()
    invalidMime.append("file", imageFile("image/gif"))

    const invalidMimeResponse = await POST(requestWithFormData(invalidMime))
    expect(invalidMimeResponse.status).toBe(400)
    expect(await invalidMimeResponse.json()).toEqual({
      error: "Invalid file type. Only JPEG, PNG, and WebP are allowed.",
    })

    const oversized = new FormData()
    oversized.append("file", imageFile("image/png", 5 * 1024 * 1024 + 1))

    const oversizedResponse = await POST(requestWithFormData(oversized))
    expect(oversizedResponse.status).toBe(400)
    expect(await oversizedResponse.json()).toEqual({
      error: "File too large. Maximum size is 5MB.",
    })
  })

  it("keeps chef profile photos on the database-backed chef endpoint", () => {
    const chefProfile = read("app/dashboard/chef/profile/page.tsx")
    const chefPhotoRoute = read("app/api/chef/profile/photo/route.ts")
    const photoFetchRoute = read("app/api/user/profile-photo/[userId]/route.ts")

    expect(chefProfile).toContain('payload.append("purpose", "profile")')
    expect(chefProfile).toContain('fetch("/api/chef/profile/photo"')
    expect(chefPhotoRoute).toContain("request.formData()")
    expect(chefPhotoRoute).toContain("fileToUserProfileImageData")
    expect(chefPhotoRoute).toContain('WHERE "id" = ${userId} AND "role" = \'CHEF\'')
    expect(photoFetchRoute).toContain('row.role !== "CHEF"')
  })
})
