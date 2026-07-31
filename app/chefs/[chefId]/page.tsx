import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { CheckCircle2, MapPin, MessageCircle, ShieldCheck, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PublicJsonLd } from "@/components/public/structured-data"
import { formatCurrency } from "@/lib/currency"
import { buildPublicMetadata } from "@/lib/public-site"
import { COMMUNICATION_POLICY_EXTENDED } from "@/lib/request-options"

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

export async function generateMetadata({ params }: ChefPublicProfilePageProps) {
  const { chefId } = await params

  try {
    const chef = await getChefProfile(chefId)
    return buildPublicMetadata({
      title: `${chef.user.name} | Private Chef Profile`,
      description: chef.bio || `Explore ${chef.user.name}'s private chef profile, menus, reviews, and service area.`,
      path: `/chefs/${chefId}`,
    })
  } catch {
    return buildPublicMetadata({
      title: "Private Chef Profile | Chef Marketplace",
      description: "Explore a private chef profile, menus, reviews, and service area.",
      path: `/chefs/${chefId}`,
    })
  }
}

export default async function ChefPublicProfilePage({ params, searchParams }: ChefPublicProfilePageProps) {
  const { chefId } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const isPreviewMode = resolvedSearchParams?.preview === "1"
  const cookieHeader = (await cookies()).toString()
  const chef = await getChefProfile(chefId, resolvedSearchParams?.preview, cookieHeader)

  if (!chef) {
    notFound()
  }

  const cookingClassExperience = chef.experiences.find((experience: any) => experience.serviceType === "COOKING_CLASS")

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <PublicJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: chef.user.name,
          image: chef.profileImage,
          description: chef.bio,
          address: chef.location,
          jobTitle: "Private Chef",
          aggregateRating: chef.reviewCount > 0 ? {
            "@type": "AggregateRating",
            ratingValue: chef.averageRating,
            reviewCount: chef.reviewCount,
          } : undefined,
        }}
      />
      {isPreviewMode ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground shadow-sm">
          <p className="font-medium">You are viewing your public profile in preview mode.</p>
          <p className="mt-1 text-muted-foreground">Reviews shown here are public. Legal compliance confirmations and private certificate documents are never shown on your public profile.</p>
        </div>
      ) : null}
      <section className="brand-surface relative overflow-hidden rounded-[36px] p-8 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_40%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="rounded-[28px] border border-white/60 bg-white/80 p-2 shadow-lg shadow-black/5 dark:border-white/10 dark:bg-white/5">
                {chef.profileImage ? (
                  <img src={chef.profileImage} alt={`${chef.user.name} public profile image`} className="h-28 w-28 rounded-[22px] object-cover" />
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
            </div>
            {chef.certifications.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Additional professional certifications</p>
                <div className="flex flex-wrap gap-2">
                  {chef.certifications.map((certification: string) => (
                    <Badge key={certification} variant="outline">{certification}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <Card className="brand-card-surface rounded-[28px] shadow-lg shadow-black/5">
              <CardHeader>
                <CardTitle>Trust highlights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground">
                  <ShieldCheck className="size-4" />
                  <span className="font-medium">Profile, reviews, menus, and event details</span>
                </div>
                <div className="grid gap-3">
                  <div>
                    <p className="font-medium text-foreground">Verified signal</p>
                    <p>{chef.user.verified ? "Verification is visible on this chef profile." : "This chef is available for discovery but does not currently show a verification badge."}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Private dining details</p>
                    <p>Clients can review menus, experiences, service area, and guest feedback before enquiring.</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Experience</p>
                    <p>{chef.experience ?? 0} years · {chef.eventsPerMonth ?? "Flexible"} events / month</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Service area</p>
                    <p>{chef.location} · {chef.radius} km travel radius</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <a
                    href="/register?role=CLIENT"
                    className="brand-gradient-button flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    Request Proposal
                  </a>
                  {cookingClassExperience ? (
                    <div className="brand-soft-panel rounded-[24px] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Cooking class available</p>
                      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">{cookingClassExperience.title}</p>
                        <div className="flex flex-wrap gap-2">
                          {cookingClassExperience.classType ? <Badge variant="outline">{cookingClassExperience.classType}</Badge> : null}
                          {cookingClassExperience.minGuests ? <Badge variant="outline">Min {cookingClassExperience.minGuests} students</Badge> : null}
                          {cookingClassExperience.maxGuests ? <Badge variant="outline">Max {cookingClassExperience.maxGuests} students</Badge> : null}
                        </div>
                        <p>Price per student: <span className="font-semibold text-foreground">{formatCurrency(cookingClassExperience.pricePerStudent ?? cookingClassExperience.price, cookingClassExperience.currency)}</span></p>
                      </div>
                      <div className="mt-4 flex flex-col gap-3">
                        <a
                          href={`/experiences/${cookingClassExperience.id}`}
                          className="brand-gradient-button inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20"
                        >
                          Plan Your Class
                        </a>
                        <a
                          href="/register?role=CLIENT"
                          className="flex w-full items-center justify-center rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5"
                        >
                          Enquire Availability
                        </a>
                      </div>
                    </div>
                  ) : null}
                  <a
                    href="/login?role=CLIENT"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <MessageCircle className="size-4" />
                    Plan Your Event
                  </a>
                  <p className="text-xs leading-5 text-muted-foreground">{COMMUNICATION_POLICY_EXTENDED}</p>
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
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card className="brand-card-surface rounded-[28px] shadow-sm">
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
                          {typeof menu.price === "number" && menu.price > 0 ? (
                            <Badge className="rounded-full px-2.5 py-1">{formatCurrency(menu.price, menu.currency)}</Badge>
                          ) : (
                            <Badge variant="secondary" className="rounded-full px-2.5 py-1">Pricing discussed with your request</Badge>
                          )}
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

          <Card className="brand-card-surface rounded-[28px] shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle>Classes & bookable experiences</CardTitle>
              <p className="text-sm text-muted-foreground">Cooking classes and private experiences available from this chef.</p>
            </CardHeader>
            <CardContent>
              {chef.experiences.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookable experiences published yet.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {chef.experiences.map((experience: any) => (
                    <div key={experience.id} className="rounded-[22px] border border-border/60 bg-background/80 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{experience.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{experience.description}</p>
                        </div>
                        <Badge variant={experience.serviceType === "COOKING_CLASS" ? "default" : "secondary"}>
                          {experience.serviceType === "COOKING_CLASS" ? "Cooking Class" : "Dining"}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {experience.classType ? <Badge variant="outline">{experience.classType}</Badge> : null}
                        {experience.cuisineType ? <Badge variant="outline">{experience.cuisineType}</Badge> : null}
                        {experience.minGuests ? <Badge variant="outline">Min {experience.minGuests} {experience.serviceType === "COOKING_CLASS" ? "students" : "guests"}</Badge> : null}
                        {experience.maxGuests ? <Badge variant="outline">Up to {experience.maxGuests} {experience.serviceType === "COOKING_CLASS" ? "students" : "guests"}</Badge> : null}
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {experience.serviceType === "COOKING_CLASS" ? "Price per student" : "Starting price"}
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(experience.serviceType === "COOKING_CLASS" ? (experience.pricePerStudent ?? experience.price) : experience.price, experience.currency)}
                        </span>
                      </div>
                      {experience.serviceType === "COOKING_CLASS" ? (
                        <div className="mt-4">
                          <a
                            href={`/experiences/${experience.id}`}
                            className="brand-gradient-button inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-md shadow-primary/20"
                          >
                            Plan This Class
                          </a>
                        </div>
                      ) : null}
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
                <p className="text-foreground font-medium">Live availability is confirmed during booking</p>
                <p className="mt-1">Open dates and remaining capacity are confirmed when you enquire about your event.</p>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="size-4" />
                <span className="text-sm">Travel radius: {chef.radius} km</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
