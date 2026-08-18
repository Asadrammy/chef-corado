"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Clock, MapPin, Star, Users } from "lucide-react";

import { InstantBookingDialog } from "@/components/booking/instant-booking-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";

interface Experience {
  id: string;
  title: string;
  description: string;
  price: number;
  currency?: string;
  duration: number;
  includedServices?: string;
  eventType?: string;
  cuisineType?: string;
  maxGuests?: number;
  minGuests?: number;
  difficulty: string;
  tags?: string;
  experienceImage?: string;
  chef: {
    id: string;
    user: {
      name: string;
    };
    location?: string;
  };
  _count: {
    bookings: number;
  };
}

interface ExperienceCardProps {
  experience: Experience;
  onBookNow?: (experienceId: string) => void;
  showBookButton?: boolean;
}

export function ExperienceCard({ experience, onBookNow, showBookButton = true }: ExperienceCardProps) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);

  const includedServices = safeParseList(experience.includedServices);
  const tags = safeParseList(experience.tags);
  const isCookingClass = experience.eventType === "Cooking Class" || experience.eventType === "COOKING_CLASS";
  const displayCurrency = experience.currency || "GBP";

  const handleBookNow = () => {
    if (onBookNow) {
      onBookNow(experience.id);
      return;
    }
    setIsBookingDialogOpen(true);
  };

  const handleBookingComplete = () => {
    router.push("/dashboard/client/bookings");
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-[28px] border-border/60 bg-background/95 shadow-sm shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10">
      <div className="relative h-52 bg-muted">
        {experience.experienceImage && !imageError ? (
          <img
            src={experience.experienceImage}
            alt={experience.title}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,hsl(var(--brand-primary)/0.12),hsl(var(--brand-highlight)/0.08))]">
            <div className="px-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">Chef experience</p>
              <p className="mt-2 text-sm text-muted-foreground">Image coming soon</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge className={getDifficultyColor(experience.difficulty)}>{experience.difficulty}</Badge>
          {experience.eventType ? <Badge variant="secondary">{formatLabel(experience.eventType)}</Badge> : null}
        </div>
      </div>

      <CardHeader className="pb-3">
        <div className="space-y-2">
          <CardTitle className="line-clamp-2 text-xl tracking-tight">{experience.title}</CardTitle>
          <CardDescription className="line-clamp-3">{experience.description}</CardDescription>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="h-9 w-9 rounded-xl">
              <AvatarImage src="" alt={experience.chef.user.name} />
              <AvatarFallback className="rounded-xl">{experience.chef.user.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{experience.chef.user.name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{experience.chef.location || "Location confirmed during enquiry"}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 rounded-[22px] border border-border/60 bg-muted/20 p-3 text-center">
          <Detail label={isCookingClass ? "Per student" : "Per guest"} value={formatCurrency(experience.price, displayCurrency)} />
          <Detail label="Duration" value={formatDuration(experience.duration)} icon={<Clock className="h-4 w-4" />} />
          <Detail label={isCookingClass ? "Students" : "Guests"} value={`${experience.minGuests || 1}-${experience.maxGuests || "Flexible"}`} icon={<Users className="h-4 w-4" />} />
        </div>

        {includedServices.length > 0 ? (
          <div>
            <h4 className="mb-2 text-sm font-medium">Included</h4>
            <div className="flex flex-wrap gap-1.5">
              {includedServices.slice(0, 3).map((service: any, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {service.name || String(service)}
                </Badge>
              ))}
              {includedServices.length > 3 ? <Badge variant="outline" className="text-xs">+{includedServices.length - 3} more</Badge> : null}
            </div>
          </div>
        ) : null}

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((tag: any, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {String(tag)}
              </Badge>
            ))}
            {tags.length > 4 ? <Badge variant="secondary" className="text-xs">+{tags.length - 4}</Badge> : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{experience._count.bookings} bookings</span>
          </div>
          {experience.cuisineType ? <Badge variant="outline" className="text-xs">{formatLabel(experience.cuisineType)}</Badge> : null}
        </div>
      </CardContent>

      {showBookButton ? (
        <CardFooter className="mt-auto pt-3">
          <div className="w-full space-y-2">
            <Link href={`/experiences/${experience.id}`} className="block">
              <Button variant="outline" className="w-full rounded-2xl border-border/70 bg-background/80">
                View Details
              </Button>
            </Link>
            <Button className="brand-gradient-button w-full rounded-2xl border-0" onClick={handleBookNow}>
              Plan This Experience
            </Button>
          </div>
        </CardFooter>
      ) : null}

      <InstantBookingDialog
        experience={experience as any}
        open={isBookingDialogOpen}
        onOpenChange={setIsBookingDialogOpen}
        onBookingComplete={handleBookingComplete}
      />
    </Card>
  );
}

function Detail({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
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

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case "EASY":
      return "bg-emerald-100 text-emerald-700";
    case "MEDIUM":
      return "bg-amber-100 text-amber-700";
    case "HARD":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function safeParseList(value?: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
