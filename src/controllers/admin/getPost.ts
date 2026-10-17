import { query } from "../../database/db.js";
import { wrap } from "../../shared/utils.js";

export const getPost = wrap(async (req, res) => {
  const post = (
    await query("SELECT * FROM posts WHERE id = $1", [req.params.id])
  ).rows[0];
  if (!post) return res.status(404).json({ error: "Story not found." });
  post.images = (
    await query(
      "SELECT url, public_id, caption FROM post_images WHERE post_id = $1 ORDER BY position",
      [post.id],
    )
  ).rows;
  res.json(post);
});
