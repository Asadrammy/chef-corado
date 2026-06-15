import { PublicContentPage } from "@/components/public/public-content-page";
import { buildPublicMetadata } from "@/lib/public-site";

export const metadata = buildPublicMetadata({
  title: "Gift Cards | Chef Marketplace",
  description: "Gift memorable private chef dining experiences for birthdays, anniversaries, and special occasions.",
  path: "/gift-cards",
});

export default function GiftCardsPage() {
  return (
    <PublicContentPage
      eyebrow="Gift cards"
      title="Gift beautifully hosted dining instead of another generic present."
      description="Give the gift of a private chef experience. Perfect for birthdays, anniversaries, celebrations, or thoughtful personal gestures."
      primaryCta={{ label: "Explore chefs", href: "/browse-chefs" }}
      secondaryCta={{ label: "Find local chef", href: "/find-local-chef" }}
      image="/images/marketplace/seo-private-dining.png"
      imageAlt="Private chef serving guests at a candlelit celebration"
    >
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Made for milestone moments</h2>
        <p className="text-sm leading-6 text-muted-foreground">A private chef gift can become an anniversary dinner, a birthday tasting menu, a family reunion meal, or a quiet evening designed around someone you love.</p>
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">How it works</h2>
        <p className="text-sm leading-6 text-muted-foreground">Start by exploring chefs and experiences in your recipient's area, then shape the gift around cuisine, date flexibility, and the atmosphere they would enjoy most.</p>
      </div>
    </PublicContentPage>
  );
}
