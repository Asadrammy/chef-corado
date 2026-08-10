import Link from "next/link";

import { PublicContentPage } from "@/components/public/public-content-page";
import { COUNTRY_BOOKING_RULES, MARKETPLACE_PAYMENT_RULES, PLATFORM_COMMISSION_PERCENT } from "@/lib/marketplace-rules";
import { buildPublicMetadata } from "@/lib/public-site";

export const metadata = buildPublicMetadata({
  title: "Pricing | ChefaChef",
  description: "Understand how private chef pricing is shaped by menu, guest count, service style, and occasion details.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <PublicContentPage
      eyebrow="Pricing"
      title="Transparent pricing for beautifully hosted dining."
      description="Every private dining occasion is shaped by the chef, menu, guest count, service style, and setting. Start with discovery, then refine the details around your table."
      primaryCta={{ label: "Browse chefs", href: "/browse-chefs" }}
      secondaryCta={{ label: "Find local chef", href: "/find-local-chef" }}
      image="/images/marketplace/cuisine-modern-european.png"
      imageAlt="Fine dining plate being finished for a private event"
    >
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">What shapes your quote</h2>
        <p className="text-sm leading-6 text-muted-foreground">Chef expertise, ingredients, service style, travel, staffing, and the level of preparation all influence the final proposal. Marketplace requests preserve the request currency by country: GBP for the United Kingdom, USD for the United States, EUR for Italy, and KES for Kenya.</p>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li>Chef profile, cuisine specialization, and menu ambition</li>
          <li>Guest count, course structure, and level of service</li>
          <li>Ingredients, dietary needs, travel, and event setting</li>
          <li>Bookable experience pricing where a chef has published it</li>
          <li>ChefaChef deducts a {PLATFORM_COMMISSION_PERCENT}% marketplace commission before chef payout</li>
          <li>{MARKETPLACE_PAYMENT_RULES.escrow}</li>
        </ul>
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Country guidance</h2>
        <p className="text-sm leading-6 text-muted-foreground">USA: {COUNTRY_BOOKING_RULES.US.minimumSpend}; {COUNTRY_BOOKING_RULES.US.pricing}</p>
        <p className="text-sm leading-6 text-muted-foreground">Italy: {COUNTRY_BOOKING_RULES.IT.pricing} A fixed Italy minimum spend has not been supplied.</p>
        <p className="text-sm leading-6 text-muted-foreground">Kenya: {COUNTRY_BOOKING_RULES.KE.minimumSpend}. {COUNTRY_BOOKING_RULES.KE.pricing}</p>
        <p className="text-sm leading-6 text-muted-foreground">Public pages are indicative; final pricing is set by the chef proposal or published experience.</p>
        <Link href="/reviews" className="text-sm font-semibold text-primary hover:underline">Read real reviews</Link>
      </div>
    </PublicContentPage>
  );
}
