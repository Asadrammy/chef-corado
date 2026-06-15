import { PublicContentPage } from "@/components/public/public-content-page";
import { buildPublicMetadata } from "@/lib/public-site";

export const metadata = buildPublicMetadata({
  title: "Blog | Chef Marketplace",
  description: "Hosting ideas, chef stories, cuisine inspiration, and private dining guidance.",
  path: "/blog",
});

export default function BlogPage() {
  return (
    <PublicContentPage
      eyebrow="Journal"
      title="Stories for better hosting, better menus, and more memorable tables."
      description="Explore the rituals, details, and chef perspectives that turn a meal into an occasion."
      primaryCta={{ label: "Browse chefs", href: "/browse-chefs" }}
      secondaryCta={{ label: "Our story", href: "/our-story" }}
      image="/images/marketplace/cuisine-asian-fusion.png"
      imageAlt="Elegant Asian fusion dishes arranged for private dining"
    >
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Hosting inspiration</h2>
        <p className="text-sm leading-6 text-muted-foreground">Seasonal menus, intimate dinner formats, celebration ideas, and practical notes for choosing the right chef for the room.</p>
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Chef stories</h2>
        <p className="text-sm leading-6 text-muted-foreground">Editorial space for chef interviews, signature dishes, regional cuisine, and the personal craft behind private dining.</p>
      </div>
    </PublicContentPage>
  );
}
