'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle, 
  Star, 
  Shield, 
  Calendar
} from 'lucide-react';

interface TrustSignalsProps {
  chef?: any;
  experience?: any;
  request?: any;
  className?: string;
}

export function TrustSignals({ chef, experience, request, className }: TrustSignalsProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Profile Signals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Verification Badges - Only show real verified data */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Visible platform signals</h4>
          <div className="flex flex-wrap gap-2">
            {chef?.verified && (
              <Badge className="bg-green-50 text-green-600 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
            {chef?.isApproved && (
              <Badge className="bg-blue-50 text-blue-600 border-blue-200">
                <Shield className="w-3 h-3 mr-1" />
                Approved
              </Badge>
            )}
            {!chef?.verified && !chef?.isApproved && (
              <Badge className="bg-gray-50 text-gray-600 border-gray-200">
                No visible verification badge
              </Badge>
            )}
          </div>
        </div>

        {/* Real Metrics - Only show if data exists */}
        {(chef?._count?.bookings > 0 || chef?._count?.reviews > 0) && (
          <div className="grid grid-cols-2 gap-4">
            {chef?._count?.bookings > 0 && (
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-xl font-bold text-blue-600">{chef._count.bookings}</div>
                <div className="text-xs text-blue-600">Bookings</div>
              </div>
            )}
            {chef?._count?.reviews > 0 && (
              <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                <div className="text-xl font-bold text-purple-600">{chef._count.reviews}</div>
                <div className="text-xs text-purple-600">Reviews</div>
              </div>
            )}
          </div>
        )}

        {/* Real Rating - Only show if reviews exist */}
        {chef?._count?.reviews > 0 && chef.reviews && chef.reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm p-3 bg-yellow-50 rounded-lg border border-yellow-100">
            <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" />
            <span className="font-medium">
              {(chef.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / chef.reviews.length).toFixed(1)} / 5
            </span>
            <span className="text-gray-600">({chef._count.reviews} reviews)</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
