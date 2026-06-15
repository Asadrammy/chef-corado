import { PublicContentPage } from "@/components/public/public-content-page";
import { buildPublicMetadata } from "@/lib/public-site";

export const metadata = buildPublicMetadata({
  title: "Careers | Chef Marketplace",
  description: "Careers and collaboration interest for people shaping premium private dining experiences.",
  path: "/careers",
});

export default function CareersPage() {
  return (
    <PublicContentPage
      eyebrow="Careers"
      title="Help shape the future of private dining."
      description="We are building a more thoughtful way for hosts, chefs, venues, and partners to create memorable dining experiences."
      primaryCta={{ label: "Our story", href: "/our-story" }}
      secondaryCta={{ label: "Contact the team", href: "mailto:hello@chefmarketplace.com" }}
      image="/images/marketplace/private-chef-hero.png"
      imageAlt="Private chef preparing dinner during an elegant home event"
    >
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Who thrives here</h2>
        <p className="text-sm leading-6 text-muted-foreground">People who care about hospitality, marketplace trust, chef relationships, client support, and details that make service feel effortless.</p>
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">How to introduce yourself</h2>
        <p className="text-sm leading-6 text-muted-foreground">Share the kind of work you do best, the hospitality problems you want to solve, and how you would help clients and chefs feel better served.</p>
      </div>
    </PublicContentPage>
  );
}
