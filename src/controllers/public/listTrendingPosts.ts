import { query } from "../../database/db.js";
import { wrap } from "../../shared/utils.js";
import { POST_FIELDS, POST_FROM } from "./postFields.js";

export const listTrendingPosts = wrap(async (_req, res) => {
  const { rows } = await query(
    `SELECT ${POST_FIELDS} ${POST_FROM}
     WHERE p.status = 'published' AND p.published_at > now() - interval '30 days'
     ORDER BY p.views DESC LIMIT 5`,
  );
  res.json(rows);
});
