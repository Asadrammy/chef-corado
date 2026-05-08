'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Star, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConversionSignalsProps {
  type: 'proposal' | 'experience' | 'request';
  data: any;
  className?: string;
}

export function ConversionSignals({ type, data, className }: ConversionSignalsProps) {
  const renderTrustSignals = () => {
    const signals = [];

    // Only show real verified data
    if (data.chef?.verified) {
      signals.push(
        <Badge key="verified" variant="secondary" className="bg-green-50 text-green-600 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    }

    // Only show rating if reviews exist
    if (data.chef?._count?.reviews > 0 && data.chef.reviews && data.chef.reviews.length > 0) {
      const avgRating = (data.chef.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / data.chef.reviews.length).toFixed(1);
      signals.push(
        <Badge key="rating" variant="secondary" className="bg-yellow-50 text-yellow-600 border-yellow-200">
          <Star className="w-3 h-3 mr-1 fill-yellow-600" />
          {avgRating}★
        </Badge>
      );
    }

    // Only show instant booking if it's actually enabled
    if (data.isInstantBooking === true) {
      signals.push(
        <Badge key="instant" variant="secondary" className="bg-blue-50 text-blue-600 border-blue-200">
          <Clock className="w-3 h-3 mr-1" />
          Instant Booking
        </Badge>
      );
    }

    return signals.length > 0 ? (
      <div className="flex flex-wrap gap-2 mb-3">
        {signals}
      </div>
    ) : null;
  };

  const renderRealMetrics = () => {
    const metrics = [];

    // Only show real booking count if > 0
    if (data.chef?._count?.bookings > 0) {
      metrics.push(
        <div key="bookings" className="text-sm text-gray-600">
          {data.chef._count.bookings} bookings
        </div>
      );
    }

    // Only show real review count if > 0
    if (data.chef?._count?.reviews > 0) {
      metrics.push(
        <div key="reviews" className="text-sm text-gray-600">
          {data.chef._count.reviews} reviews
        </div>
      );
    }

    // Only show proposal count if > 0
    if (data.proposalsCount > 0) {
      metrics.push(
        <div key="proposals" className="text-sm text-gray-600">
          {data.proposalsCount} proposals received
        </div>
      );
    }

    return metrics.length > 0 ? (
      <div className="flex flex-wrap gap-3 mb-3">
        {metrics}
      </div>
    ) : null;
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {renderTrustSignals()}
        {renderRealMetrics()}
      </CardContent>
    </Card>
  );
}
