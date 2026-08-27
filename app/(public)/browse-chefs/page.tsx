import Link from "next/link";
import Image from "next/image";

import { PublicChefCard, type PublicChefCardData } from "@/components/public/public-chef-card";
import { PublicPageHero } from "@/components/public/public-page-hero";
import { PublicJsonLd } from "@/components/public/structured-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildPublicMetadata, fetchFromApp, homepageCuisineHighlights } from "@/lib/public-site";
import { getCuisineOptionsForContext } from "@/lib/request-options";

export const metadata = buildPublicMetadata({
  title: "Browse Chefs | ChefaChef",
  description: "Browse approved chef profiles by cuisine, location, and review signals on the public marketplace.",
  path: "/browse-chefs",
});

type SearchChef = {
  id: string;
  bio?: string | null;
  location?: string | null;
  radius?: number | null;
  profileImage?: string | null;
  cuisineType?: string | null;
  displayName?: string;
  experience?: number | null;
  averageRating?: number;
  reviewCount?: number;
  completedJobs?: number;
  publicMinimumSpend?: number | null;
  publicMinimumSpendCurrency?: string | null;
  distance?: number | null;
  user: {
    id: string;
    name: string;
  };
  menus?: Array<{
    title?: string | null;
    description?: string | null;
    price?: number | null;
    currency?: string | null;
    menuImage?: string | null;
    cuisineType?: string | null;
    eventType?: string | null;
  }>;
};

function normalizeQueryValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function BrowseChefsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const query = normalizeQueryValue(params.query).trim();
  const location = normalizeQueryValue(params.location).trim();
  const cuisine = normalizeQueryValue(params.cuisine).trim();
  const sort = normalizeQueryValue(params.sort).trim() || "popular";
  const minBudget = normalizeQueryValue(params.minBudget).trim();
  const maxBudget = normalizeQueryValue(params.maxBudget).trim();
  const minRating = Number(normalizeQueryValue(params.minRating) || "0");
  const cuisineOptions = getCuisineOptionsForContext("search").map((option) => option.label);

  const apiParams = new URLSearchParams();
  if (query) {
    apiParams.set("query", query);
  }
  if (cuisine) {
    apiParams.set("cuisines", cuisine);
  }
  if (location) {
    apiParams.set("location", location);
  }
  if (sort) {
    apiParams.set("sort", sort);
  }
  if (minBudget) {
    apiParams.set("minBudget", minBudget);
  }
  if (maxBudget) {
    apiParams.set("maxBudget", maxBudget);
  }
  if (minRating) {
    apiParams.set("minRating", String(minRating));
  }

  const chefSearchResult = await fetchFromApp<SearchChef[]>(`/api/chefs/search${apiParams.toString() ? `?${apiParams.toString()}` : ""}`)
    .then((data) => ({ chefs: data, unavailable: false }))
    .catch(() => ({ chefs: [] as SearchChef[], unavailable: true }));
  const { chefs } = chefSearchResult;

  const filteredChefs = chefs as PublicChefCardData[];

  return (
    <div className="bg-background">
      <PublicJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Private chefs on ChefaChef",
          itemListElement: filteredChefs.slice(0, 12).map((chef, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "Person",
              name: chef.user.name,
              description: chef.bio,
              image: chef.profileImage,
              address: chef.location,
            },
          })),
        }}
      />
      <PublicPageHero
        eyebrow="Browse chefs"
        title="Explore private chefs for dinners, celebrations, and tasting menus."
        description="Compare cuisine styles, service areas, reviews, and menus, then enquire with the chef who feels right for your occasion."
        actions={
          <Button asChild className="brand-gradient-button border-0 shadow-lg shadow-primary/20">
            <Link href="/find-local-chef">Start with location</Link>
          </Button>
        }
      />

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {homepageCuisineHighlights.map((item) => (
            <Link key={item.title} href={item.href} className="group relative min-h-[220px] overflow-hidden rounded-[28px] border border-border/60 bg-background shadow-sm shadow-black/5">
              <Image src={item.image} alt={`${item.title} private dining inspiration`} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Cuisine collection</p>
                <h2 className="mt-2 text-2xl font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-white/78">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>

        <form aria-label="Browse chefs filters" className="grid gap-4 rounded-[28px] border border-border/60 bg-background/90 p-6 shadow-sm shadow-black/5 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-2">
            <label htmlFor="browse-query" className="text-sm font-medium text-foreground">Search chefs</label>
            <input id="browse-query" name="query" defaultValue={query} placeholder="Search chefs or specialties" className="h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground outline-none focus:border-primary" />
          </div>
          <div className="space-y-2">
            <label htmlFor="browse-cuisine" className="text-sm font-medium text-foreground">Cuisine</label>
            <select id="browse-cuisine" name="cuisine" defaultValue={cuisine} className="h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground outline-none focus:border-primary">
              <option value="">Any cuisine</option>
              {cuisineOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="browse-location" className="text-sm font-medium text-foreground">Location</label>
            <input id="browse-location" name="location" defaultValue={location} placeholder="City or location" className="h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground outline-none focus:border-primary" />
          </div>
          <div className="space-y-2">
            <label htmlFor="browse-min-budget" className="text-sm font-medium text-foreground">Min budget</label>
            <input id="browse-min-budget" name="minBudget" inputMode="numeric" defaultValue={minBudget} placeholder="GBP 0" className="h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground outline-none focus:border-primary" />
          </div>
          <div className="space-y-2">
            <label htmlFor="browse-max-budget" className="text-sm font-medium text-foreground">Max budget</label>
            <input id="browse-max-budget" name="maxBudget" inputMode="numeric" defaultValue={maxBudget} placeholder="GBP 2000" className="h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground outline-none focus:border-primary" />
          </div>
          <div className="space-y-2">
            <label htmlFor="browse-sort" className="text-sm font-medium text-foreground">Sort</label>
            <select id="browse-sort" name="sort" defaultValue={sort} className="h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground outline-none focus:border-primary">
              <option value="popular">Most popular</option>
              <option value="jobs">Number of jobs</option>
              <option value="price_asc">Price low to high</option>
              <option value="price_desc">Price high to low</option>
              <option value="newest">Newest chefs</option>
              <option value="closest">Closest to me</option>
            </select>
          </div>
          <div className="flex items-end gap-3 md:col-span-2 xl:col-span-6">
            <Button type="submit" className="brand-gradient-button h-12 rounded-2xl border-0 px-5 text-white">Apply Filters</Button>
            <Button asChild variant="outline" className="h-12 rounded-2xl border-border/70 bg-background/80">
              <Link href="/browse-chefs">Clear</Link>
            </Button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {cuisineOptions.slice(0, 10).map((option) => (
            <Link key={option} href={`/browse-chefs?cuisine=${encodeURIComponent(option)}`} className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm text-foreground transition hover:border-primary/40 hover:bg-primary/5">
              {option}
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {chefSearchResult.unavailable ? "Chef search is temporarily unavailable" : `${filteredChefs.length} chefs available for private dining discovery`}
          </p>
          <Button asChild variant="outline" className="border-border/70 bg-background/80 sm:w-auto">
            <Link href="/reviews">See reviews</Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {chefSearchResult.unavailable ? (
            <Card className="lg:col-span-3 rounded-[28px] border-border/60">
              <CardContent className="p-8 text-sm text-muted-foreground">
                The chef catalogue is temporarily unavailable. Please try again shortly, or start a guided request so the details are ready when chef data is available.
              </CardContent>
            </Card>
          ) : filteredChefs.length > 0 ? (
            filteredChefs.map((chef) => <PublicChefCard key={chef.id} chef={chef} />)
          ) : (
            <Card className="lg:col-span-3 rounded-[28px] border-border/60">
              <CardContent className="p-8 text-sm text-muted-foreground">
                No chefs matched the current filters. Try broadening cuisine, rating, or location criteria, or begin with a nearby service area.
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
