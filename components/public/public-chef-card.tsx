import Link from "next/link";
import { BriefcaseBusiness, MapPin, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/currency";
import { pluralizeCompletedJobs } from "@/lib/public-chef-view";
import { generateAvatarFallback } from "@/lib/utils";

export type PublicChefCardData = {
  id: string;
  bio?: string | null;
  location?: string | null;
  radius?: number | null;
  profileImage?: string | null;
  chefType?: string | null;
  cuisineType?: string | null;
  displayName?: string;
  experience?: number | null;
  averageRating?: number;
  reviewCount?: number;
  completedJobs?: number;
  publicMinimumSpend?: number | null;
  publicMinimumSpendCurrency?: string | null;
  user: {
    id: string;
    name: string;
  };
  menus?: Array<{
    id?: string;
    title?: string | null;
    price?: number | null;
    currency?: string | null;
    cuisineType?: string | null;
    eventType?: string | null;
  }>;
};

export function PublicChefCard({ chef }: { chef: PublicChefCardData }) {
  const chefName = chef.displayName || chef.user.name;

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-[28px] border-border/60 bg-background/90 shadow-sm shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10">
      <CardHeader className="space-y-5 pb-0">
        <div className="flex items-start gap-4 sm:gap-5">
          <Avatar className="h-16 w-16 rounded-2xl border border-border/60">
            <AvatarImage src={chef.profileImage ?? undefined} alt={`${chefName} profile image`} className="object-cover" />
            <AvatarFallback className="rounded-2xl bg-muted text-base font-semibold text-foreground">
              {generateAvatarFallback(chefName || "Chef")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">{chefName}</h3>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {chef.location ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {chef.location}
                </span>
              ) : null}
              {typeof chef.radius === "number" ? <span>{chef.radius} km radius</span> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {chef.cuisineType ? <Badge variant="secondary">{chef.cuisineType}</Badge> : null}
          {chef.chefType ? <Badge variant="outline">{chef.chefType}</Badge> : null}
          {typeof chef.experience === "number" ? <Badge variant="outline">{chef.experience}+ years</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 pt-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1 text-amber-600">
            <Star className="h-4 w-4 fill-current" />
            {(chef.averageRating ?? 0).toFixed(1)}
          </span>
          <span>({chef.reviewCount ?? 0} reviews)</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <BriefcaseBusiness className="h-4 w-4" />
            {pluralizeCompletedJobs(chef.completedJobs ?? 0)}
          </span>
          {typeof chef.publicMinimumSpend === "number" ? (
            <span>Minimum spend from {formatCurrency(chef.publicMinimumSpend, chef.publicMinimumSpendCurrency ?? "GBP")}</span>
          ) : null}
        </div>
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
          {chef.bio || "This chef is preparing a public profile with menus, specialties, and event details."}
        </p>
        {chef.menus?.length ? (
          <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Menus</p>
            {chef.menus.slice(0, 2).map((menu, index) => (
              <div key={menu.id ?? `${menu.title}-${index}`} className="space-y-1 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium text-foreground">{menu.title}</span>
                  {typeof menu.price === "number" && menu.price > 0 ? (
                    <span className="shrink-0 text-xs font-semibold text-foreground">{formatCurrency(menu.price, menu.currency ?? "GBP")}</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {menu.cuisineType ? <Badge variant="outline" className="rounded-md px-2 py-0.5 text-xs">{menu.cuisineType}</Badge> : null}
                  {menu.eventType ? <Badge variant="outline" className="rounded-md px-2 py-0.5 text-xs">{menu.eventType}</Badge> : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="mt-auto flex flex-col gap-3 pt-0 sm:flex-row">
        <Button asChild className="brand-gradient-button flex-1 border-0 text-white shadow-lg shadow-primary/20">
          <Link href={`/chefs/${chef.id}`}>View Profile</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1 border-border/70 bg-background/80">
          <Link href={`/find-local-chef?location=${encodeURIComponent(chef.location ?? "")}`}>Find Nearby</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
