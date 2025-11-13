import { test, expect } from '@playwright/test';

test.describe('API Health Checks', () => {
  test('should respond to health check endpoint', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('should return cache stats', async ({ request }) => {
    const response = await request.get('/api/cache/stats');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('totalEntries');
    expect(data.data).toHaveProperty('cacheEfficiency');
  });

  test('should return metrics data', async ({ request }) => {
    const response = await request.get('/api/metrics');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });
});

test.describe('API Rate Limiting', () => {
  test('should handle rate limit gracefully', async ({ request }) => {
    // This test is for checking if rate limiting is properly configured
    // Make multiple requests quickly
    const requests = Array.from({ length: 5 }, () => 
      request.get('/api/metrics')
    );
    
    const responses = await Promise.all(requests);
    
    // At least first few should succeed
    const successfulResponses = responses.filter(r => r.ok());
    expect(successfulResponses.length).toBeGreaterThan(0);
  });
});

test.describe('API Error Handling', () => {
  test('should return 404 for non-existent endpoints', async ({ request }) => {
    const response = await request.get('/api/non-existent-endpoint');
    
    expect(response.status()).toBe(404);
  });

  test('should handle malformed JSON in POST requests', async ({ request }) => {
    const response = await request.post('/api/ai/deep-analysis', {
      data: 'invalid json string',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});






