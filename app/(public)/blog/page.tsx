import { PublicContentPage } from "@/components/public/public-content-page";
import { buildPublicMetadata } from "@/lib/public-site";

export const metadata = {
  ...buildPublicMetadata({
  title: "Blog | ChefaChef",
  description: "Hosting ideas, chef stories, cuisine inspiration, and private dining guidance.",
  path: "/blog",
  }),
  robots: { index: false, follow: true },
};

export default function BlogPage() {
  return (
    <PublicContentPage
      eyebrow="Journal"
      title="The editorial journal is being prepared."
      description="Real hosting guides, chef interviews, and cuisine stories will appear here once the editorial archive is ready."
      primaryCta={{ label: "Browse chefs", href: "/browse-chefs" }}
      secondaryCta={{ label: "Our story", href: "/our-story" }}
      image="/images/marketplace/cuisine-asian-fusion.png"
      imageAlt="Elegant Asian fusion dishes arranged for private dining"
    >
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">No published posts yet</h2>
        <p className="text-sm leading-6 text-muted-foreground">This page is intentionally kept as a coming-soon editorial state until real posts are available.</p>
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Chef stories</h2>
        <p className="text-sm leading-6 text-muted-foreground">The full journal archive is being prepared. This space will feature chef interviews, signature dishes, regional cuisine, and the personal craft behind private dining.</p>
      </div>
    </PublicContentPage>
  );
}
