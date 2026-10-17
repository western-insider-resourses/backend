import { vi } from 'vitest';

// No real database in tests: every module that imports db.ts gets these mocks.
vi.mock('../src/database/db.js', () => ({ query: vi.fn(), pool: { connect: vi.fn(), end: vi.fn() } }));
vi.mock('../src/services/cloudinary.js', () => ({
  uploadBuffer: vi.fn(),
  destroyImages: vi.fn(),
  optimizedUrl: vi.fn(),
}));
