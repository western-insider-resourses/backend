import { Router } from 'express';
import type { PoolClient } from 'pg';
import multer from 'multer';
import { pool, query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { uploadBuffer, destroyImages } from '../cloudinary.js';
import { bad, HttpError, intParam, slugify, uniqueSlug, wrap } from '../utils.js';
import { adsenseReport } from '../adsense.js';

const router = Router();
router.use(requireAdmin);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, cb) =>
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Only image files are allowed.')),
});

// ---------- uploads ----------
router.post('/upload', upload.array('images', 3), wrap(async (req, res) => {
  if (!Array.isArray(req.files) || !req.files.length) throw bad('Choose at least one image.');
  const results = await Promise.all((req.files as Express.Multer.File[]).map((f) => uploadBuffer(f.buffer)));
  res.json(results.map((r) => ({ url: r.secure_url, public_id: r.public_id })));
}));

router.post('/upload/remove', wrap(async (req, res) => {
  await destroyImages([req.body.public_id]);
  res.status(204).end();
}));

// ---------- posts ----------
interface ImageInput { url: string; public_id?: string | null; caption?: string }
interface PostInput {
  title: string; status: 'draft' | 'published'; images: ImageInput[]; excerpt: string;
  body: string; categoryId: number | null; featured: boolean; author: string;
}

function readPost(b: Record<string, unknown>): PostInput {
  const title = String(b.title || '').trim();
  if (!title) throw bad('Add a title.');
  const images: ImageInput[] = Array.isArray(b.images) ? (b.images as ImageInput[]).filter((i) => i?.url) : [];
  if (images.length < 1 || images.length > 3) throw bad('Each story needs 1 to 3 images.');
  const status = b.status === 'published' ? 'published' : 'draft';
  return {
    title, status, images,
    excerpt: String(b.excerpt || '').trim().slice(0, 400),
    body: String(b.body || '').trim(),
    categoryId: b.categoryId ? Number(b.categoryId) : null,
    featured: !!b.featured,
    author: String(b.author || 'Editorial Team').trim().slice(0, 80),
  };
}

const insertImages = (client: PoolClient, postId: string, images: ImageInput[]) =>
  Promise.all(images.map((img, i) =>
    client.query(
      'INSERT INTO post_images (post_id, url, public_id, caption, position) VALUES ($1,$2,$3,$4,$5)',
      [postId, img.url, img.public_id || null, String(img.caption || '').slice(0, 200), i])));

router.get('/posts', wrap(async (_req, res) => {
  const { rows } = await query(
    `SELECT p.id, p.title, p.slug, p.status, p.featured, p.views, p.published_at, p.created_at,
            c.name AS category_name,
            (SELECT url FROM post_images i WHERE i.post_id = p.id ORDER BY position LIMIT 1) AS cover,
            (SELECT count(*) FROM likes l WHERE l.post_id = p.id)::int AS likes,
            (SELECT count(*) FROM comments m WHERE m.post_id = p.id)::int AS comments
     FROM posts p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.created_at DESC`);
  res.json(rows);
}));

router.get('/posts/:id', wrap(async (req, res) => {
  const post = (await query('SELECT * FROM posts WHERE id = $1', [req.params.id])).rows[0];
  if (!post) return res.status(404).json({ error: 'Story not found.' });
  post.images = (await query(
    'SELECT url, public_id, caption FROM post_images WHERE post_id = $1 ORDER BY position', [post.id])).rows;
  res.json(post);
}));

router.post('/posts', wrap(async (req, res) => {
  const d = readPost(req.body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO posts (title, slug, excerpt, body, category_id, status, featured, author, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, CASE WHEN $6 = 'published' THEN now() END) RETURNING id, slug`,
      [d.title, uniqueSlug(d.title), d.excerpt, d.body, d.categoryId, d.status, d.featured, d.author]);
    await insertImages(client, rows[0].id, d.images);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}));

router.put('/posts/:id', wrap(async (req, res) => {
  const d = readPost(req.body);
  const client = await pool.connect();
  let removed: string[] = [];
  try {
    await client.query('BEGIN');
    const old = (await client.query('SELECT public_id FROM post_images WHERE post_id = $1', [req.params.id])).rows;
    const { rowCount } = await client.query(
      `UPDATE posts SET title=$2, excerpt=$3, body=$4, category_id=$5, status=$6, featured=$7, author=$8,
         published_at = CASE WHEN $6 = 'published' THEN COALESCE(published_at, now()) ELSE published_at END,
         updated_at = now()
       WHERE id = $1`,
      [req.params.id, d.title, d.excerpt, d.body, d.categoryId, d.status, d.featured, d.author]);
    if (!rowCount) throw new HttpError(404, 'Story not found.');
    await client.query('DELETE FROM post_images WHERE post_id = $1', [req.params.id]);
    await insertImages(client, req.params.id, d.images);
    await client.query('COMMIT');
    const keep = new Set<string | null | undefined>(d.images.map((i) => i.public_id));
    removed = old.map((o) => o.public_id as string | null).filter((id): id is string => !!id && !keep.has(id));
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  await destroyImages(removed);
  res.json({ ok: true });
}));

router.delete('/posts/:id', wrap(async (req, res) => {
  const ids = (await query('SELECT public_id FROM post_images WHERE post_id = $1', [req.params.id])).rows;
  await query('DELETE FROM posts WHERE id = $1', [req.params.id]);
  await destroyImages(ids.map((i) => i.public_id));
  res.status(204).end();
}));

// ---------- categories ----------
router.get('/categories', wrap(async (_req, res) => {
  const { rows } = await query(
    `SELECT c.*, (SELECT count(*) FROM posts p WHERE p.category_id = c.id)::int AS posts
     FROM categories c ORDER BY position, name`);
  res.json(rows);
}));

router.post('/categories', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw bad('Add a category name.');
  const { rows } = await query(
    `INSERT INTO categories (name, slug, position)
     VALUES ($1,$2,(SELECT COALESCE(max(position),0)+1 FROM categories))
     ON CONFLICT (slug) DO NOTHING RETURNING *`, [name, slugify(name)]);
  if (!rows[0]) throw bad('That category already exists.');
  res.status(201).json(rows[0]);
}));

router.put('/categories/:id', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw bad('Add a category name.');
  await query('UPDATE categories SET name=$2, slug=$3, position=COALESCE($4, position) WHERE id=$1',
    [req.params.id, name, slugify(name), req.body.position ?? null]);
  res.json({ ok: true });
}));

router.delete('/categories/:id', wrap(async (req, res) => {
  await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

// ---------- comments moderation ----------
router.get('/comments', wrap(async (_req, res) => {
  const { rows } = await query(
    `SELECT m.id, m.name, m.body, m.status, m.parent_id, m.created_at, p.title AS post_title, p.slug AS post_slug
     FROM comments m JOIN posts p ON p.id = m.post_id ORDER BY m.created_at DESC LIMIT 200`);
  res.json(rows);
}));
router.patch('/comments/:id', wrap(async (req, res) => {
  await query('UPDATE comments SET status = $2 WHERE id = $1', [req.params.id, req.body.status === 'hidden' ? 'hidden' : 'visible']);
  res.json({ ok: true });
}));
router.delete('/comments/:id', wrap(async (req, res) => {
  await query('DELETE FROM comments WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

// ---------- ads ----------
router.get('/ads', wrap(async (_req, res) => {
  const { rows } = await query(
    `SELECT a.*, (SELECT count(*) FROM events e WHERE e.type = 'click' AND e.target = 'ad:' || a.id)::int AS clicks
     FROM ads a ORDER BY a.id DESC`);
  res.json(rows);
}));

function readAd(b: Record<string, unknown>): unknown[] {
  const name = String(b.name || '').trim();
  if (!name) throw bad('Name the ad so you can find it later.');
  if (!['header', 'sidebar', 'in_article', 'footer'].includes(String(b.placement))) throw bad('Choose where the ad appears.');
  if (!b.image_url && !b.html_code) throw bad('Upload a banner or paste ad code.');
  return [name, b.placement, b.image_url || null, b.image_public_id || null, b.link_url || null, b.html_code || null, b.active !== false];
}

router.post('/ads', wrap(async (req, res) => {
  const { rows } = await query(
    `INSERT INTO ads (name, placement, image_url, image_public_id, link_url, html_code, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, readAd(req.body));
  res.status(201).json(rows[0]);
}));
router.put('/ads/:id', wrap(async (req, res) => {
  await query(
    `UPDATE ads SET name=$2, placement=$3, image_url=$4, image_public_id=$5, link_url=$6, html_code=$7, active=$8 WHERE id=$1`,
    [req.params.id, ...readAd(req.body)]);
  res.json({ ok: true });
}));
router.patch('/ads/:id', wrap(async (req, res) => {
  await query('UPDATE ads SET active = $2 WHERE id = $1', [req.params.id, !!req.body.active]);
  res.json({ ok: true });
}));
router.delete('/ads/:id', wrap(async (req, res) => {
  const ad = (await query('DELETE FROM ads WHERE id = $1 RETURNING image_public_id', [req.params.id])).rows[0];
  if (ad) await destroyImages([ad.image_public_id]);
  res.status(204).end();
}));

// ---------- social links ----------
router.get('/social', wrap(async (_req, res) => {
  res.json((await query('SELECT * FROM social_links ORDER BY position, id')).rows);
}));
router.post('/social', wrap(async (req, res) => {
  const { platform, url } = req.body;
  if (!platform || !/^https?:\/\//.test(url || '')) throw bad('Choose a platform and enter a full link starting with https://');
  const { rows } = await query(
    `INSERT INTO social_links (platform, url, position)
     VALUES ($1,$2,(SELECT COALESCE(max(position),0)+1 FROM social_links)) RETURNING *`, [platform, url]);
  res.status(201).json(rows[0]);
}));
router.patch('/social/:id', wrap(async (req, res) => {
  await query('UPDATE social_links SET active = $2 WHERE id = $1', [req.params.id, !!req.body.active]);
  res.json({ ok: true });
}));
router.delete('/social/:id', wrap(async (req, res) => {
  await query('DELETE FROM social_links WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

// ---------- analytics ----------
router.get('/analytics', wrap(async (req, res) => {
  const days = Math.min(Math.max(intParam(req.query.days, 30), 1), 365);
  const since = `created_at >= now() - make_interval(days => $1)`;
  const [totals, daily, topPosts, topClicks, sources, topPages, counts] = await Promise.all([
    query(`SELECT count(*) FILTER (WHERE type='view')::int AS views,
                  count(DISTINCT visitor_id)::int AS visitors,
                  count(*) FILTER (WHERE type='click')::int AS clicks
           FROM events WHERE ${since}`, [days]),
    query(`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                  count(*) FILTER (WHERE type='view')::int AS views,
                  count(*) FILTER (WHERE type='click')::int AS clicks
           FROM events WHERE ${since} GROUP BY 1 ORDER BY 1`, [days]),
    query(`SELECT p.title, p.slug, count(*)::int AS views
           FROM events e JOIN posts p ON p.id = e.post_id
           WHERE e.type='view' AND e.${since} GROUP BY p.id ORDER BY views DESC LIMIT 10`, [days]),
    query(`SELECT target, count(*)::int AS clicks FROM events
           WHERE type='click' AND target IS NOT NULL AND ${since}
           GROUP BY target ORDER BY clicks DESC LIMIT 15`, [days]),
    query(`SELECT COALESCE(NULLIF(referrer,''), 'Direct') AS source, count(*)::int AS views
           FROM events WHERE type='view' AND ${since} GROUP BY 1 ORDER BY views DESC LIMIT 8`, [days]),
    query(`SELECT path, count(*)::int AS views FROM events
           WHERE type='view' AND ${since} GROUP BY path ORDER BY views DESC LIMIT 10`, [days]),
    query(`SELECT (SELECT count(*) FROM posts WHERE status='published')::int AS posts,
                  (SELECT count(*) FROM comments)::int AS comments,
                  (SELECT count(*) FROM likes)::int AS likes`),
  ]);
  res.json({
    days, totals: totals.rows[0], daily: daily.rows, topPosts: topPosts.rows,
    topClicks: topClicks.rows, sources: sources.rows, topPages: topPages.rows, counts: counts.rows[0],
  });
}));

// ---------- AdSense earnings ----------
router.get('/adsense', wrap(async (req, res) => {
  res.json(await adsenseReport(req.query.range as string | undefined));
}));

export default router;
