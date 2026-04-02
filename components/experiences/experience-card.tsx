"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Users, DollarSign, MapPin, Star, Calendar } from "lucide-react";
import Link from "next/link";
import { InstantBookingDialog } from "@/components/booking/instant-booking-dialog";

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

interface ExperienceCardProps {
  experience: Experience;
  onBookNow?: (experienceId: string) => void;
  showBookButton?: boolean;
}

export function ExperienceCard({ 
  experience, 
  onBookNow, 
  showBookButton = true 
}: ExperienceCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  
  const includedServices = JSON.parse(experience.includedServices || '[]');
  const tags = JSON.parse(experience.tags || '[]');
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HARD': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getExperienceLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER': return 'bg-blue-100 text-blue-800';
      case 'INTERMEDIATE': return 'bg-purple-100 text-purple-800';
      case 'EXPERT': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleBookNow = () => {
    if (onBookNow) {
      onBookNow(experience.id);
    } else {
      setIsBookingDialogOpen(true);
    }
  };

  const handleBookingComplete = (booking: any) => {
    // Optional: Handle booking completion
    console.log('Booking completed:', booking);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Image Section */}
      <div className="relative h-48 bg-gray-100">
        {experience.experienceImage && !imageError ? (
          <img
            src={experience.experienceImage}
            alt={experience.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-red-100">
            <div className="text-center">
              <div className="text-4xl mb-2">🍳</div>
              <p className="text-gray-600 text-sm">No image available</p>
            </div>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <Badge className={getDifficultyColor(experience.difficulty)}>
            {experience.difficulty}
          </Badge>
          {experience.eventType && (
            <Badge variant="secondary">{experience.eventType}</Badge>
          )}
        </div>
        
        {/* Verified Badge */}
        {experience.chef.user.verified && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-500 text-white flex items-center gap-1">
              <Star className="h-3 w-3 fill-current" />
              Verified
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="space-y-2">
          <CardTitle className="text-lg line-clamp-2">
            {experience.title}
          </CardTitle>
          <CardDescription className="line-clamp-3">
            {experience.description}
          </CardDescription>
        </div>

        {/* Chef Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" alt={experience.chef.user.name} />
              <AvatarFallback>
                {experience.chef.user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{experience.chef.user.name}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3" />
                <span>{experience.chef.location}</span>
              </div>
            </div>
          </div>
          <Badge className={getExperienceLevelColor(experience.chef.user.experienceLevel)}>
            {experience.chef.user.experienceLevel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Details */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
              <DollarSign className="h-4 w-4" />
              <span>Price</span>
            </div>
            <p className="font-semibold">${experience.price}</p>
            <p className="text-xs text-gray-500">per person</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Duration</span>
            </div>
            <p className="font-semibold">{formatDuration(experience.duration)}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>Guests</span>
            </div>
            <p className="font-semibold">
              {experience.minGuests || 1}-{experience.maxGuests || '∞'}
            </p>
          </div>
        </div>

        {/* Included Services */}
        {includedServices.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Included Services:</h4>
            <div className="flex flex-wrap gap-1">
              {includedServices.slice(0, 3).map((service: any, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {service.name}
                </Badge>
              ))}
              {includedServices.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{includedServices.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div>
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 4).map((tag: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{tags.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{experience._count.bookings} bookings</span>
          </div>
          {experience.cuisineType && (
            <Badge variant="outline" className="text-xs">
              {experience.cuisineType}
            </Badge>
          )}
        </div>
      </CardContent>

      {showBookButton && (
        <CardFooter className="pt-3">
          <div className="w-full space-y-2">
            <Link href={`/experiences/${experience.id}`} className="block">
              <Button variant="outline" className="w-full">
                View Details
              </Button>
            </Link>
            <Button 
              className="w-full" 
              onClick={handleBookNow}
            >
              Book Now
            </Button>
          </div>
        </CardFooter>
      )}

      {/* Instant Booking Dialog */}
      <InstantBookingDialog
        experience={experience}
        open={isBookingDialogOpen}
        onOpenChange={setIsBookingDialogOpen}
        onBookingComplete={handleBookingComplete}
      />
    </Card>
  );
}
