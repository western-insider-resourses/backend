import { query } from "../../database/db.js";
import { wrap } from "../../shared/utils.js";
import { POST_FIELDS, POST_FROM } from "./postFields.js";

export const getPost = wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT ${POST_FIELDS}, p.body, p.category_id ${POST_FROM}
     WHERE p.slug = $1 AND p.status = 'published'`,
    [req.params.slug],
  );
  const post = rows[0];
  if (!post) return res.status(404).json({ error: "Story not found." });
  const images = (
    await query(
      "SELECT url, caption, position FROM post_images WHERE post_id = $1 ORDER BY position",
      [post.id],
    )
  ).rows;
  const related = (
    await query(
      `SELECT ${POST_FIELDS} ${POST_FROM}
     WHERE p.status = 'published' AND p.id <> $1
     ORDER BY (p.category_id = $2) DESC NULLS LAST, p.published_at DESC LIMIT 4`,
      [post.id, post.category_id],
    )
  ).rows;
  res.json({ ...post, images, related });
});
