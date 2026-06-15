import Link from "next/link";
import { MapPin } from "lucide-react";

import { PublicChefCard, type PublicChefCardData } from "@/components/public/public-chef-card";
import { PublicPageHero } from "@/components/public/public-page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildPublicMetadata, fetchFromApp } from "@/lib/public-site";

export const metadata = buildPublicMetadata({
  title: "Find Local Chef | Chef Marketplace",
  description: "Start chef discovery with city and location filters, then compare cuisines, travel radius, and review signals.",
  path: "/find-local-chef",
});

type SearchChef = PublicChefCardData & {
  averageRating?: number;
  reviewCount?: number;
};

function normalizeQueryValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function FindLocalChefPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const location = normalizeQueryValue(params.location).trim();
  const cuisine = normalizeQueryValue(params.cuisine).trim();

  const apiParams = new URLSearchParams();
  if (location) {
    apiParams.set("location", location);
  }
  if (cuisine) {
    apiParams.set("query", cuisine);
  }

  const chefs = await fetchFromApp<SearchChef[]>(`/api/chefs/search${apiParams.toString() ? `?${apiParams.toString()}` : ""}`).catch(() => []);

  return (
    <div className="bg-background">
      <PublicPageHero
        eyebrow="Find local chef"
        title="Find a private chef near the table you are setting."
        description="Start with the event location, then shortlist chefs by cuisine, service area, reviews, and the kind of occasion you want to host."
        actions={
          <Button asChild variant="outline" className="border-border/70 bg-background/80">
            <Link href="/browse-chefs">Browse all chefs</Link>
          </Button>
        }
      />

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <form aria-label="Find a local chef by area and cuisine" className="grid gap-4 rounded-[28px] border border-border/60 bg-background/90 p-6 shadow-sm shadow-black/5 md:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-2">
            <label htmlFor="find-local-location" className="text-sm font-medium text-foreground">Event location</label>
            <input id="find-local-location" name="location" defaultValue={location} placeholder="City, postcode, or area" className="h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground outline-none focus:border-primary" />
          </div>
          <div className="space-y-2">
            <label htmlFor="find-local-cuisine" className="text-sm font-medium text-foreground">Cuisine or dining style</label>
            <input id="find-local-cuisine" name="cuisine" defaultValue={cuisine} placeholder="Cuisine or dining style" className="h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground outline-none focus:border-primary" />
          </div>
          <Button type="submit" className="brand-gradient-button h-12 rounded-2xl border-0 px-6 text-white md:self-end">
            <MapPin className="mr-2 h-4 w-4" />
            Find Chefs in Area
          </Button>
        </form>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {chefs.length > 0 ? (
            chefs.map((chef) => <PublicChefCard key={chef.id} chef={chef} />)
          ) : (
            <Card className="lg:col-span-3 rounded-[28px] border-border/60">
              <CardContent className="p-8 text-sm text-muted-foreground">
                Enter a location to start local chef discovery, or browse all vetted chefs for private dinners, celebrations, and culinary experiences.
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
