// Fallback Sentry implementation since @sentry/nextjs is not installed
// In production, install: npm install @sentry/nextjs

interface SentryConfig {
  dsn?: string;
  environment?: string;
  tracesSampleRate?: number;
  debug?: boolean;
}

const mockSentry = {
  init: (config: SentryConfig) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Sentry Mock] Would initialize with:', config);
    }
  },
  captureException: (error: Error) => {
    console.error('[Sentry Mock] Would capture exception:', error);
  },
  captureMessage: (message: string, level?: string) => {
    console.log(`[Sentry Mock] Would capture message: ${message} (${level})`);
  },
  setUser: (user: any) => {
    console.log('[Sentry Mock] Would set user:', user);
  },
  addBreadcrumb: (breadcrumb: any) => {
    console.log('[Sentry Mock] Would add breadcrumb:', breadcrumb);
  }
};

export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Try to import Sentry, fall back to mock if not available
    try {
      const Sentry = require('@sentry/nextjs');
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        debug: process.env.NODE_ENV === 'development',
      });
    } catch (error) {
      console.warn('Sentry not installed, using mock implementation');
      mockSentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        debug: process.env.NODE_ENV === 'development',
      });
    }
  }
}

export const Sentry = mockSentry;

export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error);
  if (context) {
    console.log('[Sentry Mock] Context:', context);
  }
}

export function captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info') {
  Sentry.captureMessage(message, level);
}

export function setUserContext(userId: string, email?: string, username?: string) {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
}

export function clearUserContext() {
  Sentry.setUser(null);
}

export function addBreadcrumb(message: string, category: string, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info') {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  });
}
