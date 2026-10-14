import { beforeEach, describe, expect, it, vi } from 'vitest';
import { query } from '../src/db.js';
import { adminToken, api, result } from './helpers.js';

const q = vi.mocked(query);
beforeEach(() => q.mockReset());

describe('public API', () => {
  it('lists categories (the niche tabs)', async () => {
    q.mockResolvedValueOnce(result([{ id: 1, name: 'Business', slug: 'business' }]) as never);
    const res = await api().get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, name: 'Business', slug: 'business' }]);
  });

  it('filters posts by niche slug using a bound parameter', async () => {
    q.mockResolvedValueOnce(result([{ n: 0 }]) as never).mockResolvedValueOnce(result([]) as never);
    const res = await api().get('/api/posts?category=technology&page=1');
    expect(res.status).toBe(200);
    const [sql, params] = q.mock.calls[0]!;
    expect(sql).toContain('c.slug = $1');
    expect(params![0]).toBe('technology');
    expect(res.body).toMatchObject({ posts: [], page: 1, pages: 1, total: 0 });
  });

  it('returns 404 for an unknown story', async () => {
    q.mockResolvedValueOnce(result([]) as never);
    expect((await api().get('/api/posts/nope')).status).toBe(404);
  });

  it('rejects empty comments', async () => {
    expect((await api().post('/api/posts/a/comments').send({ name: '', body: '' })).status).toBe(400);
  });
});

describe('admin categories (niches)', () => {
  it('creates a niche with a slug', async () => {
    q.mockResolvedValueOnce(result([{ id: 9, name: 'Real Estate', slug: 'real-estate', position: 6 }]) as never);
    const res = await api().post('/api/admin/categories').set('Authorization', adminToken()).send({ name: 'Real Estate' });
    expect(res.status).toBe(201);
    expect(q.mock.calls[0]![1]).toEqual(['Real Estate', 'real-estate']);
  });

  it('refuses duplicates', async () => {
    q.mockResolvedValueOnce(result([]) as never);
    const res = await api().post('/api/admin/categories').set('Authorization', adminToken()).send({ name: 'Business' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/);
  });
});
