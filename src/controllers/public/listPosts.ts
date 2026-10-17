import { query } from "../../database/db.js";
import { intParam, wrap } from "../../shared/utils.js";
import { POST_FIELDS, POST_FROM } from "./postFields.js";

export const listPosts = wrap(async (req, res) => {
  const page = Math.max(intParam(req.query.page, 1), 1);
  const limit = Math.min(intParam(req.query.limit, 12), 30);
  const where = [`p.status = 'published'`];
  const params: unknown[] = [];
  if (req.query.category) {
    params.push(req.query.category);
    where.push(`c.slug = $${params.length}`);
  }
  if (req.query.q) {
    params.push(`%${req.query.q}%`);
    where.push(
      `(p.title ILIKE $${params.length} OR p.excerpt ILIKE $${params.length})`,
    );
  }
  const w = where.join(" AND ");
  const total = (
    await query(`SELECT count(*)::int AS n ${POST_FROM} WHERE ${w}`, params)
  ).rows[0].n;
  params.push(limit, (page - 1) * limit);
  const { rows } = await query(
    `SELECT ${POST_FIELDS} ${POST_FROM} WHERE ${w}
     ORDER BY p.featured DESC, p.published_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  res.json({
    posts: rows,
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
    total,
  });
});
