import { query } from "../../database/db.js";
import { wrap } from "../../shared/utils.js";

export const getLike = wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT (SELECT count(*) FROM likes WHERE post_id = p.id)::int AS count,
            EXISTS (SELECT 1 FROM likes WHERE post_id = p.id AND visitor_id = $2) AS liked
     FROM posts p WHERE p.slug = $1`,
    [req.params.slug, req.query.visitorId || ""],
  );
  if (!rows[0]) return res.status(404).json({ error: "Story not found." });
  res.json(rows[0]);
});
