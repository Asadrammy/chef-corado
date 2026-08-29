import fs from "fs"
import path from "path"

import { isRequestPhotoSchemaMismatch, withRequestPhotoFallback } from "@/lib/request-photo-schema"

describe("request photo schema fallback", () => {
  it("keeps chef proposal listings on the request photo fallback path", () => {
    const proposalRepository = fs.readFileSync(path.join(process.cwd(), "lib/repositories/proposal-repository.ts"), "utf8")

    expect(proposalRepository).toContain("withRequestPhotoFallback")
    expect(proposalRepository).toContain("buildChefProposalInclude(true)")
    expect(proposalRepository).toContain("buildChefProposalInclude(false)")
  })

  it("retries without photos when the RequestPhoto table is missing", async () => {
    const loader = jest.fn(async (includePhotos: boolean) => {
      if (includePhotos) {
        throw new Error("Invalid prisma.request.findMany() invocation: The table `public.RequestPhoto` does not exist in the current database. P2021 TableDoesNotExist")
      }

      return { photos: [] }
    })

    const result = await withRequestPhotoFallback(
      () => loader(true),
      () => loader(false)
    )

    expect(loader).toHaveBeenCalledTimes(2)
    expect(loader).toHaveBeenNthCalledWith(1, true)
    expect(loader).toHaveBeenNthCalledWith(2, false)
    expect(result).toEqual({ photos: [] })
  })

  it("does not mask unrelated errors", async () => {
    await expect(
      withRequestPhotoFallback(
        async () => {
          throw new Error("boom")
        },
        async () => ({ photos: [] })
      )
    ).rejects.toThrow("boom")
  })

  it("detects request photo schema mismatches", () => {
    expect(isRequestPhotoSchemaMismatch(new Error("The table `public.RequestPhoto` does not exist in the current database. P2021 TableDoesNotExist"))).toBe(true)
    expect(isRequestPhotoSchemaMismatch(new Error("boom"))).toBe(false)
  })
})
