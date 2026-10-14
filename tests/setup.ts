import { vi } from 'vitest';

// No real database in tests: every module that imports db.ts gets these mocks.
vi.mock('../src/db.js', () => ({ query: vi.fn(), pool: { connect: vi.fn(), end: vi.fn() } }));
