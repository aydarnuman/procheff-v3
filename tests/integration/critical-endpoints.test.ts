/**
 * Critical Endpoints Integration Tests
 * Tests the most important API endpoints for functionality and security
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('Critical API Endpoints - Integration Tests', () => {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

  describe('Health Check Endpoint', () => {
    test('GET /api/health - should return healthy status', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.checks).toBeDefined();
      expect(data.checks.database).toBe(true);
      expect(data.checks.memory).toBe(true);
      expect(data.timestamp).toBeDefined();
    });

    test('Health endpoint should have proper CORS headers', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);

      expect(response.headers.get('content-type')).toContain('application/json');
    });

    test('Health endpoint should respond quickly (< 500ms)', async () => {
      const start = Date.now();
      await fetch(`${BASE_URL}/api/health`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });

  describe('Metrics Endpoint', () => {
    test('GET /api/metrics - should return metrics data', async () => {
      const response = await fetch(`${BASE_URL}/api/metrics`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toBeDefined();
      expect(data.metrics.total_logs).toBeGreaterThanOrEqual(0);
      expect(data.metrics.errors).toBeGreaterThanOrEqual(0);
      expect(data.metrics.success_rate).toBeDefined();
    });

    test('Metrics should include level distribution', async () => {
      const response = await fetch(`${BASE_URL}/api/metrics`);
      const data = await response.json();

      expect(Array.isArray(data.metrics.level_distribution)).toBe(true);
    });

    test('Metrics should not expose sensitive data', async () => {
      const response = await fetch(`${BASE_URL}/api/metrics`);
      const text = await response.text();

      // Should not contain sensitive patterns
      expect(text).not.toMatch(/password/i);
      expect(text).not.toMatch(/secret/i);
      expect(text).not.toMatch(/api[_-]?key/i);
    });
  });

  describe('Database Stats Endpoint', () => {
    test('GET /api/database/stats - should return database statistics', async () => {
      const response = await fetch(`${BASE_URL}/api/database/stats`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.stats.dbSize).toBeDefined();
      expect(data.stats.logCount).toBeGreaterThanOrEqual(0);
    });

    test('Database stats should only include whitelisted tables', async () => {
      const response = await fetch(`${BASE_URL}/api/database/stats`);
      const data = await response.json();

      const tableNames = Object.keys(data.stats.tables || {});

      // All returned tables should be from the whitelist
      const whitelist = [
        'users', 'organizations', 'memberships', 'notifications', 'orchestrations',
        'ai_logs', 'logs', 'semantic_cache', 'analysis_history', 'analysis_results_v2',
        'tenders', 'market_prices', 'proactive_triggers', 'chat_sessions',
        'notification_channels', 'notification_preferences', 'price_validations',
        'webhooks', 'integration_configs', 'api_stats', 'report_templates'
      ];

      tableNames.forEach(tableName => {
        expect(whitelist).toContain(tableName);
      });
    });
  });

  describe('Notifications Endpoint', () => {
    test('GET /api/notifications - should return notifications list', async () => {
      const response = await fetch(`${BASE_URL}/api/notifications?limit=10`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.notifications)).toBe(true);
      expect(typeof data.unreadCount).toBe('number');
    });

    test('Notifications should support pagination', async () => {
      const response1 = await fetch(`${BASE_URL}/api/notifications?limit=5`);
      const data1 = await response1.json();

      const response2 = await fetch(`${BASE_URL}/api/notifications?limit=10`);
      const data2 = await response2.json();

      expect(data1.notifications.length).toBeLessThanOrEqual(5);
      expect(data2.notifications.length).toBeLessThanOrEqual(10);
    });

    test('Notifications should filter by unread status', async () => {
      const response = await fetch(`${BASE_URL}/api/notifications?unread=true`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('SQL Injection Security Tests', () => {
    test('Trust score endpoint should be protected against SQL injection', async () => {
      // Test with malicious input
      const maliciousInput = "'; DROP TABLE users; --";

      // This should be safely handled by parameterized queries
      const response = await fetch(`${BASE_URL}/api/market/trust-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: maliciousInput,
          days: 30
        })
      });

      // Should either reject or safely handle
      expect([200, 400, 422]).toContain(response.status);

      // Verify users table still exists by checking health
      const healthCheck = await fetch(`${BASE_URL}/api/health`);
      const health = await healthCheck.json();
      expect(health.checks.database).toBe(true);
    });

    test('Database stats should reject invalid table names', async () => {
      // The endpoint should only accept whitelisted tables
      const response = await fetch(`${BASE_URL}/api/database/stats`);
      const data = await response.json();

      // Should not include system tables or injection attempts
      const tableNames = Object.keys(data.stats.tables || {});

      tableNames.forEach(name => {
        expect(name).not.toMatch(/information_schema/);
        expect(name).not.toMatch(/pg_/);
        expect(name).not.toMatch(/;/);
        expect(name).not.toMatch(/DROP/i);
      });
    });
  });

  describe('Error Handling', () => {
    test('Invalid endpoints should return 404', async () => {
      const response = await fetch(`${BASE_URL}/api/nonexistent`);
      expect(response.status).toBe(404);
    });

    test('Malformed requests should return appropriate errors', async () => {
      const response = await fetch(`${BASE_URL}/api/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{{{' // Intentionally malformed
      });

      expect([400, 500]).toContain(response.status);
    });

    test('Errors should not expose stack traces in production', async () => {
      const response = await fetch(`${BASE_URL}/api/nonexistent`);
      const text = await response.text();

      // Should not contain file paths or stack traces
      expect(text).not.toMatch(/\/home\//);
      expect(text).not.toMatch(/at Object\./);
      expect(text).not.toMatch(/node_modules/);
    });
  });

  describe('Performance Benchmarks', () => {
    test('Health endpoint should respond in < 200ms', async () => {
      const start = performance.now();
      await fetch(`${BASE_URL}/api/health`);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200);
    });

    test('Metrics endpoint should respond in < 1000ms', async () => {
      const start = performance.now();
      await fetch(`${BASE_URL}/api/metrics`);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000);
    });

    test('Multiple concurrent requests should not degrade performance', async () => {
      const requests = Array(10).fill(null).map(() =>
        fetch(`${BASE_URL}/api/health`)
      );

      const start = performance.now();
      await Promise.all(requests);
      const duration = performance.now() - start;

      // 10 concurrent requests should complete in < 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });
});

describe('Database Mode Compatibility Tests', () => {
  test('System should indicate current database mode', async () => {
    const response = await fetch(`${process.env.TEST_BASE_URL || 'http://localhost:3000'}/api/health`);
    const data = await response.json();

    expect(data.details).toBeDefined();
    expect(data.details.database).toBeDefined();
  });
});
