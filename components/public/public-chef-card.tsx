import Link from "next/link";
import { CheckCircle2, MapPin, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateAvatarFallback } from "@/lib/utils";

export type PublicChefCardData = {
  id: string;
  bio?: string | null;
  location?: string | null;
  radius?: number | null;
  profileImage?: string | null;
  chefType?: string | null;
  cuisineType?: string | null;
  experience?: number | null;
  averageRating?: number;
  reviewCount?: number;
  isApproved?: boolean;
  user: {
    id: string;
    name: string;
    verified?: boolean;
    experienceLevel?: string | null;
  };
};

export function PublicChefCard({ chef }: { chef: PublicChefCardData }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-[28px] border-border/60 bg-background/90 shadow-sm shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10">
      <CardHeader className="space-y-5 pb-0">
        <div className="flex items-start gap-4 sm:gap-5">
          <Avatar className="h-16 w-16 rounded-2xl border border-border/60">
            <AvatarImage src={chef.profileImage ?? undefined} alt={`${chef.user.name} profile image`} className="object-cover" />
            <AvatarFallback className="rounded-2xl bg-muted text-base font-semibold text-foreground">
              {generateAvatarFallback(chef.user.name || "Chef")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold tracking-tight text-foreground">{chef.user.name}</h3>
              {chef.user.verified ? (
                <Badge className="rounded-full px-2.5 py-1 text-xs">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Verified
                </Badge>
              ) : null}
            </div>
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
          {chef.user.experienceLevel ? <Badge variant="outline">{chef.user.experienceLevel}</Badge> : null}
          {typeof chef.experience === "number" ? <Badge variant="outline">{chef.experience}+ years</Badge> : null}
          {chef.isApproved ? <Badge variant="outline">Approved profile</Badge> : null}
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
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
          {chef.bio || "This chef is preparing a public profile with menus, specialties, and event details."}
        </p>
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
