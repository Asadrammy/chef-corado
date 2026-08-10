/// <reference types="jest" />

describe("Phase 2 public site configuration", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_CONTACT_WHATSAPP_ACTIVE
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

  it("shows approved contact defaults while keeping WhatsApp inactive by default", async () => {
    const { footerSections } = await import("@/lib/public-site")

    const contact = footerSections.find((section: { title: string }) => section.title === "Contact")
    const social = footerSections.find((section: { title: string }) => section.title === "Social")

    expect(contact?.items).toEqual([
      { label: "WhatsApp", note: "Not active yet", disabled: true, value: "+44 07942 641878" },
      { label: "Telephone", href: "tel:+447942641878", value: "+44 07942 641878" },
      { label: "Email", href: "mailto:Info@chefachef.co.uk", value: "Info@chefachef.co.uk" },
    ])
    expect(social?.items).toEqual([
      { label: "Facebook", href: "https://www.facebook.com/chefachefUK" },
      { label: "Instagram", note: "Awaiting approved page", disabled: true },
      { label: "X/Twitter", note: "Awaiting approved page", disabled: true },
      { label: "YouTube", note: "Awaiting approved page", disabled: true },
    ])
  })

  it("uses configured contact and social values while preserving disabled missing social values", async () => {
    process.env.NEXT_PUBLIC_CONTACT_PHONE = "+447700900123"
    process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL = "https://instagram.com/approved-brand"
    jest.resetModules()

    const { footerSections } = await import("@/lib/public-site")
    const contact = footerSections.find((section: { title: string }) => section.title === "Contact")
    const social = footerSections.find((section: { title: string }) => section.title === "Social")

    expect(contact?.items).toContainEqual({ label: "Telephone", href: "tel:+447700900123", value: "+44 07942 641878" })
    expect(contact?.items).toContainEqual({ label: "Email", href: "mailto:Info@chefachef.co.uk", value: "Info@chefachef.co.uk" })
    expect(social?.items).toContainEqual({ label: "Instagram", href: "https://instagram.com/approved-brand" })
    expect(social?.items).toContainEqual({ label: "YouTube", note: "Awaiting approved page", disabled: true })
  })

  it("requires an explicit activation flag before exposing WhatsApp as a link", async () => {
    process.env.NEXT_PUBLIC_CONTACT_WHATSAPP_URL = "https://wa.me/447700900111"
    jest.resetModules()

    const inactive = await import("@/lib/public-site")
    const inactiveContact = inactive.footerSections.find((section: { title: string }) => section.title === "Contact")
    expect(inactiveContact?.items).toContainEqual({ label: "WhatsApp", note: "Not active yet", disabled: true, value: "+44 07942 641878" })

    process.env.NEXT_PUBLIC_CONTACT_WHATSAPP_ACTIVE = "true"
    jest.resetModules()

    const active = await import("@/lib/public-site")
    const activeContact = active.footerSections.find((section: { title: string }) => section.title === "Contact")
    expect(activeContact?.items).toContainEqual({ label: "WhatsApp", href: "https://wa.me/447700900111", value: "+44 07942 641878" })
  })

  it("uses fully configured active contact and social values without unapproved social placeholders", async () => {
    process.env.NEXT_PUBLIC_CONTACT_WHATSAPP_ACTIVE = "true"
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
      { label: "WhatsApp", href: "https://wa.me/447700900111", value: "+44 07942 641878" },
      { label: "Telephone", href: "tel:+447700900123", value: "+44 07942 641878" },
      { label: "Email", href: "mailto:concierge@example.com", value: "concierge@example.com" },
    ])
    expect(social?.items).toEqual([
      { label: "Facebook", href: "https://facebook.com/approved-brand" },
      { label: "Instagram", href: "https://instagram.com/approved-brand" },
      { label: "X/Twitter", href: "https://x.com/approved-brand" },
      { label: "YouTube", href: "https://youtube.com/@approved-brand" },
    ])
  })
})
