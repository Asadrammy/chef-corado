import { PublicContentPage } from "@/components/public/public-content-page";
import { PublicEnquiryForm } from "@/components/public/public-enquiry-form";
import { buildPublicMetadata } from "@/lib/public-site";

export const metadata = {
  ...buildPublicMetadata({
  title: "Careers | ChefaChef",
  description: "Careers and collaboration interest for people shaping premium private dining experiences.",
  path: "/careers",
  }),
  robots: { index: false, follow: true },
};

export default function CareersPage() {
  return (
    <PublicContentPage
      eyebrow="Careers"
      title="Help shape the future of private dining."
      description="We are building a more thoughtful way for hosts, chefs, venues, and partners to create memorable dining experiences."
      primaryCta={{ label: "Our story", href: "/our-story" }}
      secondaryCta={{ label: "Share interest", href: "#career-interest" }}
      image="/images/marketplace/private-chef-hero.png"
      imageAlt="Private chef preparing dinner during an elegant home event"
    >
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Who thrives here</h2>
        <p className="text-sm leading-6 text-muted-foreground">People who care about hospitality, marketplace trust, chef relationships, client support, and details that make service feel effortless.</p>
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">How to introduce yourself</h2>
        <p className="text-sm leading-6 text-muted-foreground">There are no public job listings in the product yet. Share general interest and the team can review it from the stored enquiry record.</p>
      </div>
      <div id="career-interest" className="md:col-span-2">
        <PublicEnquiryForm
          type="careers"
          partnerTypeLabel="Area of interest"
          messageLabel="Experience, interests, and the kind of role you would like to discuss"
        />
      </div>
    </PublicContentPage>
  );
}
