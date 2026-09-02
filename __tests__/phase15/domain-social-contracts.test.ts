import { APPROVED_PUBLIC_CONTACT } from "@/lib/marketplace-rules"
import { footerSections } from "@/lib/public-site"

describe("domain and social configuration contracts", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL
    delete process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL
    delete process.env.NEXT_PUBLIC_SOCIAL_X_URL
    delete process.env.NEXT_PUBLIC_SOCIAL_TIKTOK_URL
    delete process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL
  })

  it("uses the confirmed public support email", () => {
    expect(APPROVED_PUBLIC_CONTACT.email).toBe("info@chefachef.co.uk")
    expect(footerSections.find((section) => section.title === "Contact")?.items).toContainEqual({
      label: "Email",
      href: "mailto:info@chefachef.co.uk",
      value: "info@chefachef.co.uk",
    })
  })

  it("hides missing social links, including TikTok", () => {
    const socials = footerSections.find((section) => section.title === "Social")?.items ?? []

    expect(socials.find((item) => item.label === "TikTok")).toBeUndefined()
    expect(socials.every((item) => (item.href ?? "").trim().length > 0)).toBe(true)
  })
})
