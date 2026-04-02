'use client';

import { useEffect, useState } from 'react';
import { Star, MapPin, DollarSign, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchFilters, type SearchFilters as SearchFiltersType } from './search-filters';

interface Chef {
  id: string;
  bio: string | null;
  experience: number | null;
  location: string;
  radius: number;
  isApproved: boolean;
  profileImage: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
  menus: {
    id: string;
    title: string;
    price: number;
    description: string | null;
  }[];
  averageRating: number;
  reviewCount: number;
}

interface ChefSearchResultsProps {
  onSelectChef?: (chefId: string) => void;
}

export function ChefSearchResults({ onSelectChef }: ChefSearchResultsProps) {
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFiltersType>({
    query: '',
    location: '',
    minPrice: 0,
    maxPrice: 1000,
    minRating: 1,
    maxRating: 5,
  });

  useEffect(() => {
    searchChefs();
  }, [filters]);

  const searchChefs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (filters.query) params.append('query', filters.query);
      if (filters.location) params.append('location', filters.location);
      if (filters.minPrice > 0) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice < 1000) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.minRating > 1) params.append('minRating', filters.minRating.toString());
      if (filters.maxRating < 5) params.append('maxRating', filters.maxRating.toString());

      const response = await fetch(`/api/chefs/search?${params.toString()}`);
      
      if (!response.ok) throw new Error('Failed to search chefs');
      
      const data = await response.json();
      setChefs(data);
    } catch (error) {
      console.error('Error searching chefs:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
        }`}
      />
    ));
  };

  const getPriceRange = (menus: Chef['menus']) => {
    if (menus.length === 0) return 'No pricing';
    const prices = menus.map(m => m.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `$${min}` : `$${min}-${max}`;
  };

  return (
    <div className="space-y-6">
      <SearchFilters onFiltersChange={setFilters} />

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Searching chefs...</div>
          </div>
        ) : chefs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No chefs found</h3>
              <p className="text-muted-foreground">Try adjusting your search criteria</p>
            </CardContent>
          </Card>
        ) : (
          chefs.map((chef) => (
            <Card key={chef.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={chef.profileImage || undefined} />
                    <AvatarFallback className="text-lg">
                      {chef.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold">{chef.user.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {chef.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {getPriceRange(chef.menus)}
                          </div>
                          {chef.experience && (
                            <div>{chef.experience} years experience</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-1">
                          {renderStars(chef.averageRating)}
                          <span className="text-sm font-medium ml-1">
                            {chef.averageRating}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {chef.reviewCount} {chef.reviewCount === 1 ? 'review' : 'reviews'}
                        </div>
                      </div>
                    </div>

                    {chef.bio && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {chef.bio}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {chef.menus.slice(0, 3).map((menu) => (
                          <Badge key={menu.id} variant="secondary" className="text-xs">
                            {menu.title}
                          </Badge>
                        ))}
                        {chef.menus.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{chef.menus.length - 3} more
                          </Badge>
                        )}
                      </div>
                      
                      <Button
                        onClick={() => onSelectChef?.(chef.id)}
                        size="sm"
                      >
                        View Profile
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
