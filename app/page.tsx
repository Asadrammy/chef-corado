import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, MapPin, ShieldCheck, Sparkles, Star, UserRoundSearch } from "lucide-react";

import { HomepageSearchForm } from "@/components/public/homepage-search-form";
import { PublicShell } from "@/components/public/public-shell";
import type { PublicChefCardData } from "@/components/public/public-chef-card";
import { PublicJsonLd } from "@/components/public/structured-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateAvatarFallback } from "@/lib/utils";
import { buildPublicMetadata, fetchFromApp, homepageCuisineHighlights } from "@/lib/public-site";

export const metadata = buildPublicMetadata({
  title: "ChefaChef | Private chefs for unforgettable dining at home",
  description:
    "Discover vetted private chefs for intimate dinners, celebrations, tasting menus, and beautifully hosted culinary experiences.",
  path: "/",
});

type ChefApiRecord = {
  id: string;
  bio?: string | null;
  location?: string | null;
  radius?: number | null;
  profileImage?: string | null;
  chefType?: string | null;
  cuisineType?: string | null;
  experience?: number | null;
  isApproved?: boolean;
  user: {
    id: string;
    name: string;
    verified?: boolean;
    experienceLevel?: string | null;
  };
};

type ChefProfileReview = {
  id: string;
  rating: number;
  comment?: string | null;
  client: {
    name: string;
  };
};

type ChefProfilePayload = PublicChefCardData & {
  reviews: ChefProfileReview[];
};

const trustItems = [
  {
    title: "Chefs chosen with confidence",
    description: "Review each chef's cuisine, service area, experience, and guest feedback before you begin the conversation.",
    icon: CheckCircle2,
  },
  {
    title: "Occasions shaped with care",
    description: "Plan birthdays, anniversaries, tasting menus, family gatherings, and intimate evenings around the table.",
    icon: ShieldCheck,
  },
  {
    title: "Dining details made clear",
    description: "Explore menus, hosting style, location, and availability signals so the evening feels considered from the start.",
    icon: Sparkles,
  },
  {
    title: "Guest voices matter",
    description: "Real reviews help you understand how a chef brings calm, craft, and presence into private dining.",
    icon: Star,
  },
] as const;

const howItWorks = [
  {
    title: "Discover a chef",
    description: "Explore chefs by cuisine, location, menus, reviews, and the kind of evening you want to host.",
  },
  {
    title: "Plan the occasion",
    description: "Share the date, guest count, cuisine preferences, and the atmosphere you want to create.",
  },
  {
    title: "Host with confidence",
    description: "Your chef handles the culinary details so you can be present for the people around your table.",
  },
] as const;

function HomepageFeaturedChefCard({ chef }: { chef: PublicChefCardData }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[30px] border border-border/50 bg-background shadow-sm shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/10">
      <div className="relative min-h-[220px] bg-[#07111f]">
        {chef.profileImage ? (
          <div
            aria-label={`${chef.user.name} private chef portrait`}
            className="h-[220px] w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            role="img"
            style={{ backgroundImage: `url(${chef.profileImage})` }}
          />
        ) : (
          <div className="flex h-full min-h-[220px] items-center justify-center bg-[linear-gradient(135deg,rgba(7,17,31,0.96),rgba(31,41,55,0.9))] text-white">
            <Avatar className="h-24 w-24 rounded-[28px] border border-white/15">
              <AvatarImage src={undefined} alt={`${chef.user.name} private chef portrait`} />
              <AvatarFallback className="rounded-[28px] bg-white/10 text-3xl font-semibold text-white">
                {generateAvatarFallback(chef.user.name || "Chef")}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/72">
            {chef.cuisineType || chef.chefType || "Private dining"}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight">{chef.user.name}</h3>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-5 p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {chef.location ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {chef.location}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5 text-amber-700">
            <Star className="h-4 w-4 fill-current" />
            {(chef.averageRating ?? 0).toFixed(1)} ({chef.reviewCount ?? 0})
          </span>
        </div>
        <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">
          {chef.bio || "A chef preparing menus, dining style, and availability details for private occasions."}
        </p>
        <div className="mt-auto flex flex-col gap-3 sm:flex-row">
          <Button asChild className="brand-gradient-button flex-1 rounded-2xl border-0 text-white shadow-lg shadow-primary/15">
            <Link href={`/chefs/${chef.id}`}>Meet the Chef</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 rounded-2xl border-border/60 bg-background/80">
            <Link href={`/find-local-chef?location=${encodeURIComponent(chef.location ?? "")}`}>Plan Nearby</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export default async function RootPage() {
  const chefs = await fetchFromApp<ChefApiRecord[]>("/api/chefs").catch(() => []);
  const featuredChefs = chefs.slice(0, 3);

  const featuredProfiles = await Promise.all(
    featuredChefs.map(async (chef) => {
      try {
        return await fetchFromApp<ChefProfilePayload>(`/api/chefs/${chef.id}`);
      } catch {
        return null;
      }
    })
  );

  const featuredCards = featuredProfiles.filter(Boolean) as ChefProfilePayload[];
  const testimonials = featuredCards
    .flatMap((chef) =>
      chef.reviews.slice(0, 2).map((review) => ({
        ...review,
        chefName: chef.user.name,
      }))
    )
    .slice(0, 4);

  return (
    <PublicShell>
      <div className="bg-background">
        <PublicJsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "ChefaChef",
            url: "/",
            potentialAction: {
              "@type": "SearchAction",
              target: "/find-local-chef?cuisine={cuisine}&location={location}",
              "query-input": ["required name=cuisine", "required name=location"],
            },
          }}
        />
        <section className="relative overflow-hidden border-b border-white/10 bg-[#07111f] text-white">
          <div className="absolute inset-0 opacity-35">
            <Image src="/images/marketplace/private-chef-hero.png" alt="Private chef plating dinner for a candlelit celebration" fill priority sizes="100vw" className="object-cover" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,17,31,0.96)_0%,rgba(7,17,31,0.86)_44%,rgba(7,17,31,0.42)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#07111f] to-transparent" />
          <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-24">
            <div className="space-y-7 lg:space-y-8">
              <Badge className="w-fit rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-white shadow-lg shadow-black/20 backdrop-blur">
                Private chefs for unforgettable evenings
              </Badge>
              <div className="space-y-6">
                <h1 className="max-w-4xl break-words text-4xl font-semibold tracking-[-0.03em] sm:text-6xl lg:text-7xl">
                  Host the dinner everyone remembers.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-white/78 sm:text-lg sm:leading-8">
                  Discover trusted private chefs for intimate dinners, milestone celebrations, tasting menus, and chef-led evenings brought beautifully to your table.
                </p>
              </div>
              <HomepageSearchForm />
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="brand-gradient-button h-12 rounded-2xl border-0 px-6 shadow-lg shadow-primary/25">
                  <Link href="/browse-chefs">Browse Private Chefs</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-2xl border-white/20 bg-white/10 px-6 text-white backdrop-blur hover:bg-white/15 hover:text-white">
                  <Link href="/find-local-chef">Plan Your Event</Link>
                </Button>
              </div>
              <div className="grid max-w-2xl gap-3 text-sm text-white/72 sm:grid-cols-3">
                <span>Anniversaries</span>
                <span>Family celebrations</span>
                <span>Private tasting menus</span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:self-end">
              <div className="relative min-h-[260px] overflow-hidden rounded-[30px] border border-white/10 bg-white/8 shadow-2xl shadow-black/25 backdrop-blur-xl sm:min-h-[320px]">
                <Image src="/images/marketplace/cuisine-modern-european.png" alt="Chef finishing an elevated plated dinner" fill priority sizes="(min-width: 1024px) 42vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-sm uppercase tracking-[0.24em] text-white/75">Curated private dining</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">From first course to final toast, the evening feels considered.</p>
                </div>
              </div>
              <div className="rounded-[30px] border border-white/10 bg-white/10 p-6 shadow-xl shadow-black/20 backdrop-blur-xl">
                <p className="text-sm uppercase tracking-[0.24em] text-white/72">For evenings with intention</p>
                <div className="mt-5 grid gap-4 text-sm text-white/80">
                  <div className="flex items-start gap-3">
                    <UserRoundSearch className="mt-0.5 h-4 w-4" />
                    <span>Choose by cuisine, location, menus, and the style of gathering you want to host.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4" />
                    <span>Plan birthdays, anniversaries, dinner parties, and hosted gatherings with calm confidence.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4" />
                    <span>Location-led discovery helps you begin with the home, venue, or destination where the table will be set.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border/40 bg-background">
          <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
            {trustItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[26px] border border-border/40 bg-background/80 p-6 shadow-sm shadow-black/[0.03]">
                  <Icon className="h-5 w-5 text-primary" />
                  <h2 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">Featured chefs</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Meet chefs who bring the evening to life.</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Explore cuisine, hosting style, menus, and guest feedback before you start shaping the occasion.
              </p>
            </div>
            <Button asChild variant="outline" className="border-border/70 bg-background/80">
              <Link href="/browse-chefs">Explore all chefs</Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {featuredCards.length > 0 ? (
              featuredCards.map((chef) => <HomepageFeaturedChefCard key={chef.id} chef={chef} />)
            ) : (
              <Card className="rounded-[28px] border-border/50 lg:col-span-3">
                <CardContent className="p-8 text-sm text-muted-foreground">
                  Featured chefs will appear here as public dining pages become available.
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <section className="border-y border-border/40 bg-muted/20">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">Cuisine discovery</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Choose the flavor of the evening.</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Begin with a culinary mood, then discover chefs who can turn it into a generous, beautifully hosted meal.
              </p>
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              {homepageCuisineHighlights.map((item) => (
                <Link key={item.title} href={item.href} className="group relative overflow-hidden rounded-[30px] border border-border/40 bg-background shadow-sm shadow-black/5 transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/10">
                  <div className="relative h-80">
                    <Image src={item.image} alt={`${item.title} cuisine inspiration`} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                      <h3 className="text-2xl font-semibold">{item.title}</h3>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-white/80">{item.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">A graceful path from idea to hosted evening.</h2>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {howItWorks.map((item, index) => (
              <div key={item.title} className="rounded-[26px] border border-border/40 bg-background/80 p-6 shadow-sm shadow-black/[0.03]">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {testimonials.length > 0 ? (
          <section className="border-y border-border/40 bg-muted/20">
            <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">Reviews</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">The proof is in the evening guests remember.</h2>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  Real guest feedback from private dining experiences, shared after completed evenings.
                </p>
              </div>
              <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {testimonials.map((review) => (
                  <Card key={review.id} className="rounded-[26px] border-border/40 bg-background/90 shadow-sm shadow-black/[0.03]">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-1 text-amber-600">
                        {Array.from({ length: review.rating }).map((_, index) => (
                          <Star key={`${review.id}-${index}`} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                      <p className="mt-4 text-sm leading-6 text-muted-foreground">
                        {review.comment || "A guest shared a rating after a completed private dining experience."}
                      </p>
                      <div className="mt-6 text-sm">
                        <p className="font-semibold text-foreground">{review.client.name}</p>
                        <p className="text-muted-foreground">Hosted by {review.chefName}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="rounded-[30px] border border-border/40 bg-[linear-gradient(135deg,hsl(var(--brand-primary)/0.08),hsl(var(--brand-highlight)/0.05))] p-8 shadow-sm shadow-black/[0.03] sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">Start planning</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Bring a remarkable chef-led evening to your table.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Begin with location, cuisine, and the kind of gathering you want to host. Then discover chefs who can shape the meal around the occasion.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="brand-gradient-button border-0 shadow-lg shadow-primary/20">
                <Link href="/find-local-chef">Find Your Chef</Link>
              </Button>
              <Button asChild variant="outline" className="border-border/70 bg-background/80">
                <Link href="/browse-chefs">Browse Chefs</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-[30px] border border-border/40 bg-background/90 p-8 shadow-sm shadow-black/[0.03]">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">For culinary professionals</p>
            <div className="mt-4 grid gap-4">
              <Link href="/become-a-chef" className="rounded-[24px] border border-border/40 bg-muted/25 p-5 transition-colors hover:bg-muted/40">
                <p className="font-semibold text-foreground">Become a chef</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Share your cuisine with guests planning private dinners, celebrations, and chef-led experiences.</p>
              </Link>
              <Link href="/register?role=CHEF" className="rounded-[24px] border border-border/40 bg-muted/25 p-5 transition-colors hover:bg-muted/40">
                <p className="font-semibold text-foreground">Create your chef page</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Present your menus, hosting style, and culinary point of view to clients who value refined private dining.</p>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
