/**
 * Vitest Setup File
 * Global test configuration and mocks
 */

import { vi } from 'vitest';

// Mock environment variables
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-12345678901234567890123456789012345678901234567890';
process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

