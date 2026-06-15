"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Filter, Search, Star, X } from "lucide-react";
import { toast } from "sonner";

import { ExperienceCard } from "@/components/experiences/experience-card";
import { PublicPageHero } from "@/components/public/public-page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

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
      verified: boolean;
      experienceLevel: string;
    };
    location?: string;
  };
  _count: {
    bookings: number;
  };
}

const cuisineOptions = ["ITALIAN", "MEXICAN", "ASIAN", "FRENCH", "MEDITERRANEAN", "INDIAN", "AMERICAN", "FUSION"];
const eventOptions = ["WEDDING", "CORPORATE", "BIRTHDAY", "ANNIVERSARY", "DINNER_PARTY", "COOKING_CLASS", "OTHER"];
const difficultyOptions = ["EASY", "MEDIUM", "HARD"];

export default function ExperiencesPage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    cuisineType: "",
    eventType: "",
    difficulty: "",
    location: "",
    verifiedOnly: false,
    priceRange: [0, 500] as [number, number],
    minGuests: "",
    maxGuests: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    fetchExperiences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filters, pagination.page]);

  const fetchExperiences = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(filters.cuisineType && { cuisineType: filters.cuisineType }),
        ...(filters.eventType && { eventType: filters.eventType }),
        ...(filters.difficulty && { difficulty: filters.difficulty }),
        ...(filters.location && { location: filters.location }),
        ...(filters.verifiedOnly && { verifiedOnly: "true" }),
        ...(filters.priceRange[0] > 0 && { minPrice: filters.priceRange[0].toString() }),
        ...(filters.priceRange[1] < 500 && { maxPrice: filters.priceRange[1].toString() }),
        ...(filters.minGuests && { minGuests: filters.minGuests }),
        ...(filters.maxGuests && { maxGuests: filters.maxGuests }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortOrder && { sortOrder: filters.sortOrder }),
      });

      const response = await axios.get(`/api/experiences?${params}`);
      setExperiences(response.data.experiences || []);
      setPagination(response.data.pagination || pagination);
    } catch (error) {
      console.error("Error fetching experiences:", error);
      toast.error("Failed to load experiences");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      cuisineType: "",
      eventType: "",
      difficulty: "",
      location: "",
      verifiedOnly: false,
      priceRange: [0, 500],
      minGuests: "",
      maxGuests: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const activeFiltersCount = [
    filters.cuisineType,
    filters.eventType,
    filters.difficulty,
    filters.location,
    filters.verifiedOnly ? "verified" : "",
    filters.priceRange[0] > 0 || filters.priceRange[1] < 500 ? "price" : "",
    filters.minGuests,
    filters.maxGuests,
  ].filter(Boolean).length;

  return (
    <div className="bg-background">
      <PublicPageHero
        eyebrow="Culinary experiences"
        title="Bookable chef-led moments for the table, kitchen, and celebration."
        description="Explore tasting menus, cooking classes, intimate dinners, and private dining formats created by vetted chefs."
        centered
      />

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-border/60 bg-background/90 p-5 shadow-sm shadow-black/5 sm:p-6">
          <div className="relative mx-auto max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search experiences, chefs, or cuisines"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPagination((current) => ({ ...current, page: 1 }));
              }}
              className="h-12 rounded-2xl border-border/70 bg-background pl-11 pr-4 text-base"
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="h-11 rounded-2xl border-border/70 bg-background/80">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeFiltersCount > 0 ? <Badge variant="secondary" className="ml-2">{activeFiltersCount}</Badge> : null}
            </Button>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Sort
              <select
                value={filters.sortBy}
                onChange={(event) => setFilters({ ...filters, sortBy: event.target.value })}
                className="h-11 rounded-2xl border border-border/70 bg-background px-3 text-sm text-foreground"
              >
                <option value="createdAt">Newest</option>
                <option value="price">Price</option>
                <option value="duration">Duration</option>
                <option value="bookings">Popular</option>
              </select>
            </label>

            <select
              value={filters.sortOrder}
              onChange={(event) => setFilters({ ...filters, sortOrder: event.target.value })}
              className="h-11 rounded-2xl border border-border/70 bg-background px-3 text-sm text-foreground"
              aria-label="Sort order"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>

            {activeFiltersCount > 0 ? (
              <Button variant="ghost" onClick={clearFilters} className="rounded-2xl">
                <X className="mr-2 h-4 w-4" />
                Clear filters
              </Button>
            ) : null}
          </div>

          {showFilters ? (
            <div className="mt-6 rounded-[28px] border border-border/60 bg-muted/20 p-5">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <FilterSelect label="Cuisine" value={filters.cuisineType} options={cuisineOptions} onChange={(value) => setFilters({ ...filters, cuisineType: value })} />
                <FilterSelect label="Occasion" value={filters.eventType} options={eventOptions} onChange={(value) => setFilters({ ...filters, eventType: value })} />
                <FilterSelect label="Format" value={filters.difficulty} options={difficultyOptions} onChange={(value) => setFilters({ ...filters, difficulty: value })} />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="experience-location">Location</label>
                  <Input id="experience-location" placeholder="City or area" value={filters.location} onChange={(event) => setFilters({ ...filters, location: event.target.value })} className="h-11 rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Guests</label>
                  <div className="flex gap-2">
                    <Input placeholder="Min" value={filters.minGuests} onChange={(event) => setFilters({ ...filters, minGuests: event.target.value })} className="h-11 rounded-2xl" />
                    <Input placeholder="Max" value={filters.maxGuests} onChange={(event) => setFilters({ ...filters, maxGuests: event.target.value })} className="h-11 rounded-2xl" />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <label className="mb-3 block text-sm font-medium text-foreground">
                    Price range: ${filters.priceRange[0]} - ${filters.priceRange[1]}
                  </label>
                  <Slider value={filters.priceRange} onValueChange={(value) => setFilters({ ...filters, priceRange: value as [number, number] })} max={500} min={0} step={10} />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background px-4 py-3">
                  <Checkbox id="verified" checked={filters.verifiedOnly} onCheckedChange={(checked) => setFilters({ ...filters, verifiedOnly: checked as boolean })} />
                  <label htmlFor="verified" className="flex items-center gap-1 text-sm font-medium text-foreground">
                    <Star className="h-4 w-4" />
                    Verified chefs only
                  </label>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-10 space-y-5">
          {loading && pagination.page === 1 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="h-96 animate-pulse rounded-[28px] bg-muted" />
              ))}
            </div>
          ) : experiences.length === 0 ? (
            <Card className="rounded-[28px] border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="mb-4 h-10 w-10 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No experiences found</h3>
                <p className="mb-4 max-w-md text-center text-sm text-muted-foreground">
                  Try adjusting cuisine, location, guest count, or price to discover more chef-led experiences.
                </p>
                <Button onClick={clearFilters} className="brand-gradient-button rounded-2xl border-0">
                  Clear all filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="text-center text-sm text-muted-foreground">
                Showing {experiences.length} of {pagination.total} experiences
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {experiences.map((experience) => (
                  <ExperienceCard key={experience.id} experience={experience} />
                ))}
              </div>

              {pagination.pages > 1 ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button variant="outline" disabled={pagination.page === 1} onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}>
                    Previous
                  </Button>
                  {Array.from({ length: pagination.pages }, (_, index) => index + 1).map((page) => (
                    <Button key={page} variant={pagination.page === page ? "default" : "outline"} size="sm" onClick={() => setPagination({ ...pagination, page })}>
                      {page}
                    </Button>
                  ))}
                  <Button variant="outline" disabled={pagination.page === pagination.pages} onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}>
                    Next
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-2xl border border-border/70 bg-background px-3 text-sm text-foreground">
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}
          </option>
        ))}
      </select>
    </div>
  );
}
