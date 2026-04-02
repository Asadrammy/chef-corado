'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface SearchFiltersProps {
  onFiltersChange: (filters: SearchFilters) => void;
  initialFilters?: Partial<SearchFilters>;
}

export interface SearchFilters {
  query: string;
  location: string;
  minPrice: number;
  maxPrice: number;
  minRating: number;
  maxRating: number;
}

export function SearchFilters({ onFiltersChange, initialFilters = {} }: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    location: '',
    minPrice: 0,
    maxPrice: 1000,
    minRating: 1,
    maxRating: 5,
    ...initialFilters,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  useEffect(() => {
    onFiltersChange(filters);
    
    // Count active filters
    const count = [
      filters.query,
      filters.location,
      filters.minPrice > 0,
      filters.maxPrice < 1000,
      filters.minRating > 1,
      filters.maxRating < 5,
    ].filter(Boolean).length;
    
    setActiveFiltersCount(count);
  }, [filters, onFiltersChange]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      query: '',
      location: '',
      minPrice: 0,
      maxPrice: 1000,
      minRating: 1,
      maxRating: 5,
    });
  };

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Chefs
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Badge variant="secondary">
                {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main search */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Search by name, bio, or location..."
              value={filters.query}
              onChange={(e) => updateFilter('query', e.target.value)}
            />
          </div>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="space-y-4 border-t pt-4">
            {/* Location */}
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="City or region..."
                value={filters.location}
                onChange={(e) => updateFilter('location', e.target.value)}
              />
            </div>

            {/* Price range */}
            <div>
              <Label>Price Range: ${filters.minPrice} - ${filters.maxPrice}</Label>
              <div className="px-2">
                <Slider
                  value={[filters.minPrice, filters.maxPrice]}
                  onValueChange={([min, max]) => {
                    updateFilter('minPrice', min);
                    updateFilter('maxPrice', max);
                  }}
                  min={0}
                  max={1000}
                  step={10}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Rating range */}
            <div>
              <Label>Rating Range: {filters.minRating} - {filters.maxRating} stars</Label>
              <div className="px-2">
                <Slider
                  value={[filters.minRating, filters.maxRating]}
                  onValueChange={([min, max]) => {
                    updateFilter('minRating', min);
                    updateFilter('maxRating', max);
                  }}
                  min={1}
                  max={5}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Sort by */}
            <div>
              <Label htmlFor="sort">Sort By</Label>
              <Select defaultValue="rating">
                <SelectTrigger>
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="reviews">Most Reviews</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="name">Name: A to Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
