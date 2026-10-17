import { describe, expect, it } from 'vitest';
import { api } from './helpers.js';

describe('API documentation', () => {
  const documentedRoutes = [
    ['GET', '/health'],
    ['GET', '/docs/'],
    ['GET', '/docs/openapi.json'],
    ['GET', '/v1/categories'],
    ['GET', '/v1/posts'],
    ['GET', '/v1/posts/trending'],
    ['GET', '/v1/posts/{slug}'],
    ['GET', '/v1/posts/{slug}/like'],
    ['POST', '/v1/posts/{slug}/like'],
    ['GET', '/v1/posts/{slug}/comments'],
    ['POST', '/v1/posts/{slug}/comments'],
    ['GET', '/v1/ads'],
    ['GET', '/v1/social'],
    ['POST', '/v1/track'],
    ['POST', '/v1/auth/login'],
    ['POST', '/v1/auth/signup'],
    ['GET', '/v1/auth/session'],
    ['POST', '/v1/auth/logout'],
    ['GET', '/v1/auth/signup-config'],
    ['POST', '/v1/admin/upload'],
    ['POST', '/v1/admin/upload/remove'],
    ['GET', '/v1/admin/posts'],
    ['GET', '/v1/admin/posts/{id}'],
    ['POST', '/v1/admin/posts'],
    ['PUT', '/v1/admin/posts/{id}'],
    ['DELETE', '/v1/admin/posts/{id}'],
    ['GET', '/v1/admin/categories'],
    ['POST', '/v1/admin/categories'],
    ['PUT', '/v1/admin/categories/{id}'],
    ['DELETE', '/v1/admin/categories/{id}'],
    ['GET', '/v1/admin/comments'],
    ['PATCH', '/v1/admin/comments/{id}'],
    ['DELETE', '/v1/admin/comments/{id}'],
    ['GET', '/v1/admin/ads'],
    ['POST', '/v1/admin/ads'],
    ['PUT', '/v1/admin/ads/{id}'],
    ['PATCH', '/v1/admin/ads/{id}'],
    ['DELETE', '/v1/admin/ads/{id}'],
    ['GET', '/v1/admin/social'],
    ['POST', '/v1/admin/social'],
    ['PATCH', '/v1/admin/social/{id}'],
    ['DELETE', '/v1/admin/social/{id}'],
    ['GET', '/v1/admin/analytics'],
    ['GET', '/v1/admin/adsense'],
  ] as const;

  it('serves the OpenAPI specification', async () => {
    const response = await api().get('/api/docs/openapi.json');
    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.3');
    expect(response.body.servers[0].url).toBe('/api');
    expect(response.body.paths['/v1/posts/{slug}/comments'].post).toBeDefined();
    expect(response.body.paths['/v1/admin/posts'].post.security).toEqual([
      { adminCookie: [], adminRequestHeader: [] },
    ]);
  });

  it('documents every registered API route and method', async () => {
    const response = await api().get('/api/docs/openapi.json');
    for (const [method, path] of documentedRoutes) {
      expect(response.body.paths[path]?.[method.toLowerCase()], `${method} ${path}`).toBeDefined();
    }
  });

  it('serves the Swagger UI page', async () => {
    const response = await api().get('/api/docs/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Western Insider Resources API Docs');
    expect(response.text).toContain('swagger-ui-init.js');
  });
});
