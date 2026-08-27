import fs from "fs"
import path from "path"

import { serializePublicChef } from "../../lib/public-chef-view"

const root = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8")

describe("public privacy and marketplace photo contracts", () => {
  it("keeps public chef serialization free of internal classification and contact fields", () => {
    const dto = serializePublicChef({
      id: "chef-1",
      bio: "Public bio",
      experience: 12,
      location: "London",
      radius: 30,
      profileImage: "/chef.jpg",
      chefType: "PRIVATE_CHEF",
      specialties: JSON.stringify(["PRIVATE_DINING"]),
      cuisineType: "Italian",
      preferredCurrency: "GBP",
      eventsPerMonth: 8,
      careerStage: "BEGINNER",
      certifications: "Level 2 Food Hygiene",
      verificationStatus: "APPROVED",
      foodHygieneCertificateUrl: "/cert.pdf",
      insuranceDocumentUrl: "/insurance.pdf",
      reviewNotes: "internal",
      user: {
        id: "user-1",
        name: "Chef Test",
        email: "chef@example.com",
        phone: "+440000000000",
        verified: false,
        experienceLevel: "BEGINNER",
      },
      menus: [],
      experiences: [],
      reviews: [{ rating: 5 }],
      bookings: [{ status: "COMPLETED" }],
      _count: { reviews: 1 },
    })

    const serialized = JSON.stringify(dto)
    expect(serialized).not.toContain("chefType")
    expect(serialized).not.toContain("experienceLevel")
    expect(serialized).not.toContain("BEGINNER")
    expect(serialized).not.toContain("email")
    expect(serialized).not.toContain("phone")
    expect(serialized).not.toContain("certifications")
    expect(serialized).not.toContain("foodHygieneCertificateUrl")
    expect(serialized).not.toContain("insuranceDocumentUrl")
    expect(serialized).not.toContain("reviewNotes")
  })

  it("removes internal chef classification from the visible public surfaces", () => {
    const sources = [
      read("components/public/public-chef-card.tsx"),
      read("app/page.tsx"),
      read("app/(public)/browse-chefs/page.tsx"),
      read("components/booking/instant-booking-dialog.tsx"),
      read("components/booking/instant-booking-dialog-atomic.tsx"),
      read("app/(public)/experiences/page.tsx"),
      read("lib/public-chef-view.ts"),
    ].join("\n")

    expect(sources).not.toContain("chef.chefType")
    expect(sources).not.toContain("Badge variant=\"outline\">{chef.chefType}</Badge>")
    expect(sources).not.toContain("experienceLevel: string;")
    expect(sources).not.toContain("{experience.chef.user.experienceLevel}")
    expect(sources).not.toContain("chefType?: string | null")
  })

  it("includes request photos in the chef marketplace list and renders a preview", () => {
    const repository = read("lib/repositories/request-repository.ts")
    const page = read("app/dashboard/chef/requests/page.tsx")
    const card = read("components/dashboard/chef/chef-request-card.tsx")

    expect(repository).toContain("photos:")
    expect(repository).toContain("take: 3")
    expect(page).toContain("photos: {")
    expect(page).toContain("url: true")
    expect(card).toContain("request.photos?.length")
    expect(card).toContain("Image")
    expect(card).toContain("unoptimized")
  })
})
