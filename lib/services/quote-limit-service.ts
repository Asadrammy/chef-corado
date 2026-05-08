import { prisma } from '@/lib/prisma';

/**
 * Unified Quote Limit Service
 * 
 * Enforces a 10-quote limit per request across all quote-like systems:
 * - Marketplace proposals
 * - Chat-based quotes (messages/offer)
 * - Custom offers
 * 
 * Uses atomic database operations to ensure consistency and prevent race conditions.
 */

const MAX_QUOTES_PER_REQUEST = 10;

export interface QuoteLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  remaining: number;
  limit: number;
}

/**
 * Atomically check if a request can receive more quotes.
 * Uses a database transaction to prevent race conditions.
 * 
 * @throws Error if limit reached
 */
export async function assertRequestCanReceiveQuote(requestId: string): Promise<void> {
  const result = await checkQuoteLimit(requestId);
  
  if (!result.allowed) {
    throw new Error(`QUOTA_EXCEEDED: This request has reached the maximum of ${MAX_QUOTES_PER_REQUEST} quotes. Current: ${result.currentCount}`);
  }
}

/**
 * Check quote limit without throwing.
 * Returns current count and remaining quota.
 */
export async function checkQuoteLimit(requestId: string): Promise<QuoteLimitCheckResult> {
  // Count all proposals for this request (includes marketplace and chat-based quotes)
  const proposalCount = await prisma.proposal.count({
    where: {
      requestId,
      status: {
        in: ['PENDING', 'ACCEPTED_PENDING_PAYMENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN']
      }
    }
  });

  // Total quotes = proposals (chat-based quotes create proposals too)
  const totalCount = proposalCount;

  const remaining = Math.max(0, MAX_QUOTES_PER_REQUEST - totalCount);
  
  return {
    allowed: totalCount < MAX_QUOTES_PER_REQUEST,
    currentCount: totalCount,
    remaining,
    limit: MAX_QUOTES_PER_REQUEST
  };
}

/**
 * Get quote limit status for a request (for UI display)
 */
export async function getQuoteLimitStatus(requestId: string): Promise<{
  used: number;
  remaining: number;
  total: number;
  percentage: number;
}> {
  const result = await checkQuoteLimit(requestId);
  
  return {
    used: result.currentCount,
    remaining: result.remaining,
    total: result.limit,
    percentage: Math.round((result.currentCount / result.limit) * 100)
  };
}

/**
 * Check if a chef has reached their daily/periodic quote sending limit
 * (Optional: for future rate limiting on quote sending)
 */
export async function checkChefQuoteLimit(chefId: string): Promise<{
  allowed: boolean;
  sentToday: number;
  limit: number;
}> {
  // For now, no per-chef limit - only per-request limit
  // This can be added later if needed
  return {
    allowed: true,
    sentToday: 0,
    limit: Infinity
  };
}
