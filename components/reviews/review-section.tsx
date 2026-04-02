'use client';

import { ReviewList } from './review-list';
import { ReviewForm } from '@/components/reviews';

interface ReviewSectionProps {
  chefId: string;
  bookingId?: string; // Optional - only show form if booking is provided
  canLeaveReview?: boolean;
}

export function ReviewSection({ chefId, bookingId, canLeaveReview = false }: ReviewSectionProps) {
  return (
    <div className="space-y-8">
      {canLeaveReview && bookingId && (
        <div className="flex justify-end">
          <ReviewForm 
            bookingId={bookingId} 
            chefId={chefId}
            onReviewSubmitted={() => {
              // Refresh the review list
              window.location.reload();
            }}
          />
        </div>
      )}
      
      <ReviewList chefId={chefId} />
    </div>
  );
}
