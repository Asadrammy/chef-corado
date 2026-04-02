"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ExperienceCard } from "@/components/experiences/experience-card";
import { Search, Filter, X, ChevronDown, Star, MapPin } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

interface Experience {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: number;
  includedServices: string;
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
    location: string;
  };
  _count: {
    bookings: number;
  };
}

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

  const handleBookNow = (experienceId: string) => {
    // The booking is now handled by the InstantBookingDialog in the ExperienceCard
    // This function is no longer needed but kept for compatibility
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
    setPagination({ ...pagination, page: 1 });
  };

  const activeFiltersCount = Object.values(filters).filter(
    (value, index) => {
      if (index < 4) return value !== "" && value !== false;
      if (index === 4) return (value as [number, number])[0] > 0;
      if (index === 5) return value !== "";
      if (index === 6) return value !== "";
      if (index === 7) return value !== "createdAt";
      if (index === 8) return value !== "desc";
      return false;
    }
  ).length;

  if (loading && pagination.page === 1) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Discover Culinary Experiences</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Book unique culinary experiences from talented chefs in your area
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search experiences, chefs, or cuisines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-3 text-lg"
          />
        </div>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount}</Badge>
            )}
          </Button>
          
          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => setFilters({ ...filters, sortBy: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Newest</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
                <SelectItem value="bookings">Popular</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.sortOrder}
              onValueChange={(value) => setFilters({ ...filters, sortOrder: value })}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {activeFiltersCount > 0 && (
            <Button variant="ghost" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Filter Experiences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Cuisine Type</label>
                  <Select
                    value={filters.cuisineType}
                    onValueChange={(value) => setFilters({ ...filters, cuisineType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All cuisines" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All cuisines</SelectItem>
                      <SelectItem value="ITALIAN">Italian</SelectItem>
                      <SelectItem value="MEXICAN">Mexican</SelectItem>
                      <SelectItem value="ASIAN">Asian</SelectItem>
                      <SelectItem value="FRENCH">French</SelectItem>
                      <SelectItem value="MEDITERRANEAN">Mediterranean</SelectItem>
                      <SelectItem value="INDIAN">Indian</SelectItem>
                      <SelectItem value="AMERICAN">American</SelectItem>
                      <SelectItem value="FUSION">Fusion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Event Type</label>
                  <Select
                    value={filters.eventType}
                    onValueChange={(value) => setFilters({ ...filters, eventType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All events" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All events</SelectItem>
                      <SelectItem value="WEDDING">Wedding</SelectItem>
                      <SelectItem value="CORPORATE">Corporate</SelectItem>
                      <SelectItem value="BIRTHDAY">Birthday</SelectItem>
                      <SelectItem value="ANNIVERSARY">Anniversary</SelectItem>
                      <SelectItem value="DINNER_PARTY">Dinner Party</SelectItem>
                      <SelectItem value="COOKING_CLASS">Cooking Class</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty</label>
                  <Select
                    value={filters.difficulty}
                    onValueChange={(value) => setFilters({ ...filters, difficulty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All levels</SelectItem>
                      <SelectItem value="EASY">Easy</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HARD">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <Input
                    placeholder="City or area"
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Guest Count</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Min"
                      value={filters.minGuests}
                      onChange={(e) => setFilters({ ...filters, minGuests: e.target.value })}
                      className="w-20"
                    />
                    <Input
                      placeholder="Max"
                      value={filters.maxGuests}
                      onChange={(e) => setFilters({ ...filters, maxGuests: e.target.value })}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">
                    Price Range: ${filters.priceRange[0]} - ${filters.priceRange[1]}
                  </label>
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(value) => setFilters({ ...filters, priceRange: value as [number, number] })}
                    max={500}
                    min={0}
                    step={10}
                    className="w-full"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="verified"
                    checked={filters.verifiedOnly}
                    onCheckedChange={(checked) => setFilters({ ...filters, verifiedOnly: checked as boolean })}
                  />
                  <label
                    htmlFor="verified"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                  >
                    <Star className="h-4 w-4" />
                    Verified chefs only
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        {experiences.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold mb-2">No experiences found</h3>
              <p className="text-gray-600 text-center mb-4">
                Try adjusting your search terms or filters to find more experiences
              </p>
              <Button onClick={clearFilters}>
                Clear all filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="text-center text-gray-600">
              Showing {experiences.length} of {pagination.total} experiences
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {experiences.map((experience) => (
                <ExperienceCard
                  key={experience.id}
                  experience={experience}
                  onBookNow={handleBookNow}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={pagination.page === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPagination({ ...pagination, page })}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
