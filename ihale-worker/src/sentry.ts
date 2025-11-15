/**
 * Sentry Error Tracking Integration
 *
 * Setup instructions:
 * 1. Sign up at https://sentry.io (free tier available)
 * 2. Create a new project (Node.js/Express)
 * 3. Copy your DSN
 * 4. Set environment variable: SENTRY_DSN=your-dsn-here
 * 5. Restart the server
 *
 * Features:
 * - Automatic error tracking
 * - Performance monitoring
 * - Release tracking
 * - User context
 */

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Express } from 'express';
import { config } from './config';

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENABLED = !!SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

/**
 * Initialize Sentry
 */
export function initSentry() {
  if (!SENTRY_ENABLED) {
    console.log('⚠️  Sentry disabled (SENTRY_DSN not set)');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,

    // Release tracking
    release: `ihale-worker@2.0.0`,

    // Performance monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Profiling
    profilesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    integrations: [
      new ProfilingIntegration(),
    ],

    // Filter out health check requests
    beforeSend(event, hint) {
      const url = hint.originalException as any;
      if (url?.config?.url?.includes('/health')) {
        return null; // Don't send health check errors
      }
      return event;
    },
  });

  console.log(`✅ Sentry initialized (environment: ${ENVIRONMENT})`);
}

/**
 * Mount Sentry middleware to Express app
 */
export function mountSentry(app: Express) {
  if (!SENTRY_ENABLED) {
    return;
  }

  // Request handler must be first middleware
  app.use(Sentry.Handlers.requestHandler());

  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());
}

/**
 * Mount Sentry error handler (must be after all routes)
 */
export function mountSentryErrorHandler(app: Express) {
  if (!SENTRY_ENABLED) {
    return;
  }

  // Error handler must be before any other error middleware and after all controllers
  app.use(Sentry.Handlers.errorHandler());
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (!SENTRY_ENABLED) {
    console.error('Error (Sentry disabled):', error);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!SENTRY_ENABLED) {
    console.log(`Message (Sentry disabled): [${level}] ${message}`);
    return;
  }

  Sentry.captureMessage(message, level);
}

/**
 * Set user context
 */
export function setUser(user: { id: string; username?: string; email?: string }) {
  if (!SENTRY_ENABLED) {
    return;
  }

  Sentry.setUser(user);
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  if (!SENTRY_ENABLED) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  return SENTRY_ENABLED;
}

export { Sentry };
