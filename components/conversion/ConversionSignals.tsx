'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Users, Star, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConversionSignalsProps {
  type: 'proposal' | 'experience' | 'request';
  data: any;
  className?: string;
}

export function ConversionSignals({ type, data, className }: ConversionSignalsProps) {
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [socialProof, setSocialProof] = useState<string>('');

  useEffect(() => {
    calculateUrgency();
    generateSocialProof();
  }, [data, type]);

  const calculateUrgency = () => {
    let level: 'low' | 'medium' | 'high' = 'low';

    switch (type) {
      case 'proposal':
        // High urgency if proposal is recent and from highly-rated chef
        if (data.createdAt) {
          const hoursOld = (Date.now() - new Date(data.createdAt).getTime()) / (1000 * 60 * 60);
          if (hoursOld < 2) level = 'high';
          else if (hoursOld < 24) level = 'medium';
        }
        if (data.chef?.averageRating >= 4.8) level = 'high';
        break;

      case 'experience':
        // High urgency if limited availability or high demand
        if (data.maxBookings && data.currentBookings) {
          const availabilityRatio = (data.maxBookings - data.currentBookings) / data.maxBookings;
          if (availabilityRatio < 0.2) level = 'high';
          else if (availabilityRatio < 0.5) level = 'medium';
        }
        if (data.bookingsCount > 10) level = 'high';
        break;

      case 'request':
        // High urgency if event date is approaching
        if (data.eventDate) {
          const daysUntilEvent = (new Date(data.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          if (daysUntilEvent < 7) level = 'high';
          else if (daysUntilEvent < 14) level = 'medium';
        }
        if (data.proposalsCount > 5) level = 'high';
        break;
    }

    setUrgencyLevel(level);
  };

  const generateSocialProof = () => {
    let proof = '';

    switch (type) {
      case 'proposal':
        if (data.chef?.completedBookings > 20) {
          proof = `${data.chef.completedBookings} successful bookings`;
        } else if (data.chef?.averageRating >= 4.5) {
          proof = `${data.chef.averageRating}★ rating`;
        }
        break;

      case 'experience':
        if (data.bookingsCount > 15) {
          proof = `Booked ${data.bookingsCount} times`;
        } else if (data.reviewCount > 10) {
          proof = `${data.reviewCount} reviews`;
        }
        break;

      case 'request':
        if (data.proposalsCount > 0) {
          proof = `${data.proposalsCount} chefs interested`;
        }
        break;
    }

    setSocialProof(proof);
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-50 text-red-600 border-red-200';
      case 'medium': return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'low': return 'bg-blue-50 text-blue-600 border-blue-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getUrgencyText = (level: string) => {
    switch (level) {
      case 'high': return 'Urgent';
      case 'medium': return 'Limited Time';
      case 'low': return 'Available';
      default: return 'Available';
    }
  };

  const renderUrgencySignals = () => {
    if (urgencyLevel === 'low') return null;

    return (
      <div className="flex items-center gap-2 mb-3">
        <Badge className={getUrgencyColor(urgencyLevel)}>
          <Clock className="w-3 h-3 mr-1" />
          {getUrgencyText(urgencyLevel)}
        </Badge>
        
        {type === 'proposal' && data.createdAt && (
          <span className="text-xs text-gray-500">
            Sent {formatDistanceToNow(new Date(data.createdAt), { addSuffix: true })}
          </span>
        )}
        
        {type === 'request' && data.eventDate && (
          <span className="text-xs text-gray-500">
            Event in {formatDistanceToNow(new Date(data.eventDate), { addSuffix: true })}
          </span>
        )}
      </div>
    );
  };

  const renderSocialProof = () => {
    if (!socialProof) return null;

    return (
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white -ml-2 first:ml-0"
              style={{ zIndex: 3 - i }}
            />
          ))}
        </div>
        <span className="text-sm text-gray-600">{socialProof}</span>
      </div>
    );
  };

  const renderTrustSignals = () => {
    const signals = [];

    if (data.chef?.verified) {
      signals.push(
        <Badge key="verified" variant="secondary" className="bg-green-50 text-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    }

    if (data.chef?.averageRating >= 4.5) {
      signals.push(
        <Badge key="rating" variant="secondary" className="bg-blue-50 text-blue-600">
          <Star className="w-3 h-3 mr-1" />
          {data.chef.averageRating}★
        </Badge>
      );
    }

    if (data.chef?.responseTime && data.chef.responseTime < 60) {
      signals.push(
        <Badge key="response" variant="secondary" className="bg-purple-50 text-purple-600">
          <Clock className="w-3 h-3 mr-1" />
          Fast Response
        </Badge>
      );
    }

    if (data.isInstantBooking) {
      signals.push(
        <Badge key="instant" variant="secondary" className="bg-orange-50 text-orange-600">
          <TrendingUp className="w-3 h-3 mr-1" />
          Instant Book
        </Badge>
      );
    }

    return signals.length > 0 ? (
      <div className="flex flex-wrap gap-2 mb-3">
        {signals}
      </div>
    ) : null;
  };

  const renderScarcityIndicator = () => {
    if (type === 'experience' && data.maxBookings && data.currentBookings) {
      const remaining = data.maxBookings - data.currentBookings;
      const percentage = (remaining / data.maxBookings) * 100;
      
      if (percentage < 30) {
        return (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Limited Availability</span>
              <span className="text-sm font-medium">{remaining} spots left</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      }
    }

    if (type === 'request' && data.maxProposals) {
      const remaining = data.maxProposals - (data.proposalsCount || 0);
      
      if (remaining <= 2) {
        return (
          <div className="flex items-center gap-2 mb-3 text-orange-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Only {remaining} proposal spots remaining</span>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {renderUrgencySignals()}
        {renderSocialProof()}
        {renderTrustSignals()}
        {renderScarcityIndicator()}
      </CardContent>
    </Card>
  );
}

interface EnhancedCTAProps {
  type: 'accept_proposal' | 'book_experience' | 'send_proposal';
  data: any;
  onAction: () => void;
  disabled?: boolean;
  className?: string;
}

export function EnhancedCTA({ type, data, onAction, disabled = false, className }: EnhancedCTAProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleAction = async () => {
    if (disabled) return;
    
    setIsProcessing(true);
    try {
      await onAction();
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3000);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getCTAText = () => {
    switch (type) {
      case 'accept_proposal':
        return 'Accept Proposal';
      case 'book_experience':
        return 'Book Now';
      case 'send_proposal':
        return 'Send Proposal';
      default:
        return 'Take Action';
    }
  };

  const getCTAVariant = () => {
    if (showConfirmation) return 'default';
    if (disabled) return 'secondary';
    return 'default';
  };

  const getCTAColor = () => {
    if (showConfirmation) return 'bg-green-600 hover:bg-green-700';
    if (disabled) return '';
    return '';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Button
        onClick={handleAction}
        disabled={disabled || isProcessing}
        variant={getCTAVariant()}
        className={`w-full ${getCTAColor()}`}
        size="lg"
      >
        {isProcessing ? (
          'Processing...'
        ) : showConfirmation ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Success!
          </>
        ) : (
          <>
            {getCTAText()}
            <TrendingUp className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>
      
      {!showConfirmation && !disabled && (
        <div className="text-center">
          <p className="text-xs text-gray-500">
            {type === 'accept_proposal' && 'Secure booking with payment protection'}
            {type === 'book_experience' && 'Instant confirmation - pay later'}
            {type === 'send_proposal' && 'Free to send - no payment required'}
          </p>
        </div>
      )}
      
      {showConfirmation && (
        <div className="text-center text-green-600 text-sm">
          <CheckCircle className="w-4 h-4 inline mr-1" />
          Action completed successfully!
        </div>
      )}
    </div>
  );
}
