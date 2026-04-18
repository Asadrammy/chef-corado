import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { CheckCircle2, Crown, MapPin, MessageCircle, ShieldCheck, Sparkles, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ChefPublicProfilePageProps {
  params: Promise<{ chefId: string }>
  searchParams?: Promise<{ preview?: string }>
}

async function getChefProfile(chefId: string, preview?: string, cookieHeader?: string) {
  const query = preview === "1" ? "?preview=1" : ""
  const response = await fetch(`${process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/chefs/${chefId}${query}`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error("Failed to fetch chef profile")
  }

  return response.json()
}

export default async function ChefPublicProfilePage({ params, searchParams }: ChefPublicProfilePageProps) {
  const { chefId } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const cookieHeader = (await cookies()).toString()
  const chef = await getChefProfile(chefId, resolvedSearchParams?.preview, cookieHeader)

  if (!chef) {
    notFound()
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[36px] border border-white/50 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),rgba(248,250,255,0.92))] p-8 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,rgba(30,41,59,0.7),rgba(15,23,42,0.92))]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_40%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="rounded-[28px] border border-white/60 bg-white/80 p-2 shadow-lg shadow-black/5 dark:border-white/10 dark:bg-white/5">
                {chef.profileImage ? (
                  <img src={chef.profileImage} alt={chef.user.name} className="h-28 w-28 rounded-[22px] object-cover" />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-[22px] bg-muted text-2xl font-semibold">
                    {chef.user.name?.charAt(0) ?? "C"}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-semibold tracking-tight text-foreground">{chef.user.name}</h1>
                  {chef.user.verified ? (
                    <Badge className="rounded-full px-3 py-1">
                      <CheckCircle2 className="mr-1 size-3.5" />
                      Verified
                    </Badge>
                  ) : null}
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    <Crown className="mr-1 size-3.5" />
                    Top Chef
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    <Sparkles className="mr-1 size-3.5" />
                    Fast Responder
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="size-4 fill-current text-amber-500" />
                    {chef.averageRating.toFixed(1)} ({chef.reviewCount} reviews)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4" />
                    {chef.location} · {chef.radius} km radius
                  </span>
                </div>
              </div>
            </div>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">
              {chef.bio || "This chef has not added a bio yet."}
            </p>
            <div className="flex flex-wrap gap-2">
              {chef.chefType ? <Badge variant="secondary">{chef.chefType}</Badge> : null}
              {chef.eventsPerMonth ? <Badge variant="outline">{chef.eventsPerMonth}+ events / month</Badge> : null}
              {chef.user.experienceLevel ? <Badge variant="outline">{chef.user.experienceLevel}</Badge> : null}
              <Badge variant="outline">Avg response: 2 hrs</Badge>
            </div>
            {chef.certifications.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Certifications</p>
                <div className="flex flex-wrap gap-2">
                  {chef.certifications.map((certification: string) => (
                    <Badge key={certification} variant="outline">{certification}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <Card className="rounded-[28px] border-border/60 bg-background/80 shadow-lg shadow-black/5">
              <CardHeader>
                <CardTitle>Book with confidence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground">
                  <ShieldCheck className="size-4" />
                  <span className="font-medium">Verified profile & reviews</span>
                </div>
                <div className="grid gap-3">
                  <div>
                    <p className="font-medium text-foreground">Experience</p>
                    <p>{chef.experience ?? 0} years · {chef.eventsPerMonth ?? "Flexible"} events / month</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Availability</p>
                    <p>Accepting new bookings · {chef.radius} km travel radius</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <a
                    href="/dashboard/client/create-request"
                    className="flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(249_90%_68%))] px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    Request a Booking
                  </a>
                  <a
                    href="/dashboard/chat"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <MessageCircle className="size-4" />
                    Message Chef
                  </a>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-[28px] border-border/60 bg-muted/20 shadow-none">
              <CardHeader>
                <CardTitle>Chef snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">Service area</p>
                  <p>{chef.location}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Travel radius</p>
                  <p>{chef.radius} km</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Response time</p>
                  <p>~2 hours</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card className="rounded-[28px] border-border/60 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle>Signature menus</CardTitle>
              <p className="text-sm text-muted-foreground">Explore curated experiences and event-ready menus.</p>
            </CardHeader>
            <CardContent>
              {chef.menus.length === 0 ? (
                <p className="text-sm text-muted-foreground">No menus published yet.</p>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {chef.menus.map((menu: any) => (
                    <div key={menu.id} className="rounded-[22px] border border-border/60 bg-background/80 p-4 shadow-sm">
                      {menu.menuImage ? (
                        <img src={menu.menuImage} alt={menu.title} className="mb-3 h-40 w-full rounded-[18px] object-cover" />
                      ) : null}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-base font-semibold text-foreground">{menu.title}</h3>
                          <Badge className="rounded-full px-2.5 py-1">${menu.price.toFixed(2)}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{menu.description || "No description provided."}</p>
                        <div className="flex flex-wrap gap-2">
                          {menu.cuisineType ? <Badge variant="outline">{menu.cuisineType}</Badge> : null}
                          {menu.eventType ? <Badge variant="outline">{menu.eventType}</Badge> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>About the chef</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>{chef.bio || "This chef has not added a bio yet."}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[20px] border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Experience</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{chef.experience ?? 0}+ years</p>
                </div>
                <div className="rounded-[20px] border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Events hosted</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{chef.eventsPerMonth ?? 0}+ / month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[28px] border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Recent reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {chef.reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                chef.reviews.map((review: any) => (
                  <div key={review.id} className="rounded-[22px] border border-border/60 bg-background/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">{review.client.name}</p>
                      <span className="inline-flex items-center gap-1 text-sm text-amber-600">
                        <Star className="size-4 fill-current" />
                        {review.rating}
                      </span>
                    </div>
                    {review.comment ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.comment}</p> : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-border/60 bg-background/80 shadow-sm">
            <CardHeader>
              <CardTitle>Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-[20px] border border-border/60 bg-muted/20 p-4">
                <p className="text-foreground font-medium">Currently accepting bookings</p>
                <p className="mt-1">Book now for upcoming dates in the next 30 days.</p>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="size-4" />
                <span className="text-sm">Fast confirmations & flexible scheduling</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
