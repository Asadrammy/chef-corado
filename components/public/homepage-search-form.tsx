"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HomepageSearchForm() {
  const router = useRouter();
  const [cuisine, setCuisine] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    if (cuisine.trim()) {
      params.set("cuisine", cuisine.trim());
    }
    if (location.trim()) {
      params.set("location", location.trim());
    }

    router.push(`/find-local-chef${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Find a private chef by cuisine and location" className="grid gap-3 rounded-[26px] border border-white/20 bg-white/10 p-3 shadow-2xl shadow-black/15 backdrop-blur-xl md:grid-cols-[1.2fr_1fr_auto]">
      <label className="sr-only" htmlFor="homepage-cuisine">Cuisine or chef specialty</label>
      <Input
        id="homepage-cuisine"
        aria-label="Cuisine or chef specialty"
        placeholder="Cuisine or dining style"
        value={cuisine}
        onChange={(event) => setCuisine(event.target.value)}
        className="h-12 rounded-2xl border-white/15 bg-white/95 text-foreground shadow-sm placeholder:text-muted-foreground"
      />
      <label className="sr-only" htmlFor="homepage-location">City or location</label>
      <Input
        id="homepage-location"
        aria-label="City or location"
        placeholder="City, area, or venue"
        value={location}
        onChange={(event) => setLocation(event.target.value)}
        className="h-12 rounded-2xl border-white/15 bg-white/95 text-foreground shadow-sm placeholder:text-muted-foreground"
      />
      <Button type="submit" className="brand-gradient-button h-12 w-full rounded-2xl border-0 px-6 text-white shadow-lg shadow-primary/25 md:w-auto">
        <Search className="mr-2 h-4 w-4" />
        Find Your Chef
      </Button>
    </form>
  );
}
