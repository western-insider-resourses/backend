import { query } from "../../../database/db.js";
import { wrap } from "../../../shared/utils.js";

export const listCategories = wrap(async (_req, res) => {
  const { rows } = await query(
    `SELECT c.*, (SELECT count(*) FROM posts p WHERE p.category_id = c.id)::int AS posts
     FROM categories c ORDER BY position, name`,
  );
  res.json(rows);
});
