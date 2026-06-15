import { PublicContentPage } from "@/components/public/public-content-page";
import { buildPublicMetadata } from "@/lib/public-site";

export const metadata = buildPublicMetadata({
  title: "Become a Chef | Chef Marketplace",
  description: "Join Chef Marketplace as a private chef and showcase your cuisine to clients planning beautifully hosted dining.",
  path: "/become-a-chef",
});

export default function BecomeChefPage() {
  return (
    <PublicContentPage
      eyebrow="Become a chef"
      title="Share your culinary expertise with clients who care about hosting well."
      description="Create a polished public profile, present your cuisine, and meet clients planning dinners, celebrations, classes, and private culinary experiences."
      primaryCta={{ label: "Apply as a Chef", href: "/register?role=CHEF" }}
      secondaryCta={{ label: "Chef sign in", href: "/login?role=CHEF" }}
      image="/images/marketplace/private-chef-hero.png"
      imageAlt="Private chef plating dinner in an elegant home kitchen"
    >
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Why chefs join</h2>
        <p className="text-sm leading-6 text-muted-foreground">Public profiles, cuisine discovery, guest reviews, and location-led browsing help your craft reach clients looking for thoughtful private dining.</p>
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">A professional presence</h2>
        <p className="text-sm leading-6 text-muted-foreground">Showcase menus, cooking classes, specialties, service areas, and the kind of occasions where your food shines.</p>
      </div>
    </PublicContentPage>
  );
}
