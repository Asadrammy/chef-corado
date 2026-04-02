'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';
import { AdminControlPanel } from '@/components/admin/admin-control-panel';
import { ChefSearchResults } from '@/components/search/chef-search-results';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Users, 
  Search, 
  Settings, 
  Bell,
  DollarSign,
  MessageSquare,
  Calendar,
  Star
} from 'lucide-react';
import { Role } from '@/types';

export default function AdvancedDashboard() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [notifications, setNotifications] = useState(0);

  useEffect(() => {
    // Simulate notification count
    const interval = setInterval(() => {
      setNotifications(Math.floor(Math.random() * 5));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <p className="text-xl font-semibold">Sign in to access the advanced dashboard.</p>
          <p className="text-sm text-muted-foreground">Only authenticated admins, chefs, or clients can view analytics.</p>
        </div>
      </div>
    );
  }

  const currentUser = {
    id: session.user.id,
    role: (session.user.role ?? Role.CLIENT) as 'CLIENT' | 'CHEF' | 'ADMIN',
    name: session.user.name ?? 'User',
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">$12,450</p>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Bookings</p>
                <p className="text-2xl font-bold">24</p>
                <p className="text-xs text-muted-foreground">3 pending confirmation</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Chefs</p>
                <p className="text-2xl font-bold">156</p>
                <p className="text-xs text-muted-foreground">8 new this week</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold">4.8</p>
                <p className="text-xs text-muted-foreground">Based on 342 reviews</p>
              </div>
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: 'New booking', user: 'John Doe', time: '2 minutes ago', type: 'booking' },
                { action: 'Review submitted', user: 'Jane Smith', time: '15 minutes ago', type: 'review' },
                { action: 'Payment received', user: 'Bob Johnson', time: '1 hour ago', type: 'payment' },
                { action: 'Chef approved', user: 'Alice Brown', time: '2 hours ago', type: 'approval' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'booking' ? 'bg-blue-500' :
                      activity.type === 'review' ? 'bg-yellow-500' :
                      activity.type === 'payment' ? 'bg-green-500' :
                      'bg-purple-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.user}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Button className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <DollarSign className="h-4 w-4 mr-2" />
                Process Payouts
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                View Messages
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Platform Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {currentUser.name}. Here's what's happening on your platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell userId={currentUser.id} />
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
            {notifications > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1">
                {notifications}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsDashboard userId={currentUser.id} userRole={currentUser.role} />
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <ChefSearchResults />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          {currentUser.role === 'ADMIN' ? (
            <AdminControlPanel />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
                  <p className="text-muted-foreground">
                    You need admin privileges to access user management.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Click the notification bell in the header to view your notifications.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
