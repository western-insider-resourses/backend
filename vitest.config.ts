import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { setupFiles: ['tests/setup.ts'], environment: 'node', include: ['tests/**/*.test.ts'], env: { NODE_ENV: 'test', JWT_SECRET: 'test-secret' } },
});
