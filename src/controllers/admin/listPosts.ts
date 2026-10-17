import { query } from "../../database/db.js";
import { wrap } from "../../shared/utils.js";

export const listPosts = wrap(async (_req, res) => {
  const { rows } = await query(
    `SELECT p.id, p.title, p.slug, p.status, p.featured, p.views, p.published_at, p.created_at,
            c.name AS category_name,
            (SELECT url FROM post_images i WHERE i.post_id = p.id ORDER BY position LIMIT 1) AS cover,
            (SELECT count(*) FROM likes l WHERE l.post_id = p.id)::int AS likes,
            (SELECT count(*) FROM comments m WHERE m.post_id = p.id)::int AS comments
     FROM posts p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.created_at DESC`,
  );
  res.json(rows);
});
