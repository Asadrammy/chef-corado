import { readFileSync } from "fs";
import path from "path";

const root = process.cwd();
const readSource = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");
const originalEnv = process.env;

describe("Phase 4 client-visible polish contracts", () => {
  afterAll(() => {
    process.env = originalEnv;
  });

  it("uses the requested neon orange as the primary brand token", () => {
    const globals = readSource("app/globals.css");
    const verificationEmail = readSource("lib/email-verification.ts");

    expect(globals).toContain("Neon Orange #FF5C00");
    expect(globals).toContain("--primary: 22 100% 50%");
    expect(globals).toContain("--brand-primary: 22 100% 50%");
    expect(globals).toContain("--brand-black: 0 0% 20%");
    expect(globals).toContain("--brand-cream: 22 100% 97%");
    expect(globals).not.toContain("Pumpkin Orange #FF7518");
    expect(verificationEmail).toContain("#ff5c00");
    expect(verificationEmail).not.toContain("#ff7518");
  });

  it("keeps inactive WhatsApp and unapproved socials out of public footer defaults", async () => {
    jest.resetModules();
    delete process.env.NEXT_PUBLIC_CONTACT_WHATSAPP_ACTIVE;
    delete process.env.NEXT_PUBLIC_CONTACT_WHATSAPP_URL;
    delete process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL;
    delete process.env.NEXT_PUBLIC_SOCIAL_X_URL;
    delete process.env.NEXT_PUBLIC_SOCIAL_TIKTOK_URL;
    delete process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL;

    const { footerSections } = await import("@/lib/public-site");
    const contact = footerSections.find((section: { title: string }) => section.title === "Contact");
    const social = footerSections.find((section: { title: string }) => section.title === "Social");

    expect(contact?.items).not.toEqual(expect.arrayContaining([expect.objectContaining({ label: "WhatsApp" })]));
    expect(contact?.items).toContainEqual({ label: "Telephone", href: "tel:+447942641878", value: "+44 07942 641878" });
    expect(contact?.items).toContainEqual({ label: "Email", href: "mailto:info@chefachef.co.uk", value: "info@chefachef.co.uk" });
    expect(social?.items).toEqual([]);
  });

  it("makes FAQ searchable and avoids presenting WhatsApp as active", () => {
    const faqPage = readSource("app/(public)/faq/page.tsx");
    const faqList = readSource("components/public/faq-list.tsx");

    expect(faqPage).toContain("<FaqList items={faqItems} />");
    expect(faqPage).toContain("WhatsApp is not presented as an active support channel");
    expect(faqPage).not.toContain("once WhatsApp is active");
    expect(faqList).toContain("Search frequently asked questions");
    expect(faqList).toContain("groupedItems");
  });

  it("removes template account identity from the active shared settings dashboard", () => {
    const settings = readSource("components/settings-dashboard.tsx");

    expect(settings).toContain("useSession");
    expect(settings).toContain("ChefaChef member");
    expect(settings).toContain("Manage Profile");
    expect(settings).not.toContain("John Doe");
    expect(settings).not.toContain("john@example.com");
    expect(settings).not.toContain("Simulate save operation");
  });

  it("keeps active dashboard surfaces off the old blue-purple CTA gradients", () => {
    const activeSources = [
      "app/dashboard/client/page.tsx",
      "app/dashboard/admin/page.tsx",
      "components/dashboard/chef/chef-action-panel.tsx",
      "components/dashboard/chef/chef-performance.tsx",
      "components/dashboard/chef/chef-booking-card.tsx",
      "components/dashboard/chef/chef-request-card.tsx",
      "components/dashboard/chef/chef-messages.tsx",
      "components/chef-bookings-dashboard.tsx",
      "components/chef-requests-marketplace.tsx",
      "components/ui/dashboard-stat-card.tsx",
    ].map(readSource);

    for (const source of activeSources) {
      expect(source).not.toContain("hsl(249_90%_68%)");
      expect(source).not.toContain("from-blue-500 to-purple");
      expect(source).not.toContain("from-blue-400 via-purple");
    }
  });
});
