'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, DollarSign, User, Clock, CheckCircle, XCircle, AlertCircle, CreditCard, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ReviewForm, ReviewSection } from '@/components/reviews';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { analytics } from '@/lib/analytics';

interface BookingDetails {
  id: string;
  totalPrice: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
  chef: {
    id: string;
    bio: string | null;
    experience: number | null;
    location: string;
    radius: number;
    profileImage: string | null;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  proposal: {
    id: string;
    price: number;
    message: string | null;
    menu: {
      id: string;
      title: string;
      description: string | null;
      price: number;
    } | null;
  };
  payments?: {
    id: string;
    totalAmount: number;
    commissionAmount: number;
    chefAmount: number;
    status: 'PENDING' | 'HELD' | 'RELEASED' | 'COMPLETED';
    stripePaymentIntentId?: string;
    createdAt: string;
  };
  review?: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  };
}

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Mock current user - in real app this would come from auth
  const { data: session, status: sessionStatus } = useSession();
  const currentUserId = session?.user?.id ?? null;

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Booking not found');
          router.push('/dashboard/bookings');
          return;
        }
        throw new Error('Failed to fetch booking');
      }
      
      const data = await response.json();
      setBooking(data);
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update booking');

      const updatedBooking = await response.json();
      setBooking(updatedBooking);
      toast.success(`Booking ${newStatus.toLowerCase()}`);
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Failed to update booking');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <AlertCircle className="h-4 w-4" />;
      case 'CONFIRMED':
        return <Clock className="h-4 w-4" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <div className="text-muted-foreground">Loading booking details...</div>
        </div>
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center text-muted-foreground">
          Sign in to view booking details.
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Booking not found</h2>
          <Button onClick={() => router.push('/dashboard/bookings')}>
            Back to Bookings
          </Button>
        </div>
      </div>
    );
  }

  const isClient = currentUserId ? booking.client.id === currentUserId : false;
  const canLeaveReview = isClient && booking.status === 'COMPLETED' && !booking.review;
  const needsPayment = isClient && booking.status === 'PENDING' && !booking.payments;
  const hasUnpaidPayment = booking.payments && booking.payments.status !== 'COMPLETED';

  const handlePayNow = async () => {
    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to initiate payment');
      }

      const data = await response.json();
      if (data.url) {
        analytics.track('payment_completed', currentUserId || undefined, { bookingId: booking.id, amount: booking.totalPrice });
        window.location.href = data.url;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process payment. Please try again.';
      toast.error(message);
      console.error('Payment error:', error);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Booking Details</h1>
        <Badge className={getStatusColor(booking.status)}>
          {getStatusIcon(booking.status)}
          <span className="ml-1">{booking.status}</span>
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client & Chef Info */}
          <Card>
            <CardHeader>
              <CardTitle>Participants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={undefined} />
                  <AvatarFallback>
                    {booking.client.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{booking.client.name}</h3>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="text-xs text-muted-foreground">{booking.client.email}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={booking.chef.profileImage || undefined} />
                  <AvatarFallback>
                    {booking.chef.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{booking.chef.user.name}</h3>
                  <p className="text-sm text-muted-foreground">Chef</p>
                  <p className="text-xs text-muted-foreground">{booking.chef.user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-3 w-3" />
                    <span className="text-xs">{booking.chef.location}</span>
                    {booking.chef.experience && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs">{booking.chef.experience} years exp</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Proposal Details */}
          <Card>
            <CardHeader>
              <CardTitle>Proposal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.proposal.menu && (
                <div>
                  <h4 className="font-medium mb-2">Menu: {booking.proposal.menu.title}</h4>
                  {booking.proposal.menu.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {booking.proposal.menu.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">${booking.proposal.menu.price}</span>
                  </div>
                </div>
              )}
              
              {booking.proposal.message && (
                <div>
                  <h4 className="font-medium mb-2">Message from Chef</h4>
                  <p className="text-sm text-muted-foreground">{booking.proposal.message}</p>
                </div>
              )}
              
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    {formatDistanceToNow(new Date(booking.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">${booking.totalPrice}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Payment Information
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Payment must be completed before the booking can be confirmed
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!booking.payments ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">No payment processed yet</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-900">Total Amount Due</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">${booking.totalPrice.toFixed(2)}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">${booking.payments.totalAmount?.toFixed(2) || '0.00'}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(booking.payments.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge
                        variant={booking.payments.status === 'COMPLETED' ? 'default' : 'secondary'}
                      >
                        {booking.payments.status}
                      </Badge>
                    </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Section */}
          {booking.status === 'COMPLETED' && (
            <Card>
              <CardHeader>
                <CardTitle>Review</CardTitle>
              </CardHeader>
              <CardContent>
                {booking.review ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Rating:</span>
                      <div className="flex">
                        {Array.from({ length: 5 }, (_, i) => (
                          <div
                            key={i}
                            className={`w-4 h-4 ${
                              i < (booking.review?.rating || 0)
                                ? 'bg-yellow-400'
                                : 'bg-gray-200'
                            } rounded-sm`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {booking.review.rating}/5
                      </span>
                    </div>
                    {booking.review.comment && (
                      <p className="text-sm">{booking.review.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(booking.review.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ) : canLeaveReview ? (
                  <div className="text-center py-4">
                    <ReviewForm
                      bookingId={booking.id}
                      chefId={booking.chef.id}
                      onReviewSubmitted={fetchBooking}
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No review yet
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment CTA - High Priority */}
          {needsPayment && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-900">Payment Required</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-white rounded p-3 border border-green-100">
                  <p className="text-sm text-gray-600">Amount Due</p>
                  <p className="text-2xl font-bold text-green-900">${booking.totalPrice.toFixed(2)}</p>
                </div>
                <Button
                  onClick={handlePayNow}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay Now with Stripe
                </Button>
                <p className="text-xs text-green-700 text-center">
                  Secure payment via Stripe. Your booking will be confirmed after payment.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.status === 'PENDING' && (
                <>
                  {!needsPayment && (
                    <Button
                      onClick={() => updateBookingStatus('CONFIRMED')}
                      disabled={updating}
                      className="w-full"
                    >
                      Confirm Booking
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => updateBookingStatus('CANCELLED')}
                    disabled={updating}
                    className="w-full"
                  >
                    Cancel Booking
                  </Button>
                </>
              )}
              
              {booking.status === 'CONFIRMED' && (
                <Button
                  onClick={() => updateBookingStatus('COMPLETED')}
                  disabled={updating}
                  className="w-full"
                >
                  Mark as Completed
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/chat?userId=${booking.chef?.user?.id || ''}`)}
                className="w-full"
              >
                Contact Chef
              </Button>
            </CardContent>
          </Card>

          {/* Chef Reviews */}
          <Card>
            <CardHeader>
              <CardTitle>Chef Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewSection chefId={booking.chef.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
