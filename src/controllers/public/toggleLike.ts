import { query } from "../../database/db.js";
import { wrap } from "../../shared/utils.js";

export const toggleLike = wrap(async (req, res) => {
  const { visitorId } = req.body;
  if (!visitorId) return res.status(400).json({ error: "Missing visitor id." });
  const post = (
    await query("SELECT id FROM posts WHERE slug = $1", [req.params.slug])
  ).rows[0];
  if (!post) return res.status(404).json({ error: "Story not found." });
  const removed = await query(
    "DELETE FROM likes WHERE post_id = $1 AND visitor_id = $2",
    [post.id, visitorId],
  );
  if (!removed.rowCount)
    await query("INSERT INTO likes (post_id, visitor_id) VALUES ($1,$2)", [
      post.id,
      visitorId,
    ]);
  const count = (
    await query("SELECT count(*)::int AS n FROM likes WHERE post_id = $1", [
      post.id,
    ])
  ).rows[0].n;
  res.json({ liked: !removed.rowCount, count });
});
