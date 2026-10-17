import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../src/database/db.js';
import { adminToken, api, result } from './helpers.js';

const q = vi.mocked(query);

beforeEach(() => { q.mockReset(); delete process.env.ADMIN_SIGNUP_CODE; });

describe('POST /api/auth/signup', () => {
  it('creates an admin and sets an HttpOnly session cookie, not a JSON token', async () => {
    q.mockResolvedValueOnce(result([{ id: 5, email: 'new@site.com' }]) as never);
    const res = await api().post('/api/auth/signup').send({ email: 'New@Site.com', password: 'longenough1' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/admin_token=.*HttpOnly/);
    const token = decodeURIComponent(res.headers['set-cookie'][0].match(/admin_token=([^;]+)/)![1]!);
    expect(jwt.verify(token, 'test-secret')).toMatchObject({ id: 5, email: 'new@site.com' });
    const [, params] = q.mock.calls[0]!;
    expect(params![0]).toBe('new@site.com');
    expect(params![1]).not.toBe('longenough1');
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
  it('signs in with the right password and sets a cookie', async () => {
    const password_hash = await bcrypt.hash('longenough1', 4);
    q.mockResolvedValueOnce(result([{ id: 2, email: 'a@b.co', password_hash }]) as never);
    const res = await api().post('/api/auth/login').send({ email: 'a@b.co', password: 'longenough1' });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('a@b.co');
    expect(res.body.token).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/admin_token=.*HttpOnly/);
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
  it('blocks requests without a cookie, including requests with only an auth header', async () => {
    expect((await api().get('/api/admin/categories')).status).toBe(401);
    expect((await api().get('/api/admin/categories').set('Authorization', 'invalid-token')).status).toBe(401);
  });

  it('blocks tokens signed with the wrong secret', async () => {
    const forged = jwt.sign({ id: 1 }, 'other-secret');
    const res = await api().get('/api/admin/categories')
      .set('Cookie', `admin_token=${forged}`).set('X-Admin-Request', '1');
    expect(res.status).toBe(401);
  });

  it('requires the custom request header for cookie authentication', async () => {
    const blocked = await api().get('/api/admin/categories').set('Cookie', `admin_token=${adminToken()}`);
    expect(blocked.status).toBe(403);
  });

  it('lets a valid cookie through', async () => {
    q.mockResolvedValueOnce(result([{ id: 1, name: 'Business', slug: 'business', position: 0, posts: 0 }]) as never);
    const res = await api().get('/api/admin/categories')
      .set('Cookie', `admin_token=${adminToken()}`)
      .set('X-Admin-Request', '1');
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('Business');
  });

  it('validates cookie sessions and clears the cookie on logout', async () => {
    const session = await api().get('/api/auth/session')
      .set('Cookie', `admin_token=${adminToken()}`)
      .set('X-Admin-Request', '1');
    expect(session.status).toBe(200);
    expect(session.body).toMatchObject({ email: 'a@b.co' });

    const logout = await api().post('/api/auth/logout');
    expect(logout.status).toBe(204);
    expect(logout.headers['set-cookie'][0]).toMatch(/admin_token=;/);
  });
});
