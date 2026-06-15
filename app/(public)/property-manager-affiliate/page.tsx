import { PublicContentPage } from "@/components/public/public-content-page";
import { buildPublicMetadata } from "@/lib/public-site";

export const metadata = buildPublicMetadata({
  title: "Property Manager Affiliate | Chef Marketplace",
  description: "Private chef partnership opportunities for property managers, short-stay hosts, and serviced residences.",
  path: "/property-manager-affiliate",
});

export default function PropertyManagerAffiliatePage() {
  return (
    <PublicContentPage
      eyebrow="Property manager affiliate"
      title="Give guests a memorable dining option before they arrive."
      description="Connect residents, villa guests, serviced apartments, and premium stays with vetted private chefs for in-property dining."
      primaryCta={{ label: "Contact partnerships", href: "mailto:hello@chefmarketplace.com" }}
      secondaryCta={{ label: "Browse chefs", href: "/browse-chefs" }}
      image="/images/marketplace/seo-private-dining.png"
      imageAlt="Chef serving a private dining celebration"
    >
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">A better guest amenity</h2>
        <p className="text-sm leading-6 text-muted-foreground">Offer chef-led dinners, arrival meals, celebration menus, and local cuisine experiences without building an in-house culinary team.</p>
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Designed for hospitality partners</h2>
        <p className="text-sm leading-6 text-muted-foreground">Guests can discover local chefs, compare styles, and plan dining that feels native to the property and occasion.</p>
      </div>
    </PublicContentPage>
  );
}
