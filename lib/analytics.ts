// Enhanced analytics tracking for growth engineering and conversion optimization
// Tracks key funnel events, user behavior, and marketplace health metrics

type EventType = 
  // Core funnel events
  | 'user_registered'
  | 'profile_completed'
  | 'request_created'
  | 'proposal_sent'
  | 'proposal_accepted'
  | 'booking_confirmed'
  | 'payment_completed'
  // Engagement events
  | 'chef_profile_viewed'
  | 'experience_viewed'
  | 'search_performed'
  | 'message_sent'
  | 'offer_sent'
  | 'offer_accepted'
  // Retention events
  | 'return_visit'
  | 'dashboard_viewed'
  | 'notification_clicked'
  | 'review_submitted'
  | 'repeat_booking'
  // Marketplace health events
  | 'chef_approved'
  | 'payout_requested'
  | 'dispute_created'
  | 'dispute_resolved';

interface AnalyticsEvent {
  type: EventType;
  timestamp: string;
  userId?: string;
  userRole?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  // Funnel tracking
  funnelStep?: string;
  conversionValue?: number;
  // User behavior tracking
  source?: string;
  medium?: string;
  campaign?: string;
}

interface FunnelMetrics {
  stepName: string;
  users: number;
  conversionRate: number;
  dropOffRate: number;
  avgTimeToComplete: number;
}

interface ConversionMetrics {
  totalConversions: number;
  conversionRate: number;
  revenue: number;
  avgOrderValue: number;
  funnelMetrics: FunnelMetrics[];
}

class GrowthAnalytics {
  private events: AnalyticsEvent[] = [];
  private maxEvents = 1000;
  private sessionId: string;
  private conversionFunnel: string[] = [
    'user_registered',
    'profile_completed', 
    'request_created',
    'proposal_sent',
    'proposal_accepted',
    'booking_confirmed',
    'payment_completed'
  ];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.trackPageView();
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  track(type: EventType, userId?: string, metadata?: Record<string, any>) {
    const event: AnalyticsEvent = {
      type,
      timestamp: new Date().toISOString(),
      userId,
      userRole: metadata?.userRole,
      sessionId: this.sessionId,
      metadata,
      funnelStep: this.getFunnelStep(type),
      conversionValue: this.getConversionValue(type, metadata),
      source: metadata?.source || 'direct',
      medium: metadata?.medium || 'none',
      campaign: metadata?.campaign || 'none'
    };

    this.events.push(event);

    // Keep only recent events in memory
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Growth Analytics] ${type}`, {
        userId,
        userRole: metadata?.userRole,
        funnelStep: event.funnelStep,
        conversionValue: event.conversionValue,
        metadata
      });
    }

    // Could be extended to send to analytics service
    // Example: sendToAnalyticsService(event);
  }

  private getFunnelStep(type: EventType): string | undefined {
    const stepIndex = this.conversionFunnel.indexOf(type);
    return stepIndex !== -1 ? this.conversionFunnel[stepIndex] : undefined;
  }

  private getConversionValue(type: EventType, metadata?: Record<string, any>): number {
    switch (type) {
      case 'booking_confirmed':
        return metadata?.totalPrice || 0;
      case 'payment_completed':
        return metadata?.amount || 0;
      case 'proposal_accepted':
        return metadata?.price || 0;
      default:
        return 0;
    }
  }

  private trackPageView() {
    if (typeof window !== 'undefined') {
      this.track('return_visit', undefined, {
        path: window.location.pathname,
        referrer: document.referrer,
        userAgent: navigator.userAgent
      });
    }
  }

  getConversionMetrics(): ConversionMetrics {
    const funnelMetrics = this.calculateFunnelMetrics();
    const totalConversions = this.events.filter(e => e.type === 'payment_completed').length;
    const totalRevenue = this.events
      .filter(e => e.type === 'payment_completed')
      .reduce((sum, e) => sum + (e.conversionValue || 0), 0);
    
    const totalUsers = new Set(this.events.filter(e => e.type === 'user_registered').map(e => e.userId)).size;
    const conversionRate = totalUsers > 0 ? (totalConversions / totalUsers) * 100 : 0;
    const avgOrderValue = totalConversions > 0 ? totalRevenue / totalConversions : 0;

    return {
      totalConversions,
      conversionRate,
      revenue: totalRevenue,
      avgOrderValue,
      funnelMetrics
    };
  }

  private calculateFunnelMetrics(): FunnelMetrics[] {
    return this.conversionFunnel.map((step, index) => {
      const stepEvents = this.events.filter(e => e.type === step);
      const uniqueUsers = new Set(stepEvents.map(e => e.userId)).size;
      
      const prevStepUsers = index > 0 
        ? new Set(this.events.filter(e => e.type === this.conversionFunnel[index - 1]).map(e => e.userId)).size
        : uniqueUsers;
      
      const conversionRate = prevStepUsers > 0 ? (uniqueUsers / prevStepUsers) * 100 : 100;
      const dropOffRate = 100 - conversionRate;
      
      const avgTimeToComplete = this.calculateAvgTimeToComplete(step, index);

      return {
        stepName: step,
        users: uniqueUsers,
        conversionRate,
        dropOffRate,
        avgTimeToComplete
      };
    });
  }

  private calculateAvgTimeToComplete(step: string, index: number): number {
    if (index === 0) return 0;
    
    const prevStep = this.conversionFunnel[index - 1];
    const userTimes: number[] = [];
    
    const users = new Set(this.events.filter(e => e.type === step).map(e => e.userId));
    
    users.forEach(userId => {
      const prevEvent = this.events.find(e => e.type === prevStep && e.userId === userId);
      const currentEvent = this.events.find(e => e.type === step && e.userId === userId);
      
      if (prevEvent && currentEvent) {
        const timeDiff = new Date(currentEvent.timestamp).getTime() - new Date(prevEvent.timestamp).getTime();
        userTimes.push(timeDiff);
      }
    });
    
    return userTimes.length > 0 ? userTimes.reduce((sum, time) => sum + time, 0) / userTimes.length : 0;
  }

  getEvents() {
    return [...this.events];
  }

  clearEvents() {
    this.events = [];
  }

  // Growth-specific methods
  getActivationRate(): number {
    const registeredUsers = new Set(this.events.filter(e => e.type === 'user_registered').map(e => e.userId)).size;
    const activatedUsers = new Set(this.events.filter(e => e.type === 'request_created' || e.type === 'proposal_sent').map(e => e.userId)).size;
    return registeredUsers > 0 ? (activatedUsers / registeredUsers) * 100 : 0;
  }

  getRetentionRate(days: number = 7): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const activeUsers = new Set(this.events.filter(e => 
      new Date(e.timestamp) >= cutoffDate && e.userId
    ).map(e => e.userId));
    
    const totalUsers = new Set(this.events.filter(e => e.type === 'user_registered').map(e => e.userId)).size;
    return totalUsers > 0 ? (activeUsers.size / totalUsers) * 100 : 0;
  }

  getMarketplaceHealth() {
    const totalChefs = new Set(this.events.filter(e => e.userRole === 'CHEF').map(e => e.userId)).size;
    const totalClients = new Set(this.events.filter(e => e.userRole === 'CLIENT').map(e => e.userId)).size;
    const totalBookings = this.events.filter(e => e.type === 'booking_confirmed').length;
    const avgResponseTime = this.calculateAvgResponseTime();
    
    return {
      chefClientRatio: totalClients > 0 ? totalChefs / totalClients : 0,
      totalBookings,
      avgResponseTime,
      marketplaceActivity: this.events.filter(e => 
        ['request_created', 'proposal_sent', 'booking_confirmed'].includes(e.type)
      ).length
    };
  }

  private calculateAvgResponseTime(): number {
    const responseTimes: number[] = [];
    
    const requests = this.events.filter(e => e.type === 'request_created');
    
    requests.forEach(request => {
      const proposal = this.events.find(e => 
        e.type === 'proposal_sent' && 
        e.metadata?.requestId === request.metadata?.requestId
      );
      
      if (proposal) {
        const responseTime = new Date(proposal.timestamp).getTime() - new Date(request.timestamp).getTime();
        responseTimes.push(responseTime);
      }
    });
    
    return responseTimes.length > 0 ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;
  }
}

// Singleton instance
const growthAnalytics = new GrowthAnalytics();

// Backward compatibility - create simple analytics instance
const analytics = new (class {
  private events: any[] = [];
  
  track(type: string, userId?: string, metadata?: any) {
    this.events.push({ type, userId, metadata, timestamp: new Date().toISOString() });
    console.log(`[Analytics] ${type}`, { userId, metadata });
  }
  
  getEvents() {
    return [...this.events];
  }
  
  clearEvents() {
    this.events = [];
  }
})();

export { growthAnalytics, analytics, type EventType, type AnalyticsEvent, type ConversionMetrics, type FunnelMetrics };
