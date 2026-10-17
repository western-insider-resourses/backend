import { query } from "../../database/db.js";
import { wrap } from "../../shared/utils.js";

export const createComment = wrap(async (req, res) => {
  const name = String(req.body.name || "")
    .trim()
    .slice(0, 60);
  const body = String(req.body.body || "")
    .trim()
    .slice(0, 2000);
  if (!name || !body)
    return res.status(400).json({ error: "Add your name and a comment." });
  const post = (
    await query("SELECT id FROM posts WHERE slug = $1", [req.params.slug])
  ).rows[0];
  if (!post) return res.status(404).json({ error: "Story not found." });
  let parentId: number | null = req.body.parentId
    ? Number(req.body.parentId)
    : null;
  if (parentId) {
    const ok = await query(
      "SELECT 1 FROM comments WHERE id = $1 AND post_id = $2",
      [parentId, post.id],
    );
    if (!ok.rowCount) parentId = null;
  }
  const { rows } = await query(
    `INSERT INTO comments (post_id, parent_id, name, body) VALUES ($1,$2,$3,$4)
     RETURNING id, parent_id, name, body, created_at`,
    [post.id, parentId, name, body],
  );
  res.status(201).json({ ...rows[0], replies: [] });
});
