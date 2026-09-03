jest.mock("@/lib/auth-helpers", () => ({
  getRequiredSession: jest.fn(),
  getSessionUserId: jest.fn(),
}))

jest.mock("@/lib/certificate-storage", () => ({
  readCertificateReference: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    chefProfile: {
      findFirst: jest.fn(),
    },
  },
}))

import { GET } from "@/app/api/chef/certificates/[fileName]/route"
import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { readCertificateReference } from "@/lib/certificate-storage"
import { prisma } from "@/lib/prisma"
import { Role } from "@/types"
import { NextRequest } from "next/server"

const mockedGetRequiredSession = getRequiredSession as jest.Mock
const mockedGetSessionUserId = getSessionUserId as jest.Mock
const mockedReadCertificateReference = readCertificateReference as jest.Mock
const mockedFindFirst = prisma.chefProfile.findFirst as jest.Mock

describe("private certificate file route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetRequiredSession.mockResolvedValue({ user: { id: "admin-1", role: Role.ADMIN } })
    mockedGetSessionUserId.mockReturnValue("admin-1")
    mockedFindFirst.mockResolvedValue({ userId: "chef-1" })
  })

  it("returns a safe 404 when a legacy private certificate file is missing", async () => {
    const missingFile = Object.assign(new Error("ENOENT: no such file or directory"), { code: "ENOENT" })
    mockedReadCertificateReference.mockRejectedValue(missingFile)

    const response = await GET(new NextRequest("https://chefachef.co.uk/api/chef/certificates/missing.pdf"), {
      params: Promise.resolve({ fileName: "missing.pdf" }),
    })

    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("re-upload"),
    })
    expect(response.status).toBe(404)
  })

  it("keeps unrelated users blocked before storage lookup", async () => {
    mockedGetRequiredSession.mockResolvedValue({ user: { id: "chef-2", role: Role.CHEF } })
    mockedGetSessionUserId.mockReturnValue("chef-2")

    const response = await GET(new NextRequest("https://chefachef.co.uk/api/chef/certificates/private.pdf"), {
      params: Promise.resolve({ fileName: "private.pdf" }),
    })

    expect(response.status).toBe(403)
    expect(mockedReadCertificateReference).not.toHaveBeenCalled()
  })
})
