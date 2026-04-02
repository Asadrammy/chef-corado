'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, ArrowRight, Star, Users, FileText, Calendar, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { growthAnalytics } from '@/lib/analytics';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  actionUrl?: string;
  actionText?: string;
  icon: React.ReactNode;
  priority: 'high' | 'medium' | 'low';
}

interface UserActivationFlowProps {
  userRole: 'CLIENT' | 'CHEF';
  className?: string;
}

export function UserActivationFlow({ userRole, className }: UserActivationFlowProps) {
  const { data: session } = useSession();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchOnboardingProgress();
    }
  }, [session, userRole]);

  const fetchOnboardingProgress = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/onboarding-progress');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch onboarding progress');
      }
      
      const onboardingSteps = userRole === 'CLIENT' ? 
        getClientSteps(data) : getChefSteps(data);
      
      setSteps(onboardingSteps);
      calculateProgress(onboardingSteps);
      
      // Track onboarding progress
      growthAnalytics.track('profile_completed', session?.user?.id || undefined, {
        userRole,
        completionPercentage: calculateProgress(onboardingSteps),
        completedSteps: onboardingSteps.filter(s => s.completed).length,
        totalSteps: onboardingSteps.length
      });
    } catch (error) {
      console.error('Error fetching onboarding progress:', error);
      // Show empty state when API fails
      setSteps([]);
      setProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  const getClientSteps = (data: any): OnboardingStep[] => [
    {
      id: 'complete_profile',
      title: 'Complete Your Profile',
      description: 'Add your personal information and preferences',
      completed: data.profileCompletion >= 80,
      actionUrl: '/dashboard/settings/profile',
      actionText: 'Complete Profile',
      icon: <Users className="h-5 w-5" />,
      priority: 'high'
    },
    {
      id: 'create_first_request',
      title: 'Create Your First Request',
      description: 'Tell us about your event and culinary needs',
      completed: data.hasCreatedRequest,
      actionUrl: '/dashboard/client/create-request',
      actionText: 'Create Request',
      icon: <FileText className="h-5 w-5" />,
      priority: 'high'
    },
    {
      id: 'browse_experiences',
      title: 'Browse Experiences',
      description: 'Discover talented chefs and their offerings',
      completed: data.hasBrowsedExperiences,
      actionUrl: '/experiences',
      actionText: 'Browse Experiences',
      icon: <Star className="h-5 w-5" />,
      priority: 'medium'
    },
    {
      id: 'make_first_booking',
      title: 'Make Your First Booking',
      description: 'Book a chef for your event',
      completed: data.hasMadeBooking,
      actionUrl: '/dashboard/client/bookings',
      actionText: 'View Bookings',
      icon: <Calendar className="h-5 w-5" />,
      priority: 'high'
    },
    {
      id: 'complete_payment',
      title: 'Complete Payment',
      description: 'Secure your booking with payment',
      completed: data.hasCompletedPayment,
      actionUrl: '/dashboard/client/bookings',
      actionText: 'Manage Payments',
      icon: <DollarSign className="h-5 w-5" />,
      priority: 'high'
    },
    {
      id: 'leave_review',
      title: 'Leave a Review',
      description: 'Share your experience with the community',
      completed: data.hasLeftReview,
      actionUrl: '/dashboard/client/bookings',
      actionText: 'Leave Review',
      icon: <Star className="h-5 w-5" />,
      priority: 'low'
    }
  ];

  const getChefSteps = (data: any): OnboardingStep[] => [
    {
      id: 'complete_profile',
      title: 'Complete Chef Profile',
      description: 'Showcase your skills, experience, and cuisine',
      completed: data.profileCompletion >= 80,
      actionUrl: '/dashboard/chef/profile',
      actionText: 'Complete Profile',
      icon: <Users className="h-5 w-5" />,
      priority: 'high'
    },
    {
      id: 'get_approved',
      title: 'Get Approved',
      description: 'Complete verification to start accepting bookings',
      completed: data.isApproved,
      actionUrl: '/dashboard/chef/profile',
      actionText: 'Update Profile',
      icon: <CheckCircle className="h-5 w-5" />,
      priority: 'high'
    },
    {
      id: 'create_menu',
      title: 'Create Your First Menu',
      description: 'Showcase your culinary offerings',
      completed: data.hasCreatedMenu,
      actionUrl: '/dashboard/chef/menus',
      actionText: 'Create Menu',
      icon: <FileText className="h-5 w-5" />,
      priority: 'high'
    },
    {
      id: 'set_availability',
      title: 'Set Your Availability',
      description: 'Let clients know when you\'re available',
      completed: data.hasSetAvailability,
      actionUrl: '/dashboard/chef/availability',
      actionText: 'Set Availability',
      icon: <Calendar className="h-5 w-5" />,
      priority: 'medium'
    },
    {
      id: 'send_first_proposal',
      title: 'Send Your First Proposal',
      description: 'Respond to a client request',
      completed: data.hasSentProposal,
      actionUrl: '/dashboard/chef/requests',
      actionText: 'Browse Requests',
      icon: <FileText className="h-5 w-5" />,
      priority: 'high'
    },
    {
      id: 'complete_first_booking',
      title: 'Complete Your First Booking',
      description: 'Successfully deliver your culinary experience',
      completed: data.hasCompletedBooking,
      actionUrl: '/dashboard/chef/bookings',
      actionText: 'View Bookings',
      icon: <Calendar className="h-5 w-5" />,
      priority: 'high'
    },
    {
      id: 'receive_payment',
      title: 'Receive Your First Payment',
      description: 'Get paid for your amazing work',
      completed: data.hasReceivedPayment,
      actionUrl: '/dashboard/chef/payouts',
      actionText: 'View Earnings',
      icon: <DollarSign className="h-5 w-5" />,
      priority: 'high'
    }
  ];

  const calculateProgress = (steps: OnboardingStep[]) => {
    const completedSteps = steps.filter(step => step.completed).length;
    const totalSteps = steps.length;
    const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
    setProgress(progressPercentage);
    return progressPercentage;
  };

  const handleStepAction = (step: OnboardingStep) => {
    if (step.actionUrl) {
      growthAnalytics.track('dashboard_viewed', session?.user?.id || undefined, {
        userRole,
        action: 'onboarding_step_clicked',
        stepId: step.id,
        stepTitle: step.title
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-600 border-red-200';
      case 'medium': return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      case 'low': return 'bg-green-50 text-green-600 border-green-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getIncompleteSteps = () => {
    return steps.filter(step => !step.completed).sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Loading your onboarding progress...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const incompleteSteps = getIncompleteSteps();
  const isFullyOnboarded = progress >= 100;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isFullyOnboarded ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-blue-600" />
              )}
              {isFullyOnboarded ? 'Welcome Back!' : 'Getting Started'}
            </CardTitle>
            <CardDescription>
              {isFullyOnboarded 
                ? 'You\'re all set up! Here are some ways to get the most out of the platform.'
                : `Complete these steps to unlock the full experience (${Math.round(progress)}% complete)`
              }
            </CardDescription>
          </div>
          <Badge variant={isFullyOnboarded ? "default" : "secondary"}>
            {isFullyOnboarded ? 'Complete' : `${Math.round(progress)}%`}
          </Badge>
        </div>
        {!isFullyOnboarded && (
          <Progress value={progress} className="mt-2" />
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isFullyOnboarded ? (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">You're All Set!</h3>
              <p className="text-gray-600 mb-4">
                You've completed the onboarding process. Start exploring the platform features.
              </p>
              <div className="flex justify-center gap-2">
                <Link href="/experiences">
                  <Button>
                    Browse Experiences
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard/analytics">
                  <Button variant="outline">
                    View Analytics
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            incompleteSteps.slice(0, 3).map((step) => (
              <div
                key={step.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium">{step.title}</h4>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getPriorityColor(step.priority)}`}
                      >
                        {step.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{step.description}</p>
                  </div>
                </div>
                {step.actionUrl && (
                  <Link href={step.actionUrl} onClick={() => handleStepAction(step)}>
                    <Button variant="outline" size="sm">
                      {step.actionText}
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
        
        {incompleteSteps.length > 3 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              {incompleteSteps.length - 3} more steps to complete
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
