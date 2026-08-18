import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { Calendar, ChefHat, Clock, MapPin, Star, Users, Wallet } from "lucide-react";

import { BookNowButton } from "@/components/book-now-button";
import { PublicJsonLd } from "@/components/public/structured-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { formatCurrency } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { buildPublicMetadata } from "@/lib/public-site";
import { publicChefEligibilityWhere } from "@/lib/public-chef-view";

interface ExperiencePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ExperiencePageProps) {
  const { id } = await params;
  const experience = await prisma.experience.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
    },
  });

  return buildPublicMetadata({
    title: `${experience?.title ?? "Private Chef Experience"} | ChefaChef`,
    description: experience?.description ?? "Explore a chef-led private dining experience.",
    path: `/experiences/${id}`,
  });
}

export default async function ExperiencePage({ params }: ExperiencePageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const experience = await prisma.experience.findFirst({
    where: {
      id,
      isActive: true,
      chef: publicChefEligibilityWhere,
    },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      currency: true,
      duration: true,
      includedServices: true,
      eventType: true,
      cuisineType: true,
      maxGuests: true,
      minGuests: true,
      difficulty: true,
      tags: true,
      experienceImage: true,
      chef: {
        select: {
          id: true,
          userId: true,
          bio: true,
          location: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  });

  if (!experience) {
    notFound();
  }

  const isOwner = session?.user?.id === experience.chef.userId;
  const currency = (experience as any).currency || "GBP";
  const safeExperience = {
    id: experience.id,
    title: experience.title,
    price: experience.price,
    duration: experience.duration,
    maxGuests: experience.maxGuests,
    chef: {
      user: {
        id: experience.chef.user.id,
        name: experience.chef.user.name,
      },
      location: experience.chef.location,
    },
  };

  return (
    <div className="bg-background pb-20">
      <PublicJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: experience.title,
          description: experience.description,
          image: experience.experienceImage || "/images/marketplace/seo-private-dining.png",
          brand: {
            "@type": "Brand",
            name: "ChefaChef",
          },
          offers: {
            "@type": "Offer",
            price: experience.price,
            priceCurrency: currency,
            availability: "https://schema.org/InStock",
          },
          provider: {
            "@type": "Person",
            name: experience.chef.user.name,
          },
        }}
      />
      <section className="relative overflow-hidden bg-[#07111f] text-white">
        <div className="absolute inset-0">
          <Image
            src={experience.experienceImage || "/images/marketplace/private-chef-hero.png"}
            alt={experience.title}
            fill
            priority
            className="object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,17,31,0.94),rgba(7,17,31,0.72),rgba(7,17,31,0.36))]" />
        </div>
        <div className="relative mx-auto grid min-h-[520px] max-w-7xl items-end gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
          <div className="max-w-3xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              {experience.cuisineType ? <Badge className="bg-white/15 text-white">{formatLabel(experience.cuisineType)}</Badge> : null}
              <span className="inline-flex items-center gap-1 text-sm text-white/80">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                Chef-led experience
              </span>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">{experience.title}</h1>
              <p className="max-w-2xl text-lg leading-8 text-white/78">{experience.description}</p>
            </div>
            <div className="flex flex-wrap gap-5 text-sm text-white/82">
              <span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4" /> {formatCurrency(experience.price, currency)} per guest</span>
              <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" /> {formatDuration(experience.duration)}</span>
              <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" /> Up to {experience.maxGuests || "flexible"} guests</span>
            </div>
          </div>

          <Card className="rounded-[28px] border-white/10 bg-white/12 text-white shadow-2xl shadow-black/20 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl">{formatCurrency(experience.price, currency)}</CardTitle>
              <p className="text-sm text-white/65">Starting price per guest</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 text-sm text-white/78">
                <div className="flex justify-between gap-4"><span>Duration</span><span>{formatDuration(experience.duration)}</span></div>
                <div className="flex justify-between gap-4"><span>Guests</span><span>Up to {experience.maxGuests || "flexible"}</span></div>
                <div className="flex justify-between gap-4"><span>Bookings</span><span>{experience._count.bookings}</span></div>
              </div>
              {session ? (
                isOwner ? (
                  <Button asChild className="w-full rounded-2xl">
                    <Link href="/dashboard/chef/experiences">Manage Experience</Link>
                  </Button>
                ) : (
                  <BookNowButton experience={safeExperience} />
                )
              ) : (
                <div className="space-y-2">
                  <Button asChild className="brand-gradient-button w-full rounded-2xl border-0" size="lg">
                    <Link href="/login">Sign in to plan</Link>
                  </Button>
                  <p className="text-center text-sm text-white/65">
                    New here? <Link href="/register" className="font-semibold text-white hover:underline">Create an account</Link>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="space-y-6">
          <Card className="rounded-[28px] border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" />
                About the chef
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <ChefHat className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-2">
                  <h2 className="text-xl font-semibold">{experience.chef.user.name}</h2>
                  <p className="text-sm leading-6 text-muted-foreground">{experience.chef.bio || "This chef is preparing more details about their private dining style."}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {experience.chef.location ? <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {experience.chef.location}</span> : null}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {experience.includedServices ? (
            <Card className="rounded-[28px] border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>What&apos;s included</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">{experience.includedServices}</p>
              </CardContent>
            </Card>
          ) : null}

          {experience.tags ? (
            <Card className="rounded-[28px] border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Experience notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {experience.tags.split(",").map((tag, index) => (
                    <Badge key={`${tag}-${index}`} variant="outline">{tag.trim()}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="rounded-[28px] border-border/60 bg-muted/20 shadow-sm">
            <CardHeader>
              <CardTitle>Planning details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Availability is confirmed when you enquire.</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {experience.chef.location || "Location details are confirmed with the chef."}</p>
              <p className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Best suited for up to {experience.maxGuests || "a flexible number of"} guests.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
