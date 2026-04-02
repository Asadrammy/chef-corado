'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  CheckCircle, 
  Star, 
  Shield, 
  Award, 
  TrendingUp,
  Users,
  Calendar,
  MapPin,
  Clock,
  ThumbsUp,
  Eye
} from 'lucide-react';

interface TrustSignalsProps {
  chef?: any;
  experience?: any;
  request?: any;
  className?: string;
}

export function TrustSignals({ chef, experience, request, className }: TrustSignalsProps) {
  const [trustScore, setTrustScore] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<any>({});

  useEffect(() => {
    calculateTrustScore();
    fetchVerificationStatus();
  }, [chef, experience, request]);

  const calculateTrustScore = () => {
    let score = 0;

    if (chef) {
      // Chef verification (30 points)
      if (chef.verified) score += 30;
      if (chef.isApproved) score += 15;

      // Experience and ratings (25 points)
      if (chef.completedBookings >= 10) score += 15;
      else if (chef.completedBookings >= 5) score += 10;
      else if (chef.completedBookings >= 1) score += 5;

      if (chef.averageRating >= 4.8) score += 10;
      else if (chef.averageRating >= 4.5) score += 7;
      else if (chef.averageRating >= 4.0) score += 5;

      // Response time (15 points)
      if (chef.avgResponseTime <= 30) score += 15;
      else if (chef.avgResponseTime <= 60) score += 10;
      else if (chef.avgResponseTime <= 120) score += 5;

      // Profile completeness (20 points)
      if (chef.profileCompletion >= 90) score += 20;
      else if (chef.profileCompletion >= 75) score += 15;
      else if (chef.profileCompletion >= 50) score += 10;

      // Reviews (10 points)
      if (chef.reviewCount >= 20) score += 10;
      else if (chef.reviewCount >= 10) score += 7;
      else if (chef.reviewCount >= 5) score += 5;
    }

    if (experience) {
      // Experience bookings (15 points)
      if (experience.bookingsCount >= 15) score += 15;
      else if (experience.bookingsCount >= 8) score += 10;
      else if (experience.bookingsCount >= 3) score += 5;

      // Experience reviews (10 points)
      if (experience.reviewCount >= 10) score += 10;
      else if (experience.reviewCount >= 5) score += 7;
      else if (experience.reviewCount >= 1) score += 5;
    }

    setTrustScore(Math.min(100, score));
  };

  const fetchVerificationStatus = async () => {
    if (chef?.userId) {
      try {
        const response = await fetch(`/api/chefs/${chef.userId}/verification`);
        const data = await response.json();
        setVerificationStatus(data);
      } catch (error) {
        console.error('Error fetching verification status:', error);
      }
    }
  };

  const getTrustColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrustLevel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Trust & Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trust Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Trust Score</span>
            <span className={`text-sm font-bold ${getTrustColor(trustScore)}`}>
              {trustScore}% - {getTrustLevel(trustScore)}
            </span>
          </div>
          <Progress value={trustScore} className="h-2" />
        </div>

        {/* Verification Badges */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Verification Status</h4>
          <div className="flex flex-wrap gap-2">
            {chef?.verified && (
              <Badge className="bg-green-50 text-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified Chef
              </Badge>
            )}
            {chef?.isApproved && (
              <Badge className="bg-blue-50 text-blue-600">
                <Award className="w-3 h-3 mr-1" />
                Platform Approved
              </Badge>
            )}
            {verificationStatus?.identityVerified && (
              <Badge className="bg-purple-50 text-purple-600">
                <Shield className="w-3 h-3 mr-1" />
                Identity Verified
              </Badge>
            )}
            {verificationStatus?.backgroundChecked && (
              <Badge className="bg-orange-50 text-orange-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Background Checked
              </Badge>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          {chef?.completedBookings && (
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">{chef.completedBookings}</div>
              <div className="text-xs text-blue-600">Completed Bookings</div>
            </div>
          )}
          {chef?.averageRating && (
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-xl font-bold text-yellow-600">{chef.averageRating}★</div>
              <div className="text-xs text-yellow-600">Average Rating</div>
            </div>
          )}
          {chef?.avgResponseTime && (
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">{chef.avgResponseTime}m</div>
              <div className="text-xs text-green-600">Response Time</div>
            </div>
          )}
          {chef?.reviewCount && (
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">{chef.reviewCount}</div>
              <div className="text-xs text-purple-600">Reviews</div>
            </div>
          )}
        </div>

        {/* Trust Factors */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Trust Factors</h4>
          <div className="space-y-2">
            {chef?.verified && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Identity and credentials verified</span>
              </div>
            )}
            {chef?.completedBookings > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{chef.completedBookings} successful bookings</span>
              </div>
            )}
            {chef?.averageRating >= 4.5 && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-yellow-600" />
                <span>Excellent customer ratings</span>
              </div>
            )}
            {chef?.avgResponseTime && chef.avgResponseTime <= 60 && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-green-600" />
                <span>Quick response time</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProfileCompletionProps {
  userRole: 'CLIENT' | 'CHEF';
  userId: string;
  className?: string;
}

export function ProfileCompletion({ userRole, userId, className }: ProfileCompletionProps) {
  const [completion, setCompletion] = useState(0);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProfileCompletion();
  }, [userRole, userId]);

  const fetchProfileCompletion = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/user/${userId}/profile-completion`);
      const data = await response.json();
      setCompletion(data.completion);
      setMissingFields(data.missingFields);
    } catch (error) {
      console.error('Error fetching profile completion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCompletionColor = (completion: number) => {
    if (completion >= 90) return 'text-green-600';
    if (completion >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompletionText = (completion: number) => {
    if (completion >= 90) return 'Excellent';
    if (completion >= 75) return 'Good';
    if (completion >= 50) return 'Fair';
    return 'Needs Work';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Profile Completion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Profile Completion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Completion Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Completion Score</span>
            <span className={`text-sm font-bold ${getCompletionColor(completion)}`}>
              {completion}% - {getCompletionText(completion)}
            </span>
          </div>
          <Progress value={completion} className="h-2" />
        </div>

        {/* Missing Fields */}
        {missingFields.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">To Complete Your Profile:</h4>
            <div className="space-y-2">
              {missingFields.map((field, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>{field}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Benefits of Complete Profile:</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Higher visibility in search results</li>
            <li>• Increased trust from clients</li>
            <li>• More booking opportunities</li>
            <li>• Better conversion rates</li>
          </ul>
        </div>

        {/* Action Button */}
        {completion < 100 && (
          <Button className="w-full">
            Complete Profile Now
            <TrendingUp className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface SocialProofProps {
  type: 'chef' | 'experience' | 'request';
  data: any;
  className?: string;
}

export function SocialProof({ type, data, className }: SocialProofProps) {
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchRecentActivity();
  }, [type, data]);

  const fetchRecentActivity = async () => {
    try {
      let endpoint = '';
      if (type === 'chef' && data.userId) {
        endpoint = `/api/chefs/${data.userId}/activity`;
      } else if (type === 'experience' && data.id) {
        endpoint = `/api/experiences/${data.id}/activity`;
      } else if (type === 'request' && data.id) {
        endpoint = `/api/requests/${data.id}/activity`;
      }

      if (endpoint) {
        const response = await fetch(endpoint);
        const activityData = await response.json();
        setRecentActivity(activityData);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Social Proof
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recent Activity */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Recent Activity</h4>
          {recentActivity.length > 0 ? (
            <div className="space-y-2">
              {recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={activity.userAvatar} />
                    <AvatarFallback>
                      {activity.userName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <span className="font-medium">{activity.userName}</span>
                    <span className="text-gray-500 ml-1">{activity.action}</span>
                    <div className="text-xs text-gray-400">{activity.timeAgo}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recent activity</p>
          )}
        </div>

        {/* Popularity Indicators */}
        <div className="grid grid-cols-2 gap-4">
          {data.viewCount && (
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <Eye className="w-4 h-4 text-gray-600" />
                <span className="text-lg font-bold">{data.viewCount}</span>
              </div>
              <div className="text-xs text-gray-600">Views</div>
            </div>
          )}
          {data.likeCount && (
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <ThumbsUp className="w-4 h-4 text-gray-600" />
                <span className="text-lg font-bold">{data.likeCount}</span>
              </div>
              <div className="text-xs text-gray-600">Likes</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
