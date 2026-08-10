'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Wallet, Calendar, Users, Star, TrendingUp, Activity } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

type CurrencyAmount = {
  currency: string;
  amount: number;
};

interface AnalyticsData {
  totalBookings?: number;
  totalSpending?: number;
  totalSpendingByCurrency?: CurrencyAmount[];
  totalEarnings?: number;
  earningsByCurrency?: CurrencyAmount[];
  totalRevenue?: number;
  revenueByCurrency?: CurrencyAmount[];
  totalUsers?: number;
  totalChefs?: number;
  totalClients?: number;
  completedBookings?: number;
  averageRating?: number;
  totalReviews?: number;
  proposalsSent?: number;
  activeBookings?: number;
  pendingProposals?: number;
  bookingsByStatus?: Record<string, number>;
  spendingTrends?: Array<{ date: string; amount: number; currency?: string }>;
  earningsTrends?: Array<{ date: string; amount: number; currency?: string }>;
  platformStats?: Record<string, number>;
}

interface AnalyticsDashboardProps {
  userId: string;
  userRole: 'CLIENT' | 'CHEF' | 'ADMIN';
}

export function AnalyticsDashboard({ userId, userRole }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [userId, userRole, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/analytics?userId=${userId}&role=${userRole}&timeRange=${timeRange}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Failed to load analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrencyBreakdown = (amounts?: CurrencyAmount[], fallbackAmount?: number) => {
    if (amounts?.length) {
      return amounts.map((item) => formatCurrency(item.amount, item.currency)).join(' / ');
    }

    if (fallbackAmount !== undefined) {
      return formatCurrency(fallbackAmount, 'GBP');
    }

    return 'No financial activity';
  };

  const renderMetricCards = () => {
    const cards = [];

    if (userRole === 'CLIENT') {
      cards.push(
        { title: 'Total Bookings', value: analytics.totalBookings || 0, icon: 'Calendar', color: 'text-blue-600' },
        { title: 'Total Spending', value: formatCurrencyBreakdown(analytics.totalSpendingByCurrency, analytics.totalSpending), icon: 'Wallet', color: 'text-green-600' },
      );
    } else if (userRole === 'CHEF') {
      cards.push(
        { title: 'Total Bookings', value: analytics.totalBookings || 0, icon: 'Calendar', color: 'text-blue-600' },
        { title: 'Completed', value: analytics.completedBookings || 0, icon: 'Activity', color: 'text-green-600' },
        { title: 'Total Earnings', value: formatCurrencyBreakdown(analytics.earningsByCurrency, analytics.totalEarnings), icon: 'Wallet', color: 'text-green-600' },
        { title: 'Average Rating', value: analytics.averageRating?.toFixed(1) || '0.0', icon: 'Star', color: 'text-yellow-600' },
        { title: 'Total Reviews', value: analytics.totalReviews || 0, icon: 'Users', color: 'text-purple-600' },
        { title: 'Proposals Sent', value: analytics.proposalsSent || 0, icon: 'TrendingUp', color: 'text-indigo-600' },
      );
    } else if (userRole === 'ADMIN') {
      cards.push(
        { title: 'Total Users', value: analytics.totalUsers || 0, icon: 'Users', color: 'text-blue-600' },
        { title: 'Total Chefs', value: analytics.totalChefs || 0, icon: 'Users', color: 'text-green-600' },
        { title: 'Total Clients', value: analytics.totalClients || 0, icon: 'Users', color: 'text-purple-600' },
        { title: 'Total Bookings', value: analytics.totalBookings || 0, icon: 'Calendar', color: 'text-orange-600' },
        { title: 'Platform Revenue', value: formatCurrencyBreakdown(analytics.revenueByCurrency, analytics.totalRevenue), icon: 'Wallet', color: 'text-green-600' },
        { title: 'Active Bookings', value: analytics.activeBookings || 0, icon: 'Activity', color: 'text-blue-600' },
        { title: 'Pending Proposals', value: analytics.pendingProposals || 0, icon: 'TrendingUp', color: 'text-yellow-600' },
      );
    }

    const iconMap: Record<string, any> = {
      Calendar,
      Wallet,
      Activity,
      Star,
      Users,
      TrendingUp,
    };

    return cards.map((card, index) => {
      const IconComponent = iconMap[card.icon];
      return (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
              <IconComponent className={`h-8 w-8 ${card.color}`} />
            </div>
          </CardContent>
        </Card>
      );
    });
  };

  const renderTrendsChart = () => {
    let data: any[] = [];
    let title = '';
    let dataKey = '';

    if (userRole === 'CLIENT' && analytics.spendingTrends) {
      data = analytics.spendingTrends;
      title = 'Spending Trends';
      dataKey = 'amount';
    } else if (userRole === 'CHEF' && analytics.earningsTrends) {
      data = analytics.earningsTrends;
      title = 'Earnings Trends';
      dataKey = 'amount';
    }

    if (data.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value, _name, item) => [
                  formatCurrency(Number(value), item?.payload?.currency || 'GBP'),
                  'Amount',
                ]}
              />
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ fill: '#8884d8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderStatusChart = () => {
    let data: any[] = [];
    let title = '';

    if (analytics.bookingsByStatus) {
      data = Object.entries(analytics.bookingsByStatus).map(([status, count]) => ({
        status,
        count,
      }));
      title = 'Bookings by Status';
    } else if (analytics.platformStats) {
      data = Object.entries(analytics.platformStats).map(([status, count]) => ({
        status,
        count,
      }));
      title = 'Platform Activity';
    }

    if (data.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {renderMetricCards()}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {renderTrendsChart()}
        {renderStatusChart()}
      </div>
    </div>
  );
}
