import fs from "fs"
import path from "path"

import { detectPolicyViolations, isContentSafe } from "../../lib/security/communication-policy"

const root = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8")

describe("Pass C upload, login, and route stability contracts", () => {
  it("allows normal menu numbers while continuing to block real contact details", () => {
    const normalMenuText = [
      "Prosecco Superiore: 5 bottles which is approximately 12 glasses.",
      "Elderflower and sparkling apple presse, non-alcoholic, 4 bottles.",
      "Private dinner for 20 guests with 3 courses and a GBP 50 supplement.",
      "Chef has 10 years experience and can serve on 31 August 2026.",
    ].join("\n")
    const freeFormMenuText = [
      "Starters",
      "A",
      "guest may choose between",
      "Bruschetta al pomodoro, aglio e oregano.",
      "Lunch, Dinner, School Lunches, Office Get together",
    ].join("\n\n")

    expect(detectPolicyViolations(normalMenuText)).toEqual([])
    expect(detectPolicyViolations(freeFormMenuText)).toEqual([])
    expect(isContentSafe(normalMenuText)).toBe(true)
    expect(isContentSafe(freeFormMenuText)).toBe(true)

    expect(detectPolicyViolations("Please call me on 07123 456789")).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "phone" })])
    )
    expect(detectPolicyViolations("Email me at chef@example.com")).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "email" })])
    )
  })

  it("keeps menu uploads on shared image storage and chef photos on database-backed persistence", () => {
    const menuDialog = read("components/dashboard/chef/menu-dialog.tsx")
    const imageUpload = read("components/ui/image-upload.tsx")
    const chefProfile = read("app/dashboard/chef/profile/page.tsx")
    const uploadRoute = read("app/api/upload/route.ts")
    const chefPhotoRoute = read("app/api/chef/profile/photo/route.ts")
    const uploadStorage = read("lib/image-upload-storage.ts")

    expect(menuDialog).toContain("<ImageUpload")
    expect(imageUpload).toContain("formData.append('file', file)")
    expect(imageUpload).toContain("fetch('/api/upload'")
    expect(chefProfile).toContain('payload.append("purpose", "profile")')
    expect(chefProfile).toContain('fetch("/api/chef/profile/photo"')
    expect(uploadRoute).toContain("getServerSession")
    expect(uploadRoute).toContain("uploadImageFile")
    expect(uploadRoute).toContain("DURABLE_IMAGE_STORAGE_NOT_CONFIGURED")
    expect(chefPhotoRoute).toContain("getRequiredSession(Role.CHEF)")
    expect(chefPhotoRoute).toContain("request.formData()")
    expect(chefPhotoRoute).toContain("fileToUserProfileImageData")
    expect(chefPhotoRoute).toContain("profileImage")
    expect(chefPhotoRoute).toContain("ensureUserProfileImageColumns")
    expect(uploadStorage).toContain('purpose: "menu" | "profile" | "request" | "admin-service-asset"')
  })

  it("requires durable Cloudinary-backed image storage in production", () => {
    const menuStorage = read("lib/menu-image-storage.ts")
    const uploadStorage = read("lib/image-upload-storage.ts")
    const renderYaml = read("render.yaml")

    expect(menuStorage).toContain('process.env.NODE_ENV === "production" ? "cloudinary" : "local-public"')
    expect(menuStorage).toContain("CLOUDINARY_CLOUD_NAME")
    expect(menuStorage).toContain("CLOUDINARY_API_KEY")
    expect(menuStorage).toContain("CLOUDINARY_API_SECRET")
    expect(uploadStorage).toContain('if (process.env.NODE_ENV === "production")')
    expect(uploadStorage).toContain("DURABLE_IMAGE_STORAGE_NOT_CONFIGURED")
    expect(renderYaml).toContain("IMAGE_STORAGE_PROVIDER")
    expect(renderYaml).toContain("CLOUDINARY_CLOUD_NAME")
    expect(renderYaml).toContain("CLOUDINARY_API_KEY")
    expect(renderYaml).toContain("CLOUDINARY_API_SECRET")
  })

  it("does not render invalid certificate placeholders as admin-relative links", () => {
    const adminChefReview = read("app/dashboard/admin/chefs/[id]/page.tsx")

    expect(adminChefReview).toContain("getSafeCertificateHref")
    expect(adminChefReview).toContain('value.startsWith("/api/chef/certificates/")')
    expect(adminChefReview).toContain('url.protocol === "https:"')
    expect(adminChefReview).toContain("Certificate reference is not viewable")
  })

  it("makes chef availability default-available in the calendar UI", () => {
    const productHeader = read("components/availability/product-header.tsx")
    const alivePanel = read("components/availability/alive-panel.tsx")
    const calendar = read("components/availability/product-calendar.tsx")
    const instantBookingService = read("lib/services/booking-service.ts")

    expect(productHeader).toContain("Mark Unavailable")
    expect(alivePanel).toContain("Available by default")
    expect(alivePanel).not.toContain("No Availability Set For This Date")
    expect(calendar).toContain("available-default")
    expect(instantBookingService).toContain("const availabilityDate = new Date(Date.UTC")
    expect(instantBookingService).toContain("availability && (!availability.isAvailable || availability.currentBookings >= availability.maxBookings)")
    expect(instantBookingService).toContain("availability ? availability.maxBookings - availability.currentBookings : 1")
  })

  it("keeps login disabled and visibly pending after successful auth until navigation takes over", () => {
    const loginForm = read("components/auth/LoginForm.tsx")

    expect(loginForm).toContain("const [loginStatus, setLoginStatus]")
    expect(loginForm).toContain('setLoginStatus("Signing in...")')
    expect(loginForm).toContain('setLoginStatus(')
    expect(loginForm).toContain("Opening chef dashboard...")
    expect(loginForm).toContain("Opening client dashboard...")
    expect(loginForm).toContain("Opening admin dashboard...")
    expect(loginForm).toContain("let navigating = false")
    expect(loginForm).toContain("if (!navigating)")
    expect(loginForm).toContain("disabled={loading}")
    expect(loginForm).toContain("role=\"status\"")
    expect(loginForm).toContain("animate-spin")
  })

  it("uses the canonical eligible-chef matcher for matching preview without leaking chef email", () => {
    const matchingRoute = read("app/api/requests/[requestId]/matching-chefs/route.ts")

    expect(matchingRoute).toContain("filterEligibleChefsForRequest")
    expect(matchingRoute).toContain("requestRepository.findApprovedChefsWithCoordinates")
    expect(matchingRoute).toContain("getChefRequestDistanceKm")
    expect(matchingRoute).toContain("distanceKm")
    expect(matchingRoute).not.toContain("email: true")
    expect(matchingRoute).not.toContain("...chef")
  })
})
