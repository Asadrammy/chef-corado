import Link from "next/link";

import { PublicContentPage } from "@/components/public/public-content-page";
import { buildPublicMetadata } from "@/lib/public-site";

export const metadata = buildPublicMetadata({
  title: "Pricing | Chef Marketplace",
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
        <p className="text-sm leading-6 text-muted-foreground">Chef expertise, ingredients, service style, travel, staffing, and the level of preparation all influence the final proposal.</p>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li>Chef profile, cuisine specialization, and menu ambition</li>
          <li>Guest count, course structure, and level of service</li>
          <li>Ingredients, dietary needs, travel, and event setting</li>
          <li>Bookable experience pricing where a chef has published it</li>
        </ul>
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">A calmer way to plan</h2>
        <p className="text-sm leading-6 text-muted-foreground">Browse first, shortlist with confidence, then enquire with the occasion details that matter most.</p>
        <p className="text-sm leading-6 text-muted-foreground">Ready to start? Browse chefs or find local coverage in your event area.</p>
        <Link href="/reviews" className="text-sm font-semibold text-primary hover:underline">Read real reviews</Link>
      </div>
    </PublicContentPage>
  );
}
