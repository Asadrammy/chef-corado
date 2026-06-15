import { PublicContentPage } from "@/components/public/public-content-page";
import { buildPublicMetadata } from "@/lib/public-site";

export const metadata = buildPublicMetadata({
  title: "Our Story | Chef Marketplace",
  description: "Learn how Chef Marketplace helps hosts discover vetted private chefs for beautifully hosted dining.",
  path: "/our-story",
});

export default function OurStoryPage() {
  return (
    <PublicContentPage
      eyebrow="Our story"
      title="A better way to gather around the table."
      description="Chef Marketplace was created for people who want the warmth of hosting without losing the evening to planning, shopping, cooking, and service."
      primaryCta={{ label: "Browse chefs", href: "/browse-chefs" }}
      secondaryCta={{ label: "Read reviews", href: "/reviews" }}
      image="/images/marketplace/seo-private-dining.png"
      imageAlt="Private chef presenting dinner at a candlelit table"
    >
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Hospitality with less friction</h2>
        <p className="text-sm leading-6 text-muted-foreground">The best evenings feel effortless: a menu that suits the guests, a chef who understands the occasion, and a host who can stay present.</p>
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">What matters most</h2>
        <p className="text-sm leading-6 text-muted-foreground">Vetted chefs, real reviews, cuisine-led discovery, and thoughtful event details help clients choose with confidence before the first course is served.</p>
      </div>
    </PublicContentPage>
  );
}
