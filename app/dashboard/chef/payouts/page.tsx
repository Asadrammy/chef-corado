'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wallet, Calendar, TrendingUp, AlertCircle, Info } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { analytics } from '@/lib/analytics';
import { formatCurrency } from '@/lib/currency';
import { MARKETPLACE_PAYMENT_RULES, PLATFORM_COMMISSION_PERCENT } from '@/lib/marketplace-rules';

// Prevent static generation
export const dynamic = 'force-dynamic';

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'FROZEN' | 'ONBOARDING_REQUIRED';
  externalReference?: string;
  failureReason?: string;
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
  currency: string;
  availableBalance: number;
  pendingEarnings: number;
  totalEarnings: number;
  completedBookings: number;
  balancesByCurrency?: {
    currency: string;
    availableBalance: number;
    pendingEarnings: number;
    totalEarnings: number;
    totalPaidOut: number;
    totalPendingPayouts: number;
    completedBookings: number;
  }[];
  paymentSummaries?: {
    bookingId: string;
    reference: string;
    title: string;
    serviceTypeLabel?: string | null;
    requestMode?: string | null;
    countryCode?: string | null;
    eventDate: string;
    transactionDate: string;
    currency: string;
    customerPayment: number;
    platformCommission: number;
    commissionRatePercent: number;
    serviceChargeTaxRate?: number | null;
    serviceChargeTaxAmount?: number;
    serviceChargeTaxStatus?: string | null;
    serviceChargeTaxDeductionEnabled?: boolean;
    totalPlatformDeduction?: number;
    taxJurisdiction?: string | null;
    chefPayout: number;
    paymentStatus: string;
    payoutEligibilityStatus: string;
  }[];
  multiCurrencyNotice?: string;
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('GBP');
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
        setSelectedCurrency(balanceData.currency || balanceData.balancesByCurrency?.[0]?.currency || 'GBP');
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
      setError('Please enter a valid amount greater than 0');
      return;
    }

    const selectedBalance = balanceInfo?.balancesByCurrency?.find((item) => item.currency === selectedCurrency);
    const availableBalance = selectedBalance?.availableBalance ?? balanceInfo?.availableBalance ?? 0;

    if (!balanceInfo || amount > availableBalance) {
      setError(`Insufficient balance. You have ${formatCurrency(availableBalance, selectedCurrency)} available.`);
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
        body: JSON.stringify({ amount, currency: selectedCurrency }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to request payout');
      }

      const newPayout = await response.json();
      setPayouts(prev => [newPayout, ...prev]);
      setPayoutAmount('');
      setSuccess(true);
      analytics.track('payout_requested', undefined, { amount, currency: selectedCurrency });
      fetchData(); // Refresh balance
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error requesting payout:', error);
      setError(error instanceof Error ? error.message : 'Failed to request payout. Please try again.');
    } finally {
      setRequestingPayout(false);
    }
  };

  const balancesByCurrency = balanceInfo?.balancesByCurrency?.length
    ? balanceInfo.balancesByCurrency
    : balanceInfo
      ? [{ ...balanceInfo, currency: balanceInfo.currency || 'GBP', totalPaidOut: 0, totalPendingPayouts: 0 }]
      : [];
  const selectedBalance = balancesByCurrency.find((item) => item.currency === selectedCurrency) ?? balancesByCurrency[0];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>;
      case 'PROCESSING':
        return <Badge variant="default">Processing</Badge>;
      case 'APPROVED':
        return <Badge variant="default">Approved</Badge>;
      case 'PAID':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'FROZEN':
        return <Badge variant="secondary">On hold</Badge>;
      case 'ONBOARDING_REQUIRED':
        return <Badge variant="secondary">Stripe onboarding required</Badge>;
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
                      Money ready to withdraw after the {PLATFORM_COMMISSION_PERCENT}% ChefaChef marketplace commission
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Wallet className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{formatCurrency(selectedBalance?.availableBalance ?? balanceInfo.availableBalance, selectedBalance?.currency ?? balanceInfo.currency)}</div>
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
              <div className="text-2xl font-bold text-yellow-900">{formatCurrency(selectedBalance?.pendingEarnings ?? balanceInfo.pendingEarnings, selectedBalance?.currency ?? balanceInfo.currency)}</div>
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
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(selectedBalance?.totalEarnings ?? balanceInfo.totalEarnings, selectedBalance?.currency ?? balanceInfo.currency)}</div>
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
              <div className="text-2xl font-bold">{selectedBalance?.completedBookings ?? balanceInfo.completedBookings}</div>
              <p className="text-xs text-muted-foreground">
                Successfully completed
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {payouts.some((payout) => payout.status === 'ONBOARDING_REQUIRED') && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Complete Stripe onboarding to receive payout.</span>
            <Button asChild size="sm" variant="outline">
              <a href="/dashboard/chef/settings">Open payout settings</a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Request Payout</CardTitle>
          <CardDescription>
            Submit a manual payout request for administrator processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            {balancesByCurrency.length > 1 && (
              <div className="w-36">
                <label htmlFor="currency" className="text-sm font-medium">
                  Currency
                </label>
                <select
                  id="currency"
                  value={selectedCurrency}
                  onChange={(event) => setSelectedCurrency(event.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background"
                >
                  {balancesByCurrency.map((balance) => (
                    <option key={balance.currency} value={balance.currency}>{balance.currency}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex-1">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount ({selectedCurrency})
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                max={selectedBalance?.availableBalance ?? balanceInfo?.availableBalance ?? 0}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md"
                placeholder="Enter amount"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: {formatCurrency(selectedBalance?.availableBalance ?? balanceInfo?.availableBalance ?? 0, selectedCurrency)}
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
              Payouts are reviewed and processed manually by the platform team. A payout is only marked paid after an administrator records the external payment reference.
              {balanceInfo?.multiCurrencyNotice ? ` ${balanceInfo.multiCurrencyNotice}` : ''}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Summaries</CardTitle>
          <CardDescription>
            Customer payment, ChefaChef platform fee, internal tax tracking, and chef payout are shown from actual paid booking records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {MARKETPLACE_PAYMENT_RULES.chefInvoiceResponsibility} ChefaChef provides payment summaries and transfer breakdowns; it does not issue chef tax invoices on the chef&apos;s behalf.
            </AlertDescription>
          </Alert>

          {!balanceInfo?.paymentSummaries?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No paid booking payment summaries yet
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[1120px] text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Booking</th>
                    <th className="px-4 py-3 font-medium">Transaction</th>
                    <th className="px-4 py-3 font-medium">Customer paid</th>
                    <th className="px-4 py-3 font-medium">Service charge</th>
                    <th className="px-4 py-3 font-medium">Internal tax note</th>
                    <th className="px-4 py-3 font-medium">Total deduction</th>
                    <th className="px-4 py-3 font-medium">Chef payout</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {balanceInfo.paymentSummaries.map((summary) => (
                    <tr key={`${summary.bookingId}-${summary.transactionDate}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{summary.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Ref {summary.reference.slice(0, 10)} · {summary.serviceTypeLabel || summary.requestMode || 'Booking'} · {format(new Date(summary.eventDate), 'PP')}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{summary.currency}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(summary.transactionDate), 'PP p')}</p>
                      </td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(summary.customerPayment, summary.currency)}</td>
                      <td className="px-4 py-3">
                        <p>{formatCurrency(summary.platformCommission, summary.currency)}</p>
                        <p className="text-xs text-muted-foreground">{summary.commissionRatePercent}% ChefaChef commission</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{formatCurrency(summary.serviceChargeTaxAmount ?? 0, summary.currency)}</p>
                        <p className="text-xs text-muted-foreground">
                          {summary.serviceChargeTaxRate != null ? `${Math.round(summary.serviceChargeTaxRate * 100)}%` : 'No configured rate'} · {summary.serviceChargeTaxStatus ? summary.serviceChargeTaxStatus.replace(/_/g, ' ') : 'Legacy / not captured'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{formatCurrency(summary.totalPlatformDeduction ?? summary.platformCommission, summary.currency)}</p>
                        <p className="text-xs text-muted-foreground">
                          {summary.serviceChargeTaxDeductionEnabled ? 'Includes configured extra deduction' : 'Included within platform fee; no extra chef deduction'}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(summary.chefPayout, summary.currency)}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <Badge variant="secondary">{summary.paymentStatus}</Badge>
                          <p className="text-xs text-muted-foreground">{summary.payoutEligibilityStatus}</p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                      <span className="font-semibold">{formatCurrency(payout.amount, payout.currency || 'GBP')}</span>
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
                    {payout.externalReference && (
                      <div className="text-xs text-muted-foreground">
                        External reference: {payout.externalReference}
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
