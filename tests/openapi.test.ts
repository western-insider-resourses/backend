import { describe, expect, it } from 'vitest';
import { api } from './helpers.js';

describe('API documentation', () => {
  const documentedRoutes = [
    ['GET', '/health'],
    ['GET', '/docs/'],
    ['GET', '/docs/openapi.json'],
    ['GET', '/categories'],
    ['GET', '/posts'],
    ['GET', '/posts/trending'],
    ['GET', '/posts/{slug}'],
    ['GET', '/posts/{slug}/like'],
    ['POST', '/posts/{slug}/like'],
    ['GET', '/posts/{slug}/comments'],
    ['POST', '/posts/{slug}/comments'],
    ['GET', '/ads'],
    ['GET', '/social'],
    ['POST', '/track'],
    ['POST', '/auth/login'],
    ['POST', '/auth/signup'],
    ['GET', '/auth/session'],
    ['POST', '/auth/logout'],
    ['GET', '/auth/signup-config'],
    ['POST', '/admin/upload'],
    ['POST', '/admin/upload/remove'],
    ['GET', '/admin/posts'],
    ['GET', '/admin/posts/{id}'],
    ['POST', '/admin/posts'],
    ['PUT', '/admin/posts/{id}'],
    ['DELETE', '/admin/posts/{id}'],
    ['GET', '/admin/categories'],
    ['POST', '/admin/categories'],
    ['PUT', '/admin/categories/{id}'],
    ['DELETE', '/admin/categories/{id}'],
    ['GET', '/admin/comments'],
    ['PATCH', '/admin/comments/{id}'],
    ['DELETE', '/admin/comments/{id}'],
    ['GET', '/admin/ads'],
    ['POST', '/admin/ads'],
    ['PUT', '/admin/ads/{id}'],
    ['PATCH', '/admin/ads/{id}'],
    ['DELETE', '/admin/ads/{id}'],
    ['GET', '/admin/social'],
    ['POST', '/admin/social'],
    ['PATCH', '/admin/social/{id}'],
    ['DELETE', '/admin/social/{id}'],
    ['GET', '/admin/analytics'],
    ['GET', '/admin/adsense'],
  ] as const;

  it('serves the OpenAPI specification', async () => {
    const response = await api().get('/api/docs/openapi.json');
    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.3');
    expect(response.body.paths['/posts/{slug}/comments'].post).toBeDefined();
    expect(response.body.paths['/admin/posts'].post.security).toEqual([
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
