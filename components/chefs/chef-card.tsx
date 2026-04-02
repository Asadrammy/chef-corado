'use client';

import { useState } from 'react';
import { Star, MapPin, DollarSign, Calendar, MessageCircle, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface Chef {
  id: string;
  bio?: string;
  experience?: number;
  location: string;
  latitude?: number;
  longitude?: number;
  radius: number;
  profileImage?: string;
  isApproved: boolean;
  user: {
    id: string;
    name: string;
    email: string;
  };
  menus: Array<{
    id: string;
    title: string;
    description?: string;
    price: number;
    menuImage?: string;
  }>;
  averageRating: number;
  reviewCount: number;
}

interface ChefCardProps {
  chef: Chef;
}

export function ChefCard({ chef }: ChefCardProps) {
  const [imageError, setImageError] = useState(false);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? 'fill-yellow-400 text-yellow-400'
            : i < rating
            ? 'fill-yellow-200 text-yellow-400'
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const minPrice = chef.menus.length > 0 
    ? Math.min(...chef.menus.map(m => m.price))
    : 0;
  const maxPrice = chef.menus.length > 0 
    ? Math.max(...chef.menus.map(m => m.price))
    : 0;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start space-x-3">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={chef.profileImage && !imageError ? chef.profileImage : undefined}
                alt={chef.user.name}
                onError={() => setImageError(true)}
              />
              <AvatarFallback className="bg-primary/10">
                <ChefHat className="h-8 w-8 text-primary" />
              </AvatarFallback>
            </Avatar>
            {chef.isApproved && (
              <Badge className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full p-0 bg-green-500">
                ✓
              </Badge>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{chef.user.name}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{chef.location}</span>
            </CardDescription>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center">
                {renderStars(chef.averageRating)}
              </div>
              <span className="text-sm text-muted-foreground">
                {chef.averageRating.toFixed(1)} ({chef.reviewCount})
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {chef.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {chef.bio}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm">
          {chef.experience && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{chef.experience} years</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{chef.radius}km radius</span>
          </div>
        </div>

        {chef.menus.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Menu Pricing</span>
              <div className="flex items-center gap-1 text-sm">
                <DollarSign className="h-3 w-3" />
                <span>
                  {minPrice === maxPrice 
                    ? `$${minPrice}`
                    : `$${minPrice} - $${maxPrice}`
                  }
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {chef.menus.slice(0, 2).map((menu) => (
                <div key={menu.id} className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">{menu.title}</span>
                  <span className="text-muted-foreground">${menu.price}</span>
                </div>
              ))}
              {chef.menus.length > 2 && (
                <p className="text-xs text-muted-foreground">
                  +{chef.menus.length - 2} more menu items
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button className="flex-1" size="sm">
            View Profile
          </Button>
          <Button variant="outline" size="sm">
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
