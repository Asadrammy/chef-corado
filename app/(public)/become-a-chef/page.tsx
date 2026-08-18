import { PublicContentPage } from "@/components/public/public-content-page";
import { buildPublicMetadata } from "@/lib/public-site";

export const metadata = buildPublicMetadata({
  title: "Become a Chef | ChefaChef",
  description: "Join ChefaChef as a private chef and showcase your cuisine to clients planning beautifully hosted dining.",
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
        <h2 className="text-xl font-semibold text-foreground">Requirements before offering services</h2>
        <p className="text-sm leading-6 text-muted-foreground">Chefs must accept the current terms, complete profile information, confirm right to work where applicable, confirm Level 2 food hygiene, upload a food hygiene certificate for review where required, and receive platform approval before sending proposals.</p>
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Profile, bookings, and payouts</h2>
        <p className="text-sm leading-6 text-muted-foreground">Approved chefs can maintain menus, availability, service radius, public profile content, request proposals, messages, bookings, and payout requests. Qualifying official ChefaChef bookings processed through the platform are protected by platform-level public liability coverage up to GBP 5 million; private or off-platform work is outside that booking policy.</p>
      </div>
    </PublicContentPage>
  );
}
