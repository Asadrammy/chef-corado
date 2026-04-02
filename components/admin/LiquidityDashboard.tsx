"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Bell, 
  MessageSquare, 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Zap,
  Phone,
  Mail
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface LiquidityDashboardProps {
  className?: string;
}

export function LiquidityDashboard({ className }: LiquidityDashboardProps) {
  const [newRequests, setNewRequests] = React.useState<any[]>([])
  const [unrespondedRequests, setUnrespondedRequests] = React.useState<any[]>([])
  const [activeChefs, setActiveChefs] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    fetchLiquidityData();
    // Auto-refresh every 30 seconds for real-time monitoring
    const interval = setInterval(fetchLiquidityData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiquidityData = async () => {
    try {
      const [requestsRes, chefsRes] = await Promise.all([
        fetch('/api/admin/requests/liquidity'),
        fetch('/api/admin/chefs/active')
      ]);

      const requestsData = await requestsRes.json();
      const chefsData = await chefsRes.json();

      setNewRequests(requestsData.newRequests || []);
      setUnrespondedRequests(requestsData.unrespondedRequests || []);
      setActiveChefs(chefsData.activeChefs || []);
    } catch (error) {
      console.error('Error fetching liquidity data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const notifyChefs = async (requestId: string) => {
    try {
      const response = await fetch(`/api/admin/requests/${requestId}/notify-chefs`, {
        method: 'POST',
      });
      
      if (response.ok) {
        // Update local state
        setNewRequests(prev => prev.filter(req => req.id !== requestId));
        setUnrespondedRequests(prev => prev.filter(req => req.id !== requestId));
      }
    } catch (error) {
      console.error('Error notifying chefs:', error);
    }
  };

  const highlightRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/admin/requests/${requestId}/highlight`, {
        method: 'POST',
      });
      
      if (response.ok) {
        // Update local state to show highlighted status
        setUnrespondedRequests(prev => 
          prev.map(req => 
            req.id === requestId ? { ...req, isHighlighted: true } : req
          )
        );
      }
    } catch (error) {
      console.error('Error highlighting request:', error);
    }
  };

  const contactChef = async (chefId: string) => {
    // This would open a contact modal or redirect to messaging
    window.open(`/dashboard/admin/messages/${chefId}`, '_blank');
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Liquidity Dashboard</CardTitle>
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
    <div className={`space-y-6 ${className}`}>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">New Requests</p>
                <p className="text-2xl font-bold text-red-900">{newRequests.length}</p>
                <p className="text-xs text-red-600">Need immediate attention</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Unresponded</p>
                <p className="text-2xl font-bold text-orange-900">{unrespondedRequests.length}</p>
                <p className="text-xs text-orange-600">Awaiting chef proposals</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Active Chefs</p>
                <p className="text-2xl font-bold text-green-900">{activeChefs.length}</p>
                <p className="text-xs text-green-600">Available now</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Match Rate</p>
                <p className="text-2xl font-bold text-blue-900">
                  {unrespondedRequests.length > 0 
                    ? Math.round(((unrespondedRequests.length - newRequests.length) / unrespondedRequests.length) * 100)
                    : 100}%
                </p>
                <p className="text-xs text-blue-600">Response success</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Requests - Urgent */}
      {newRequests.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              New Requests - Immediate Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {newRequests.map((request) => (
                <div key={request.id} className="bg-white p-4 rounded-lg border border-red-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-red-100 text-red-700">
                          <Zap className="w-3 h-3 mr-1" />
                          New
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900">{request.title || 'Event Request'}</h4>
                      <p className="text-sm text-gray-600 mb-2">{request.details}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(request.eventDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {request.location}
                        </span>
                        <span className="font-medium text-green-600">${request.budget}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => notifyChefs(request.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Bell className="w-3 h-3 mr-1" />
                        Notify Chefs
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => highlightRequest(request.id)}
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Highlight
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unresponded Requests */}
      {unrespondedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Unresponded Requests - Follow Up Needed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unrespondedRequests.map((request) => (
                <div key={request.id} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={request.isHighlighted ? "default" : "secondary"}>
                          {request.isHighlighted ? "Highlighted" : "Pending"}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900">{request.title || 'Event Request'}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(request.eventDate).toLocaleDateString()}
                        </span>
                        <span className="font-medium text-green-600">${request.budget}</span>
                        <span className="text-orange-600">
                          {request.proposalCount || 0} proposals
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => highlightRequest(request.id)}
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Boost Visibility
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Chefs */}
      {activeChefs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Active Chefs - Ready for Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeChefs.map((chef) => (
                <div key={chef.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={chef.profileImage} />
                      <AvatarFallback>{chef.name?.charAt(0) || 'C'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium text-gray-900">{chef.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{chef.cuisineType}</span>
                        <span>•</span>
                        <span>{chef.location}</span>
                        <span>•</span>
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Online
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Phone className="w-3 h-3 mr-1" />
                      Call
                    </Button>
                    <Button size="sm" variant="outline">
                      <Mail className="w-3 h-3 mr-1" />
                      Email
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {newRequests.length === 0 && unrespondedRequests.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              All Caught Up!
            </h3>
            <p className="text-gray-500 mb-6">
              No requests need immediate attention. The marketplace is running smoothly.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{activeChefs.length} active chefs</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span>Healthy liquidity</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
