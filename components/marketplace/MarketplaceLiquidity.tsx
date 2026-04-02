'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Clock, 
  MapPin, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Star,
  Zap,
  Eye
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActiveChefIndicatorProps {
  chefId: string;
  className?: string;
}

export function ActiveChefIndicator({ chefId, className }: ActiveChefIndicatorProps) {
  const [isActive, setIsActive] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);

  useEffect(() => {
    fetchChefActivity();
  }, [chefId]);

  const fetchChefActivity = async () => {
    try {
      const response = await fetch(`/api/chefs/${chefId}/activity`);
      const data = await response.json();
      
      setIsActive(data.isActive);
      setLastSeen(data.lastSeen ? new Date(data.lastSeen) : null);
      setResponseTime(data.avgResponseTime);
    } catch (error) {
      console.error('Error fetching chef activity:', error);
    }
  };

  const getActivityStatus = () => {
    if (isActive) return { status: 'online', color: 'bg-green-500', text: 'Online Now' };
    if (lastSeen && Date.now() - lastSeen.getTime() < 24 * 60 * 60 * 1000) {
      return { status: 'recent', color: 'bg-yellow-500', text: 'Recently Active' };
    }
    return { status: 'offline', color: 'bg-gray-400', text: 'Offline' };
  };

  const activity = getActivityStatus();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${activity.color} animate-pulse`} />
      <span className="text-xs text-gray-600">{activity.text}</span>
      {responseTime && (
        <span className="text-xs text-gray-500">
          Responds in ~{responseTime}min
        </span>
      )}
    </div>
  );
}

interface RequestPriorityProps {
  request: any;
  className?: string;
}

export function RequestPriority({ request, className }: RequestPriorityProps) {
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low');
  const [matchingChefs, setMatchingChefs] = useState(0);

  useEffect(() => {
    calculatePriority();
    fetchMatchingChefs();
  }, [request]);

  const calculatePriority = () => {
    let score = 0;

    // Urgency based on event date
    if (request.eventDate) {
      const daysUntilEvent = (new Date(request.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilEvent < 3) score += 3;
      else if (daysUntilEvent < 7) score += 2;
      else if (daysUntilEvent < 14) score += 1;
    }

    // Budget attractiveness
    if (request.budget) {
      if (request.budget >= 500) score += 2;
      else if (request.budget >= 200) score += 1;
    }

    // Location demand
    if (request.location) {
      // Could be enhanced with real location data
      score += 1;
    }

    // Proposal count (inverse - fewer proposals means more opportunity)
    const proposalCount = request.proposals?.length || 0;
    if (proposalCount === 0) score += 3;
    else if (proposalCount <= 2) score += 2;
    else if (proposalCount <= 5) score += 1;

    // Set priority based on score
    if (score >= 6) setPriority('high');
    else if (score >= 3) setPriority('medium');
    else setPriority('low');
  };

  const fetchMatchingChefs = async () => {
    try {
      const response = await fetch(`/api/requests/${request.id}/matching-chefs`);
      const data = await response.json();
      setMatchingChefs(data.count);
    } catch (error) {
      console.error('Error fetching matching chefs:', error);
    }
  };

  const getPriorityColor = () => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-600 border-red-200';
      case 'medium': return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'low': return 'bg-blue-50 text-blue-600 border-blue-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getPriorityText = () => {
    switch (priority) {
      case 'high': return 'High Priority';
      case 'medium': return 'Medium Priority';
      case 'low': return 'Standard';
      default: return 'Standard';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge className={getPriorityColor()}>
        <TrendingUp className="w-3 h-3 mr-1" />
        {getPriorityText()}
      </Badge>
      {matchingChefs > 0 && (
        <span className="text-xs text-gray-500">
          {matchingChefs} matching chefs
        </span>
      )}
    </div>
  );
}

interface MarketplaceHealthProps {
  className?: string;
}

export function MarketplaceHealth({ className }: MarketplaceHealthProps) {
  const [health, setHealth] = useState({
    activeChefs: 0,
    totalRequests: 0,
    avgResponseTime: 0,
    matchRate: 0,
    liquidityScore: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMarketplaceHealth();
  }, []);

  const fetchMarketplaceHealth = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/marketplace/health');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch marketplace health');
      }
      
      setHealth(data);
    } catch (error) {
      console.error('Error fetching marketplace health:', error);
      // Show empty state when API fails
      setHealth({
        activeChefs: 0,
        totalRequests: 0,
        avgResponseTime: 0,
        matchRate: 0,
        liquidityScore: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getLiquidityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getLiquidityText = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Marketplace Health</CardTitle>
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
          <Users className="w-5 h-5" />
          Marketplace Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Liquidity Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Liquidity Score</span>
            <span className={`text-sm font-bold ${getLiquidityColor(health.liquidityScore)}`}>
              {health.liquidityScore}% - {getLiquidityText(health.liquidityScore)}
            </span>
          </div>
          <Progress value={health.liquidityScore} className="h-2" />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{health.activeChefs}</div>
            <div className="text-xs text-blue-600">Active Chefs</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{health.totalRequests}</div>
            <div className="text-xs text-green-600">Open Requests</div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Avg Response Time</span>
            </div>
            <span className="text-sm font-medium">{health.avgResponseTime}min</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Match Rate</span>
            </div>
            <span className="text-sm font-medium">{health.matchRate}%</span>
          </div>
        </div>

        {/* Health Status */}
        <div className={`p-3 rounded-lg ${
          health.liquidityScore >= 60 ? 'bg-green-50' : 'bg-orange-50'
        }`}>
          <div className="flex items-center gap-2">
            {health.liquidityScore >= 60 ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-orange-600" />
            )}
            <div>
              <div className="font-medium text-sm">
                {health.liquidityScore >= 60 ? 'Healthy Marketplace' : 'Needs Attention'}
              </div>
              <div className="text-xs text-gray-600">
                {health.liquidityScore >= 60 
                  ? 'Good balance of supply and demand'
                  : 'Consider promoting to increase activity'
                }
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RequestBoostProps {
  requestId: string;
  className?: string;
}

export function RequestBoost({ requestId, className }: RequestBoostProps) {
  const [isBoosted, setIsBoosted] = useState(false);
  const [boostRemaining, setBoostRemaining] = useState(0);

  useEffect(() => {
    fetchBoostStatus();
  }, [requestId]);

  const fetchBoostStatus = async () => {
    try {
      const response = await fetch(`/api/requests/${requestId}/boost`);
      const data = await response.json();
      setIsBoosted(data.isBoosted);
      setBoostRemaining(data.remainingTime);
    } catch (error) {
      console.error('Error fetching boost status:', error);
    }
  };

  const handleBoost = async () => {
    try {
      const response = await fetch(`/api/requests/${requestId}/boost`, {
        method: 'POST',
      });
      const data = await response.json();
      setIsBoosted(true);
      setBoostRemaining(data.duration);
    } catch (error) {
      console.error('Error boosting request:', error);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isBoosted ? (
        <Badge className="bg-purple-50 text-purple-600">
          <Zap className="w-3 h-3 mr-1" />
          Boosted ({boostRemaining}h left)
        </Badge>
      ) : (
        <Button variant="outline" size="sm" onClick={handleBoost}>
          <Zap className="w-3 h-3 mr-1" />
          Boost Request
        </Button>
      )}
    </div>
  );
}
