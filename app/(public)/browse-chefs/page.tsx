import Link from "next/link";
import Image from "next/image";

import { PublicChefCard, type PublicChefCardData } from "@/components/public/public-chef-card";
import { PublicPageHero } from "@/components/public/public-page-hero";
import { PublicJsonLd } from "@/components/public/structured-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildPublicMetadata, fetchFromApp, homepageCuisineHighlights } from "@/lib/public-site";

export const metadata = buildPublicMetadata({
  title: "Browse Chefs | Chef Marketplace",
  description: "Browse approved chef profiles by cuisine, location, and review signals on the public marketplace.",
  path: "/browse-chefs",
});

type SearchChef = {
  id: string;
  bio?: string | null;
  location?: string | null;
  radius?: number | null;
  profileImage?: string | null;
  chefType?: string | null;
  cuisineType?: string | null;
  experience?: number | null;
  isApproved?: boolean;
  averageRating?: number;
  reviewCount?: number;
  user: {
    id: string;
    name: string;
    verified?: boolean;
    experienceLevel?: string | null;
  };
  menus?: Array<{
    title?: string | null;
    description?: string | null;
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
  const minRating = Number(normalizeQueryValue(params.minRating) || "0");

  const apiParams = new URLSearchParams();
  if (query || cuisine) {
    apiParams.set("query", [query, cuisine].filter(Boolean).join(" "));
  }
  if (location) {
    apiParams.set("location", location);
  }

  const chefs = await fetchFromApp<SearchChef[]>(`/api/chefs/search${apiParams.toString() ? `?${apiParams.toString()}` : ""}`).catch(() => []);

  const filteredChefs = chefs.filter((chef) => {
    const ratingPass = !minRating || (chef.averageRating ?? 0) >= minRating;
    const cuisinePass = !cuisine
      ? true
      : [chef.cuisineType, ...(chef.menus ?? []).flatMap((menu) => [menu.title, menu.description])]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(cuisine.toLowerCase()));

    return ratingPass && cuisinePass;
  }) as PublicChefCardData[];

  return (
    <div className="bg-background">
      <PublicJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Private chefs on Chef Marketplace",
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

        <form aria-label="Browse chefs filters" className="grid gap-4 rounded-[28px] border border-border/60 bg-background/90 p-6 shadow-sm shadow-black/5 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <label htmlFor="browse-query" className="text-sm font-medium text-foreground">Search chefs</label>
            <input id="browse-query" name="query" defaultValue={query} placeholder="Search chefs or specialties" className="h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground outline-none focus:border-primary" />
          </div>
          <div className="space-y-2">
            <label htmlFor="browse-cuisine" className="text-sm font-medium text-foreground">Cuisine</label>
            <input id="browse-cuisine" name="cuisine" defaultValue={cuisine} placeholder="Cuisine" className="h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground outline-none focus:border-primary" />
          </div>
          <div className="space-y-2">
            <label htmlFor="browse-location" className="text-sm font-medium text-foreground">Location</label>
            <input id="browse-location" name="location" defaultValue={location} placeholder="City or location" className="h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground outline-none focus:border-primary" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end xl:flex-col xl:items-stretch">
            <div className="flex-1 space-y-2">
              <label htmlFor="browse-rating" className="text-sm font-medium text-foreground">Minimum rating</label>
              <select id="browse-rating" name="minRating" defaultValue={minRating ? String(minRating) : ""} className="h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground outline-none focus:border-primary">
              <option value="">Any rating</option>
              <option value="3">3+ stars</option>
              <option value="4">4+ stars</option>
              <option value="5">5 stars</option>
            </select>
            </div>
            <Button type="submit" className="brand-gradient-button h-12 rounded-2xl border-0 px-5 text-white sm:w-auto xl:w-full">Apply Filters</Button>
          </div>
        </form>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{filteredChefs.length} chefs available for private dining discovery</p>
          <Button asChild variant="outline" className="border-border/70 bg-background/80 sm:w-auto">
            <Link href="/reviews">See reviews</Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {filteredChefs.length > 0 ? (
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
