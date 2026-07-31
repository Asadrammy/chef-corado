/// <reference types="jest" />

describe("Phase 2 public site configuration", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_CONTACT_WHATSAPP_URL
    delete process.env.NEXT_PUBLIC_CONTACT_PHONE
    delete process.env.NEXT_PUBLIC_CONTACT_EMAIL
    delete process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL
    delete process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL
    delete process.env.NEXT_PUBLIC_SOCIAL_X_URL
    delete process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("keeps contact and social footer sections visible when no approved values are configured", async () => {
    const { footerSections } = await import("@/lib/public-site")

    const contact = footerSections.find((section: { title: string }) => section.title === "Contact")
    const social = footerSections.find((section: { title: string }) => section.title === "Social")

    expect(contact?.items).toEqual([
      { label: "WhatsApp", note: "Available on request", disabled: true },
      { label: "Telephone", note: "Available on request", disabled: true },
      { label: "Email", note: "Contact information coming soon", disabled: true },
    ])
    expect(social?.items).toEqual([
      { label: "Facebook", note: "Coming soon", disabled: true },
      { label: "Instagram", note: "Coming soon", disabled: true },
      { label: "X/Twitter", note: "Coming soon", disabled: true },
      { label: "YouTube", note: "Coming soon", disabled: true },
    ])
  })

  it("uses configured contact and social values while preserving placeholders for missing values", async () => {
    process.env.NEXT_PUBLIC_CONTACT_PHONE = "+447700900123"
    process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL = "https://instagram.com/approved-brand"
    jest.resetModules()

    const { footerSections } = await import("@/lib/public-site")
    const contact = footerSections.find((section: { title: string }) => section.title === "Contact")
    const social = footerSections.find((section: { title: string }) => section.title === "Social")

    expect(contact?.items).toContainEqual({ label: "Telephone", href: "tel:+447700900123" })
    expect(contact?.items).toContainEqual({ label: "Email", note: "Contact information coming soon", disabled: true })
    expect(social?.items).toContainEqual({ label: "Instagram", href: "https://instagram.com/approved-brand" })
    expect(social?.items).toContainEqual({ label: "YouTube", note: "Coming soon", disabled: true })
  })

  it("uses fully configured contact and social values without placeholders", async () => {
    process.env.NEXT_PUBLIC_CONTACT_WHATSAPP_URL = "https://wa.me/447700900111"
    process.env.NEXT_PUBLIC_CONTACT_PHONE = "+447700900123"
    process.env.NEXT_PUBLIC_CONTACT_EMAIL = "concierge@example.com"
    process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL = "https://facebook.com/approved-brand"
    process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL = "https://instagram.com/approved-brand"
    process.env.NEXT_PUBLIC_SOCIAL_X_URL = "https://x.com/approved-brand"
    process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL = "https://youtube.com/@approved-brand"
    jest.resetModules()

    const { footerSections } = await import("@/lib/public-site")
    const contact = footerSections.find((section: { title: string }) => section.title === "Contact")
    const social = footerSections.find((section: { title: string }) => section.title === "Social")

    expect(contact?.items).toEqual([
      { label: "WhatsApp", href: "https://wa.me/447700900111" },
      { label: "Telephone", href: "tel:+447700900123" },
      { label: "Email", href: "mailto:concierge@example.com" },
    ])
    expect(social?.items).toEqual([
      { label: "Facebook", href: "https://facebook.com/approved-brand" },
      { label: "Instagram", href: "https://instagram.com/approved-brand" },
      { label: "X/Twitter", href: "https://x.com/approved-brand" },
      { label: "YouTube", href: "https://youtube.com/@approved-brand" },
    ])
  })
})
