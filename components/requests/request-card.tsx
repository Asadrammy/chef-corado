'use client';

import { useState } from 'react';
import { MapPin, DollarSign, Calendar, Users, Clock, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow, format } from 'date-fns';

interface Request {
  id: string;
  title: string;
  description?: string;
  budget: number;
  eventDate: string;
  location: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  client: {
    id: string;
    name: string;
  };
  proposals: Array<{
    id: string;
    price: number;
  }>;
}

interface RequestCardProps {
  request: Request;
}

export function RequestCard({ request }: RequestCardProps) {
  const [imageError, setImageError] = useState(false);
  const eventDate = new Date(request.eventDate);
  const isPast = eventDate < new Date();
  const isSoon = eventDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000; // Within 7 days

  const getStatusBadge = () => {
    if (isPast) {
      return <Badge variant="secondary">Past Event</Badge>;
    }
    if (isSoon) {
      return <Badge variant="destructive">Urgent</Badge>;
    }
    return <Badge variant="default">Open</Badge>;
  };

  const averageProposalPrice = request.proposals.length > 0
    ? request.proposals.reduce((sum, p) => sum + p.price, 0) / request.proposals.length
    : null;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={undefined}
                alt={request.client.name}
              />
              <AvatarFallback className="bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{request.title}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <Users className="h-3 w-3" />
                <span className="truncate">{request.client.name}</span>
              </CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {request.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {request.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{request.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(eventDate, 'MMM d, yyyy')}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Budget</span>
            <div className="flex items-center gap-1 text-sm">
              <DollarSign className="h-3 w-3" />
              <span className="font-semibold">${request.budget}</span>
            </div>
          </div>
          
          {request.proposals.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Avg. proposal</span>
              <span className="font-medium">
                ${averageProposalPrice?.toFixed(0)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
            </span>
          </div>
          <Badge variant="outline">
            {request.proposals.length} proposal{request.proposals.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="flex gap-2 pt-2">
          <Button className="flex-1" size="sm" disabled={isPast}>
            {isPast ? 'Event Passed' : 'Send Proposal'}
          </Button>
          <Button variant="outline" size="sm">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
