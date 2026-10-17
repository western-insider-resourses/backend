import { pool } from "../../../database/db.js";
import { destroyImages } from "../../../services/cloudinary.js";
import { HttpError, wrap } from "../../../shared/utils.js";
import { insertImages, readPost } from "./helpers.js";

export const updatePost = wrap(async (req, res) => {
  const d = readPost(req.body);
  const client = await pool.connect();
  let removed: string[] = [];
  try {
    await client.query("BEGIN");
    const old = (
      await client.query(
        "SELECT public_id FROM post_images WHERE post_id = $1",
        [req.params.id],
      )
    ).rows;
    const { rowCount } = await client.query(
      `UPDATE posts SET title=$2, excerpt=$3, body=$4, category_id=$5, status=$6, featured=$7, author=$8,
         published_at = CASE WHEN $6 = 'published' THEN COALESCE(published_at, now()) ELSE published_at END,
         updated_at = now()
       WHERE id = $1`,
      [
        req.params.id,
        d.title,
        d.excerpt,
        d.body,
        d.categoryId,
        d.status,
        d.featured,
        d.author,
      ],
    );
    if (!rowCount) throw new HttpError(404, "Story not found.");
    await client.query("DELETE FROM post_images WHERE post_id = $1", [
      req.params.id,
    ]);
    await insertImages(client, req.params.id, d.images);
    await client.query("COMMIT");
    const keep = new Set<string | null | undefined>(
      d.images.map((i) => i.public_id),
    );
    removed = old
      .map((o) => o.public_id as string | null)
      .filter((id): id is string => !!id && !keep.has(id));
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  await destroyImages(removed);
  res.json({ ok: true });
});
