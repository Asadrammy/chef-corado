import Link from "next/link";

import type { PublicChefCardData } from "@/components/public/public-chef-card";
import { LocalChefDiscoveryWizard } from "@/components/public/local-chef-discovery-wizard";
import { PublicPageHero } from "@/components/public/public-page-hero";
import { Button } from "@/components/ui/button";
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

  const chefSearchResult = await fetchFromApp<SearchChef[]>(`/api/chefs/search${apiParams.toString() ? `?${apiParams.toString()}` : ""}`, 2500)
    .then((data) => ({ chefs: data, unavailable: false }))
    .catch(() => ({ chefs: [] as SearchChef[], unavailable: true }));

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

      <LocalChefDiscoveryWizard initialLocation={location} initialCuisine={cuisine} chefs={chefSearchResult.chefs} chefSearchUnavailable={chefSearchResult.unavailable} />
    </div>
  );
}
