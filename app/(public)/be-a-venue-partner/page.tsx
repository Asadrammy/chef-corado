import { PublicContentPage } from "@/components/public/public-content-page";
import { PublicEnquiryForm } from "@/components/public/public-enquiry-form";
import { buildPublicMetadata } from "@/lib/public-site";

export const metadata = buildPublicMetadata({
  title: "Be a Venue Partner | Chef Marketplace",
  description: "Venue partnership landing page for spaces that want to host chef-led private dining and culinary experiences.",
  path: "/be-a-venue-partner",
});

export default function VenuePartnerPage() {
  return (
    <PublicContentPage
      eyebrow="Venue partner"
      title="Bring chef-led private dining into distinctive spaces."
      description="Partner with chefs and hosts planning tastings, celebrations, brand dinners, classes, and intimate culinary events."
      primaryCta={{ label: "Submit venue enquiry", href: "#venue-enquiry" }}
      secondaryCta={{ label: "Find local chef", href: "/find-local-chef" }}
      image="/images/marketplace/cuisine-modern-european.png"
      imageAlt="Fine dining dish prepared for a venue event"
    >
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Why venues partner</h2>
        <p className="text-sm leading-6 text-muted-foreground">The right chef can turn a room, terrace, gallery, or private dining space into a memorable destination for clients and guests.</p>
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Ideal spaces</h2>
        <p className="text-sm leading-6 text-muted-foreground">Boutique venues, event spaces, residences, studios, members rooms, and hospitality locations suited to intimate dining experiences. Partner onboarding is currently handled by enquiry.</p>
      </div>
      <div id="venue-enquiry" className="md:col-span-2">
        <PublicEnquiryForm
          type="venue-partner"
          partnerTypeLabel="Venue type"
          messageLabel="Tell us about the space, location, capacity, catering constraints, and event fit"
        />
      </div>
    </PublicContentPage>
  );
}
