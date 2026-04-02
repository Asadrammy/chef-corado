'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Bell, 
  MessageSquare, 
  Calendar, 
  Star, 
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Gift,
  Zap,
  Heart
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RetentionHooksProps {
  userRole: 'CLIENT' | 'CHEF';
  userId: string;
  className?: string;
}

export function RetentionHooks({ userRole, userId, className }: RetentionHooksProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [engagementScore, setEngagementScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    fetchEngagementScore();
  }, [userRole, userId]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notifications?userId=${userId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch notifications');
      }
      
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Show empty state when API fails
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEngagementScore = async () => {
    try {
      const response = await fetch(`/api/user/${userId}/engagement-score`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch engagement score');
      }
      
      setEngagementScore(data.score || 0);
    } catch (error) {
      console.error('Error fetching engagement score:', error);
      // Show empty state when API fails
      setEngagementScore(0);
    }
  };

  const handleNotificationClick = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'PROPOSAL_RECEIVED': return <MessageSquare className="w-4 h-4" />;
      case 'PROPOSAL_ACCEPTED': return <CheckCircle className="w-4 h-4" />;
      case 'BOOKING_CREATED': return <Calendar className="w-4 h-4" />;
      case 'PAYMENT_SUCCESS': return <DollarSign className="w-4 h-4" />;
      case 'REVIEW_RECEIVED': return <Star className="w-4 h-4" />;
      case 'NEW_MESSAGE': return <MessageSquare className="w-4 h-4" />;
      case 'CHEF_APPROVED': return <CheckCircle className="w-4 h-4" />;
      case 'PAYOUT_PROCESSED': return <DollarSign className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'PROPOSAL_RECEIVED': return 'bg-blue-50 text-blue-600';
      case 'PROPOSAL_ACCEPTED': return 'bg-green-50 text-green-600';
      case 'BOOKING_CREATED': return 'bg-purple-50 text-purple-600';
      case 'PAYMENT_SUCCESS': return 'bg-green-50 text-green-600';
      case 'REVIEW_RECEIVED': return 'bg-yellow-50 text-yellow-600';
      case 'NEW_MESSAGE': return 'bg-blue-50 text-blue-600';
      case 'CHEF_APPROVED': return 'bg-green-50 text-green-600';
      case 'PAYOUT_PROCESSED': return 'bg-green-50 text-green-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm">
            Mark all read
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Engagement Score */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Engagement Score</span>
            </div>
            <span className="text-sm font-bold text-blue-600">{engagementScore}%</span>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.length > 0 ? (
            notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  notification.isRead 
                    ? 'bg-gray-50 border-gray-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}
                onClick={() => handleNotificationClick(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{notification.title}</span>
                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{notification.message}</p>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No notifications</p>
          )}
        </div>

        {/* Engagement Prompts */}
        {engagementScore < 50 && (
          <div className="bg-orange-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-orange-900 mb-2">Stay Engaged!</h4>
            <p className="text-xs text-orange-800 mb-3">
              Complete your profile, browse experiences, or send proposals to increase your engagement score.
            </p>
            <Button size="sm" className="w-full">
              Get Started
              <Zap className="w-3 h-3 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface GamificationProps {
  userRole: 'CLIENT' | 'CHEF';
  userId: string;
  className?: string;
}

export function Gamification({ userRole, userId, className }: GamificationProps) {
  const [userLevel, setUserLevel] = useState(1);
  const [userPoints, setUserPoints] = useState(0);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [nextLevelPoints, setNextLevelPoints] = useState(100);

  useEffect(() => {
    fetchGamificationData();
  }, [userRole, userId]);

  const fetchGamificationData = async () => {
    try {
      const response = await fetch(`/api/user/${userId}/gamification`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch gamification data');
      }
      
      setUserLevel(data.level || 1);
      setUserPoints(data.points || 0);
      setAchievements(data.achievements || []);
      setNextLevelPoints(data.nextLevelPoints || 100);
    } catch (error) {
      console.error('Error fetching gamification data:', error);
      // Show empty state when API fails
      setUserLevel(1);
      setUserPoints(0);
      setAchievements([]);
      setNextLevelPoints(100);
    }
  };

  const getLevelColor = (level: number) => {
    if (level >= 10) return 'text-purple-600';
    if (level >= 5) return 'text-blue-600';
    return 'text-green-600';
  };

  const getLevelTitle = (level: number) => {
    if (level >= 10) return 'Expert';
    if (level >= 7) return 'Advanced';
    if (level >= 5) return 'Experienced';
    if (level >= 3) return 'Intermediate';
    return 'Beginner';
  };

  const progressToNextLevel = nextLevelPoints > 0 
    ? (userPoints / nextLevelPoints) * 100 
    : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5" />
          Your Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level and Points */}
        <div className="text-center">
          <div className={`text-3xl font-bold ${getLevelColor(userLevel)}`}>
            Level {userLevel}
          </div>
          <div className="text-sm text-gray-600 mb-2">{getLevelTitle(userLevel)}</div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-lg font-semibold">{userPoints} points</span>
          </div>
          
          {/* Progress to Next Level */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Progress to Level {userLevel + 1}</span>
              <span>{userPoints}/{nextLevelPoints}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressToNextLevel}%` }}
              />
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Recent Achievements</h4>
          <div className="grid grid-cols-3 gap-2">
            {achievements.slice(0, 6).map((achievement, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 mx-auto mb-1 rounded-full bg-yellow-100 flex items-center justify-center">
                  {achievement.icon === 'star' && <Star className="w-6 h-6 text-yellow-600" />}
                  {achievement.icon === 'heart' && <Heart className="w-6 h-6 text-red-600" />}
                  {achievement.icon === 'zap' && <Zap className="w-6 h-6 text-blue-600" />}
                  {achievement.icon === 'award' && <Gift className="w-6 h-6 text-purple-600" />}
                </div>
                <div className="text-xs text-gray-600">{achievement.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rewards */}
        <div className="bg-green-50 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-green-900 mb-2">Available Rewards</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>5% off next booking</span>
              <Badge variant="outline" className="text-green-600">500 pts</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Priority support</span>
              <Badge variant="outline" className="text-green-600">1000 pts</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface EngagementPromptsProps {
  userRole: 'CLIENT' | 'CHEF';
  userId: string;
  className?: string;
}

export function EngagementPrompts({ userRole, userId, className }: EngagementPromptsProps) {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEngagementPrompts();
  }, [userRole, userId]);

  const fetchEngagementPrompts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/user/${userId}/engagement-prompts`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch engagement prompts');
      }
      
      setPrompts(data.prompts || []);
    } catch (error) {
      console.error('Error fetching engagement prompts:', error);
      // Show empty state when API fails
      setPrompts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getPromptIcon = (type: string) => {
    switch (type) {
      case 'complete_profile': return <Users className="w-5 h-5" />;
      case 'browse_experiences': return <Star className="w-5 h-5" />;
      case 'send_proposal': return <MessageSquare className="w-5 h-5" />;
      case 'leave_review': return <Star className="w-5 h-5" />;
      case 'refer_friend': return <Gift className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getPromptColor = (type: string) => {
    switch (type) {
      case 'complete_profile': return 'bg-blue-50 text-blue-600';
      case 'browse_experiences': return 'bg-purple-50 text-purple-600';
      case 'send_proposal': return 'bg-green-50 text-green-600';
      case 'leave_review': return 'bg-yellow-50 text-yellow-600';
      case 'refer_friend': return 'bg-orange-50 text-orange-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
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
          <Zap className="w-5 h-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {prompts.length > 0 ? (
          prompts.map((prompt, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getPromptColor(prompt.type)}`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-white">
                  {getPromptIcon(prompt.type)}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{prompt.title}</h4>
                  <p className="text-xs opacity-80">{prompt.description}</p>
                </div>
                <Button size="sm" variant="outline">
                  {prompt.actionText}
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h4 className="text-lg font-semibold mb-2">All Caught Up!</h4>
            <p className="text-sm text-gray-600">
              You're doing great! Check back later for new opportunities.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
