import { readFileSync } from "fs"
import path from "path"

import {
  CUISINE_TYPES,
  normalizeCuisineType,
  getCuisineOptionsForContext,
} from "@/lib/request-options"
import {
  isValidMenuImageReference,
  menuImageReferenceSchema,
} from "@/lib/menu-image-storage"

const root = process.cwd()
const readSource = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8")

describe("menu and cuisine stabilization", () => {
  it("accepts app-local upload paths and legacy absolute URLs for menu images", () => {
    expect(isValidMenuImageReference("/uploads/images/menu-photo.webp")).toBe(true)
    expect(isValidMenuImageReference("https://images.example.com/menu-photo.jpg")).toBe(true)
    expect(menuImageReferenceSchema.safeParse("/uploads/images/menu-photo.png").success).toBe(true)
    expect(menuImageReferenceSchema.safeParse("C:\\Users\\HOME\\Downloads\\image.png").success).toBe(false)
    expect(menuImageReferenceSchema.safeParse("blob:http://localhost:3000/image").success).toBe(false)
    expect(menuImageReferenceSchema.safeParse("data:image/png;base64,abc").success).toBe(false)
  })

  it("uses the canonical cuisine registry for chef menus", () => {
    const menuOptions = getCuisineOptionsForContext("menu").map((option) => option.label)

    expect(menuOptions).toEqual(CUISINE_TYPES)
    expect(menuOptions).toContain("Canapé Party")
    expect(menuOptions).toContain("Macro Biotic")
    expect(menuOptions).toContain("Creole / Cajun")
    expect(menuOptions).toContain("Georgian")
    expect(menuOptions).not.toContain("Micro Biotic")
    expect(new Set(menuOptions).size).toBe(menuOptions.length)
  })

  it("normalizes legacy and client-provided cuisine variants", () => {
    expect(normalizeCuisineType("Barbecue / BBQ")).toBe("BBQ")
    expect(normalizeCuisineType("Cajun/Creole")).toBe("Creole / Cajun")
    expect(normalizeCuisineType("Creole")).toBe("Creole / Cajun")
    expect(normalizeCuisineType("Canape Party")).toBe("Canapé Party")
    expect(normalizeCuisineType("Micro Biotic")).toBe("Macro Biotic")
  })

  it("renames the technical menu wizard step and keeps the free-form editor expandable", () => {
    const source = readSource("components/dashboard/chef/menu-dialog.tsx")

    expect(source).toContain("Menu Photo & Details")
    expect(source).not.toContain("Image & metadata")
    expect(source).toContain("Expand editor")
    expect(source).toContain("resize-y")
  })
})
