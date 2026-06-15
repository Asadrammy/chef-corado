import Link from "next/link";
import { Star } from "lucide-react";

import { PublicPageHero } from "@/components/public/public-page-hero";
import { PublicJsonLd } from "@/components/public/structured-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildPublicMetadata, fetchFromApp } from "@/lib/public-site";

export const metadata = buildPublicMetadata({
  title: "Reviews | Chef Marketplace",
  description: "Read real client feedback from private chef profiles and completed dining experiences.",
  path: "/reviews",
});

type ChefRecord = { id: string; user: { name: string } };
type ReviewPayload = {
  id: string;
  rating: number;
  comment?: string | null;
  client: { name: string };
};
type ChefProfilePayload = {
  id: string;
  user: { name: string };
  reviews: ReviewPayload[];
};

export default async function ReviewsPage() {
  const chefs = await fetchFromApp<ChefRecord[]>("/api/chefs").catch(() => []);
  const profiles = await Promise.all(
    chefs.slice(0, 6).map(async (chef) => {
      try {
        return await fetchFromApp<ChefProfilePayload>(`/api/chefs/${chef.id}`);
      } catch {
        return null;
      }
    })
  );

  const reviews = profiles
    .filter(Boolean)
    .flatMap((chef) => (chef as ChefProfilePayload).reviews.map((review) => ({ ...review, chefName: (chef as ChefProfilePayload).user.name })))
    .slice(0, 12);

  return (
    <div className="bg-background">
      <PublicJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Private chef reviews",
          itemListElement: reviews.map((review, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "Review",
              reviewRating: {
                "@type": "Rating",
                ratingValue: review.rating,
                bestRating: 5,
              },
              reviewBody: review.comment || "A completed private dining booking generated a review.",
              author: {
                "@type": "Person",
                name: review.client.name,
              },
              itemReviewed: {
                "@type": "Person",
                name: review.chefName,
              },
            },
          })),
        }}
      />
      <PublicPageHero
        eyebrow="Customer reviews"
        title="Real guest feedback from private chef experiences."
        description="Read client reviews connected to chef profiles, menus, and completed dining experiences."
        actions={
          <Button asChild className="brand-gradient-button border-0 shadow-lg shadow-primary/20">
            <Link href="/browse-chefs">Browse chefs</Link>
          </Button>
        }
      />

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <Card key={review.id} className="rounded-[28px] border-border/60 bg-background/90 shadow-sm shadow-black/5">
                <CardContent className="p-6 sm:p-7">
                  <div className="flex items-center gap-1 text-amber-600">
                    {Array.from({ length: review.rating }).map((_, index) => (
                      <Star key={`${review.id}-${index}`} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    {review.comment || "A completed private dining booking generated a review without a public written comment."}
                  </p>
                  <div className="mt-6 text-sm">
                    <p className="font-semibold text-foreground">{review.client.name}</p>
                    <p className="text-muted-foreground">Review for {review.chefName}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="md:col-span-2 rounded-[28px] border-border/60 xl:col-span-3">
              <CardContent className="p-8 text-sm text-muted-foreground">
                Guest reviews will appear here as clients share feedback on completed private dining experiences.
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
