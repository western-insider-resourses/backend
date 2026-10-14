import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../src/db.js';
import { adminToken, api, result } from './helpers.js';

const q = vi.mocked(query);

beforeEach(() => { q.mockReset(); delete process.env.ADMIN_SIGNUP_CODE; });

describe('POST /api/auth/signup', () => {
  it('creates an admin and returns a working token', async () => {
    q.mockResolvedValueOnce(result([{ id: 5, email: 'new@site.com' }]) as never);
    const res = await api().post('/api/auth/signup').send({ email: 'New@Site.com', password: 'longenough1' });
    expect(res.status).toBe(201);
    expect(jwt.verify(res.body.token, 'test-secret')).toMatchObject({ id: 5, email: 'new@site.com' });
    const [, params] = q.mock.calls[0]!;
    expect(params![0]).toBe('new@site.com');
    expect(params![1]).not.toBe('longenough1'); // stored hashed
    expect(await bcrypt.compare('longenough1', params![1] as string)).toBe(true);
  });

  it('rejects short passwords', async () => {
    const res = await api().post('/api/auth/signup').send({ email: 'a@b.co', password: 'short' });
    expect(res.status).toBe(400);
    expect(q).not.toHaveBeenCalled();
  });

  it('returns 409 when the email is taken', async () => {
    q.mockResolvedValueOnce(result([]) as never);
    const res = await api().post('/api/auth/signup').send({ email: 'a@b.co', password: 'longenough1' });
    expect(res.status).toBe(409);
  });

  it('requires the invite code when one is configured', async () => {
    process.env.ADMIN_SIGNUP_CODE = 'letmein';
    const bad = await api().post('/api/auth/signup').send({ email: 'a@b.co', password: 'longenough1', inviteCode: 'wrong' });
    expect(bad.status).toBe(403);
    q.mockResolvedValueOnce(result([{ id: 1, email: 'a@b.co' }]) as never);
    const ok = await api().post('/api/auth/signup').send({ email: 'a@b.co', password: 'longenough1', inviteCode: 'letmein' });
    expect(ok.status).toBe(201);
  });

  it('reports whether an invite code is needed', async () => {
    expect((await api().get('/api/auth/signup-config')).body).toEqual({ inviteCodeRequired: false });
    process.env.ADMIN_SIGNUP_CODE = 'x';
    expect((await api().get('/api/auth/signup-config')).body).toEqual({ inviteCodeRequired: true });
  });
});

describe('POST /api/auth/login', () => {
  it('signs in with the right password', async () => {
    const password_hash = await bcrypt.hash('longenough1', 4);
    q.mockResolvedValueOnce(result([{ id: 2, email: 'a@b.co', password_hash }]) as never);
    const res = await api().post('/api/auth/login').send({ email: 'a@b.co', password: 'longenough1' });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('a@b.co');
    expect(res.body.token).toBeTruthy();
  });

  it('rejects a wrong password and an unknown email the same way', async () => {
    const password_hash = await bcrypt.hash('longenough1', 4);
    q.mockResolvedValueOnce(result([{ id: 2, email: 'a@b.co', password_hash }]) as never);
    const wrong = await api().post('/api/auth/login').send({ email: 'a@b.co', password: 'nope' });
    q.mockResolvedValueOnce(result([]) as never);
    const unknown = await api().post('/api/auth/login').send({ email: 'x@b.co', password: 'nope' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('validates input', async () => {
    expect((await api().post('/api/auth/login').send({})).status).toBe(400);
  });
});

describe('admin route protection', () => {
  it('blocks requests without a token', async () => {
    expect((await api().get('/api/admin/categories')).status).toBe(401);
  });
  it('blocks a token signed with the wrong secret', async () => {
    const forged = jwt.sign({ id: 1 }, 'other-secret');
    expect((await api().get('/api/admin/categories').set('Authorization', `Bearer ${forged}`)).status).toBe(401);
  });
  it('lets a valid token through', async () => {
    q.mockResolvedValueOnce(result([{ id: 1, name: 'Business', slug: 'business', position: 0, posts: 0 }]) as never);
    const res = await api().get('/api/admin/categories').set('Authorization', adminToken());
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('Business');
  });
});
