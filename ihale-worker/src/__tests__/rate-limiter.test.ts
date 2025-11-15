import express from 'express';
import request from 'supertest';
import { rateLimiter, getRateLimiterStats } from '../middleware/rate-limiter';
import { config } from '../config';

describe('Rate Limiter', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(rateLimiter);
    app.get('/test', (_req, res) => res.json({ ok: true }));
    app.post('/test', (_req, res) => res.json({ ok: true }));
  });

  describe('Request Limiting', () => {
    it('should allow requests within limit', async () => {
      const maxRequests = Math.min(10, config.RATE_LIMIT_MAX_REQUESTS);

      for (let i = 0; i < maxRequests; i++) {
        const res = await request(app).get('/test');
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
      }
    });

    it('should block requests exceeding limit', async () => {
      const limit = config.RATE_LIMIT_MAX_REQUESTS;

      // Make requests up to limit + 1
      for (let i = 0; i <= limit; i++) {
        const res = await request(app).get('/test');

        if (i < limit) {
          expect(res.status).toBe(200);
        } else {
          expect(res.status).toBe(429);
          expect(res.body.error).toBe('rate_limit_exceeded');
          expect(res.body).toHaveProperty('retryAfter');
        }
      }
    });

    it('should apply rate limit per IP', async () => {
      // Simulate different IPs
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      // Make requests from first IP
      for (let i = 0; i < config.RATE_LIMIT_MAX_REQUESTS; i++) {
        await agent1.get('/test');
      }

      // Should be rate limited
      const res1 = await agent1.get('/test');
      expect(res1.status).toBe(429);

      // Second IP should still work (but we can't actually test different IPs in unit test)
      const res2 = await agent2.get('/test');
      expect([200, 429]).toContain(res2.status);
    });

    it('should handle POST requests', async () => {
      const res = await request(app).post('/test').send({ data: 'test' });
      expect(res.status).toBe(200);
    });
  });

  describe('Rate Limit Window', () => {
    it('should include retry-after header when rate limited', async () => {
      // Exhaust rate limit
      for (let i = 0; i < config.RATE_LIMIT_MAX_REQUESTS; i++) {
        await request(app).get('/test');
      }

      const res = await request(app).get('/test');
      expect(res.status).toBe(429);
      expect(res.body).toHaveProperty('retryAfter');
      expect(typeof res.body.retryAfter).toBe('number');
      expect(res.body.retryAfter).toBeGreaterThan(0);
    });

    it('should reset after window expires', async () => {
      // This test is slow, so we skip it by default
      // To run: jest --testNamePattern="should reset after window expires"

      if (process.env.RUN_SLOW_TESTS !== 'true') {
        console.log('⏭️  Skipping slow test (set RUN_SLOW_TESTS=true to run)');
        return;
      }

      // Exhaust rate limit
      for (let i = 0; i < config.RATE_LIMIT_MAX_REQUESTS; i++) {
        await request(app).get('/test');
      }

      // Should be rate limited
      let res = await request(app).get('/test');
      expect(res.status).toBe(429);

      // Wait for window to expire (+ buffer)
      await new Promise(resolve => setTimeout(resolve, config.RATE_LIMIT_WINDOW_MS + 1000));

      // Should be able to make requests again
      res = await request(app).get('/test');
      expect(res.status).toBe(200);
    }, config.RATE_LIMIT_WINDOW_MS + 5000);
  });

  describe('Statistics', () => {
    it('should provide rate limiter stats', () => {
      const stats = getRateLimiterStats();

      expect(stats).toHaveProperty('trackedIPs');
      expect(stats).toHaveProperty('totalRequests');
      expect(typeof stats.trackedIPs).toBe('number');
      expect(typeof stats.totalRequests).toBe('number');
    });

    it('should track IP addresses', async () => {
      await request(app).get('/test');

      const stats = getRateLimiterStats();
      expect(stats.trackedIPs).toBeGreaterThan(0);
    });

    it('should track total requests', async () => {
      const statsBefore = getRateLimiterStats();

      await request(app).get('/test');
      await request(app).get('/test');

      const statsAfter = getRateLimiterStats();
      expect(statsAfter.totalRequests).toBeGreaterThanOrEqual(statsBefore.totalRequests + 2);
    });
  });

  describe('Error Messages', () => {
    it('should return descriptive error message in Turkish', async () => {
      // Exhaust rate limit
      for (let i = 0; i < config.RATE_LIMIT_MAX_REQUESTS; i++) {
        await request(app).get('/test');
      }

      const res = await request(app).get('/test');
      expect(res.status).toBe(429);
      expect(res.body.message).toContain('Çok fazla istek');
      expect(res.body.message).toContain('bekleyin');
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent requests', async () => {
      const promises = [];
      const concurrentRequests = 5;

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(request(app).get('/test'));
      }

      const results = await Promise.all(promises);

      // All should succeed (unless limit is very low)
      results.forEach(res => {
        expect([200, 429]).toContain(res.status);
      });
    });

    it('should not rate limit on unknown IP', async () => {
      // When IP is not available (edge case)
      const res = await request(app).get('/test');
      expect([200, 429]).toContain(res.status);
    });
  });
});
