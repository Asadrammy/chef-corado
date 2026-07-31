import { PublicContentPage } from "@/components/public/public-content-page";
import { PublicEnquiryForm } from "@/components/public/public-enquiry-form";
import { buildPublicMetadata } from "@/lib/public-site";

export const metadata = {
  ...buildPublicMetadata({
  title: "Gift Cards | Chef Marketplace",
  description: "Gift memorable private chef dining experiences for birthdays, anniversaries, and special occasions.",
  path: "/gift-cards",
  }),
  robots: { index: false, follow: true },
};

export default function GiftCardsPage() {
  return (
    <PublicContentPage
      eyebrow="Gift cards"
      title="Gift beautifully hosted dining instead of another generic present."
      description="Give the gift of a private chef experience. Perfect for birthdays, anniversaries, celebrations, or thoughtful personal gestures."
      primaryCta={{ label: "Join gift card enquiry list", href: "#gift-card-enquiry" }}
      secondaryCta={{ label: "Find local chef", href: "/find-local-chef" }}
      image="/images/marketplace/seo-private-dining.png"
      imageAlt="Private chef serving guests at a candlelit celebration"
    >
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Made for milestone moments</h2>
        <p className="text-sm leading-6 text-muted-foreground">A private chef gift can become an anniversary dinner, a birthday tasting menu, a family reunion meal, or a quiet evening designed around someone you love.</p>
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Purchasing is being prepared</h2>
        <p className="text-sm leading-6 text-muted-foreground">Gift card purchasing is not yet available online. Join the enquiry list and the team can review the request before any payment or voucher commitment is made.</p>
      </div>
      <div id="gift-card-enquiry" className="md:col-span-2">
        <PublicEnquiryForm
          type="gift-card"
          partnerTypeLabel="Gift occasion"
          messageLabel="Recipient location, timing, budget range, and any cuisine preferences"
        />
      </div>
    </PublicContentPage>
  );
}
