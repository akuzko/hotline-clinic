import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests hit real Postgres (`npm run db:up`); see docs/06-architecture.md.
    env: { NODE_ENV: 'test' },
    testTimeout: 10_000,
  },
});
