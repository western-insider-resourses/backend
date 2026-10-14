import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query, type Row } from '../db.js';
import { intParam, wrap } from '../utils.js';

const router = Router();

const POST_FIELDS = `
  p.id, p.title, p.slug, p.excerpt, p.featured, p.author, p.views, p.published_at,
  c.name AS category_name, c.slug AS category_slug,
  (SELECT url FROM post_images i WHERE i.post_id = p.id ORDER BY i.position LIMIT 1) AS cover,
  (SELECT count(*) FROM likes l WHERE l.post_id = p.id)::int AS likes,
  (SELECT count(*) FROM comments m WHERE m.post_id = p.id AND m.status = 'visible')::int AS comments`;

const POST_FROM = `FROM posts p LEFT JOIN categories c ON c.id = p.category_id`;

router.get('/categories', wrap(async (_req, res) => {
  const { rows } = await query('SELECT id, name, slug FROM categories ORDER BY position, name');
  res.json(rows);
}));

// GET /api/posts?category=crime&q=word&page=1&limit=12
router.get('/posts', wrap(async (req, res) => {
  const page = Math.max(intParam(req.query.page, 1), 1);
  const limit = Math.min(intParam(req.query.limit, 12), 30);
  const where = [`p.status = 'published'`];
  const params: unknown[] = [];
  if (req.query.category) { params.push(req.query.category); where.push(`c.slug = $${params.length}`); }
  if (req.query.q) { params.push(`%${req.query.q}%`); where.push(`(p.title ILIKE $${params.length} OR p.excerpt ILIKE $${params.length})`); }
  const w = where.join(' AND ');
  const total = (await query(`SELECT count(*)::int AS n ${POST_FROM} WHERE ${w}`, params)).rows[0].n;
  params.push(limit, (page - 1) * limit);
  const { rows } = await query(
    `SELECT ${POST_FIELDS} ${POST_FROM} WHERE ${w}
     ORDER BY p.featured DESC, p.published_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
  res.json({ posts: rows, page, pages: Math.max(Math.ceil(total / limit), 1), total });
}));

router.get('/posts/trending', wrap(async (_req, res) => {
  const { rows } = await query(
    `SELECT ${POST_FIELDS} ${POST_FROM}
     WHERE p.status = 'published' AND p.published_at > now() - interval '30 days'
     ORDER BY p.views DESC LIMIT 5`);
  res.json(rows);
}));

router.get('/posts/:slug', wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT ${POST_FIELDS}, p.body, p.category_id ${POST_FROM}
     WHERE p.slug = $1 AND p.status = 'published'`, [req.params.slug]);
  const post = rows[0];
  if (!post) return res.status(404).json({ error: 'Story not found.' });
  const images = (await query(
    'SELECT url, caption, position FROM post_images WHERE post_id = $1 ORDER BY position', [post.id])).rows;
  const related = (await query(
    `SELECT ${POST_FIELDS} ${POST_FROM}
     WHERE p.status = 'published' AND p.id <> $1
     ORDER BY (p.category_id = $2) DESC NULLS LAST, p.published_at DESC LIMIT 4`,
    [post.id, post.category_id])).rows;
  res.json({ ...post, images, related });
}));

// ----- likes (one per visitor, toggles) -----
router.get('/posts/:slug/like', wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT (SELECT count(*) FROM likes WHERE post_id = p.id)::int AS count,
            EXISTS (SELECT 1 FROM likes WHERE post_id = p.id AND visitor_id = $2) AS liked
     FROM posts p WHERE p.slug = $1`, [req.params.slug, req.query.visitorId || '']);
  if (!rows[0]) return res.status(404).json({ error: 'Story not found.' });
  res.json(rows[0]);
}));

router.post('/posts/:slug/like', rateLimit({ windowMs: 60_000, max: 30 }), wrap(async (req, res) => {
  const { visitorId } = req.body;
  if (!visitorId) return res.status(400).json({ error: 'Missing visitor id.' });
  const post = (await query('SELECT id FROM posts WHERE slug = $1', [req.params.slug])).rows[0];
  if (!post) return res.status(404).json({ error: 'Story not found.' });
  const removed = await query('DELETE FROM likes WHERE post_id = $1 AND visitor_id = $2', [post.id, visitorId]);
  if (!removed.rowCount) await query('INSERT INTO likes (post_id, visitor_id) VALUES ($1,$2)', [post.id, visitorId]);
  const count = (await query('SELECT count(*)::int AS n FROM likes WHERE post_id = $1', [post.id])).rows[0].n;
  res.json({ liked: !removed.rowCount, count });
}));

// ----- comments with replies -----
router.get('/posts/:slug/comments', wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT m.id, m.parent_id, m.name, m.body, m.created_at
     FROM comments m JOIN posts p ON p.id = m.post_id
     WHERE p.slug = $1 AND m.status = 'visible' ORDER BY m.created_at`, [req.params.slug]);
  interface CommentNode extends Row { replies: CommentNode[] }
  const byId = new Map<number, CommentNode>(rows.map((r) => [r.id, { ...r, replies: [] }]));
  const roots: CommentNode[] = [];
  for (const c of byId.values()) {
    const parent = c.parent_id ? byId.get(c.parent_id) : undefined;
    (parent ? parent.replies : roots).push(c);
  }
  res.json({ comments: roots.reverse(), total: rows.length });
}));

router.post('/posts/:slug/comments', rateLimit({ windowMs: 10 * 60_000, max: 15 }), wrap(async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 60);
  const body = String(req.body.body || '').trim().slice(0, 2000);
  if (!name || !body) return res.status(400).json({ error: 'Add your name and a comment.' });
  const post = (await query('SELECT id FROM posts WHERE slug = $1', [req.params.slug])).rows[0];
  if (!post) return res.status(404).json({ error: 'Story not found.' });
  let parentId: number | null = req.body.parentId ? Number(req.body.parentId) : null;
  if (parentId) {
    const ok = await query('SELECT 1 FROM comments WHERE id = $1 AND post_id = $2', [parentId, post.id]);
    if (!ok.rowCount) parentId = null;
  }
  const { rows } = await query(
    `INSERT INTO comments (post_id, parent_id, name, body) VALUES ($1,$2,$3,$4)
     RETURNING id, parent_id, name, body, created_at`, [post.id, parentId, name, body]);
  res.status(201).json({ ...rows[0], replies: [] });
}));

// ----- ads and social links managed from the admin -----
router.get('/ads', wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, placement, image_url, link_url, html_code FROM ads
     WHERE active AND ($1::text IS NULL OR placement = $1) ORDER BY random()`, [req.query.placement || null]);
  res.json(rows);
}));

router.get('/social', wrap(async (_req, res) => {
  const { rows } = await query(
    'SELECT id, platform, url FROM social_links WHERE active ORDER BY position, id');
  res.json(rows);
}));

// ----- analytics beacon -----
router.post('/track', rateLimit({ windowMs: 60_000, max: 120 }), wrap(async (req, res) => {
  const { type, path = '', target = null, visitorId = null, referrer = '' } = req.body;
  if (!['view', 'click'].includes(type)) return res.status(400).end();
  const slug: string | null = /^\/post\/([^/?#]+)/.exec(path)?.[1] || (target?.startsWith('post:') ? target.slice(5) : null);
  let postId: string | null = null;
  if (slug) postId = (await query('SELECT id FROM posts WHERE slug = $1', [slug])).rows[0]?.id || null;
  let ref: string | null = null;
  try { if (referrer) ref = new URL(referrer).hostname; } catch { /* ignore */ }
  await query(
    `INSERT INTO events (type, post_id, path, target, visitor_id, referrer) VALUES ($1,$2,$3,$4,$5,$6)`,
    [type, postId, String(path).slice(0, 300), target && String(target).slice(0, 120), visitorId, ref]);
  if (type === 'view' && postId && /^\/post\//.test(path)) {
    await query('UPDATE posts SET views = views + 1 WHERE id = $1', [postId]);
  }
  res.status(204).end();
}));

export default router;
