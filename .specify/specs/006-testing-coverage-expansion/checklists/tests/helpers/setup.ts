/**
 * Global test setup for Vitest
 * This file runs once before all tests
 */

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Set reasonable timeouts
import { beforeAll, afterAll } from 'vitest';

beforeAll(() => {
  // Global setup if needed
});

afterAll(() => {
  // Global cleanup if needed
});
