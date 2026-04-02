'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, DollarSign, Calendar, TrendingUp, AlertCircle, Info } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { analytics } from '@/lib/analytics';

// Prevent static generation
export const dynamic = 'force-dynamic';

interface Payout {
  id: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  stripeTransferId?: string;
  processedAt?: string;
  createdAt: string;
  chef: {
    user: {
      name: string;
      email: string;
    };
  };
}

interface BalanceInfo {
  availableBalance: number;
  pendingEarnings: number;
  totalEarnings: number;
  completedBookings: number;
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [payoutsResponse, balanceResponse] = await Promise.all([
        fetch('/api/payouts'),
        fetch('/api/payouts/balance'),
      ]);

      if (payoutsResponse.ok) {
        const payoutsData = await payoutsResponse.json();
        setPayouts(payoutsData);
      }

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalanceInfo(balanceData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    const amount = parseFloat(payoutAmount);
    
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount greater than $0');
      return;
    }

    if (!balanceInfo || amount > balanceInfo.availableBalance) {
      setError(`Insufficient balance. You have $${balanceInfo?.availableBalance.toFixed(2) || '0.00'} available.`);
      return;
    }

    setRequestingPayout(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to request payout');
      }

      const newPayout = await response.json();
      setPayouts(prev => [newPayout, ...prev]);
      setPayoutAmount('');
      setSuccess(true);
      analytics.track('payout_requested', undefined, { amount });
      fetchData(); // Refresh balance
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error requesting payout:', error);
      setError(error instanceof Error ? error.message : 'Failed to request payout. Please try again.');
    } finally {
      setRequestingPayout(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>;
      case 'PROCESSING':
        return <Badge variant="default">Processing</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payouts</h1>
        <p className="text-muted-foreground">
          Manage your earnings and request withdrawals
        </p>
      </div>

      {balanceInfo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium text-green-900">Available Balance</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-green-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Money ready to withdraw after platform commission (10%)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">${balanceInfo.availableBalance.toFixed(2)}</div>
              <p className="text-xs text-green-700">
                Ready for withdrawal
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium text-yellow-900">Pending Earnings</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-yellow-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Earnings from bookings not yet completed
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <TrendingUp className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-900">${balanceInfo.pendingEarnings.toFixed(2)}</div>
              <p className="text-xs text-yellow-700">
                From active bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Gross earnings from all completed bookings
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${balanceInfo.totalEarnings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                All time earnings (after commission)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{balanceInfo.completedBookings}</div>
              <p className="text-xs text-muted-foreground">
                Successfully completed
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Request Payout</CardTitle>
          <CardDescription>
            Withdraw your available earnings to your bank account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount ($)
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                max={balanceInfo?.availableBalance || 0}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md"
                placeholder="Enter amount"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: ${balanceInfo?.availableBalance.toFixed(2) || '0.00'}
              </p>
            </div>
            <Button
              onClick={handleRequestPayout}
              disabled={requestingPayout || !payoutAmount || parseFloat(payoutAmount) <= 0}
              className="mt-6"
            >
              {requestingPayout ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Request Payout'
              )}
            </Button>
          </div>

          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                Payout request submitted successfully!
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Payouts are typically processed within 3-5 business days. You'll receive a notification when your payout is processed.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>
            Track your past and current payout requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payout history yet
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">${payout.amount.toFixed(2)}</span>
                      {getStatusBadge(payout.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Requested {formatDistanceToNow(new Date(payout.createdAt), { addSuffix: true })}
                    </div>
                    {payout.processedAt && (
                      <div className="text-sm text-muted-foreground">
                        Processed {formatDistanceToNow(new Date(payout.processedAt), { addSuffix: true })}
                      </div>
                    )}
                    {payout.stripeTransferId && (
                      <div className="text-xs text-muted-foreground">
                        Transfer ID: {payout.stripeTransferId}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
