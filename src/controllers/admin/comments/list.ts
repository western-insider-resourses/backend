import { query } from "../../../database/db.js";
import { wrap } from "../../../shared/utils.js";

export const listComments = wrap(async (_req, res) => {
  const { rows } = await query(
    `SELECT m.id, m.name, m.body, m.status, m.parent_id, m.created_at, p.title AS post_title, p.slug AS post_slug
     FROM comments m JOIN posts p ON p.id = m.post_id ORDER BY m.created_at DESC LIMIT 200`,
  );
  res.json(rows);
});
