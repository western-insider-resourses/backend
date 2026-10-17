import { pool } from "../../database/db.js";
import { uniqueSlug, wrap } from "../../shared/utils.js";
import { insertImages, readPost } from "./postHelpers.js";

export const createPost = wrap(async (req, res) => {
  const d = readPost(req.body);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO posts (title, slug, excerpt, body, category_id, status, featured, author, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, CASE WHEN $6 = 'published' THEN now() END) RETURNING id, slug`,
      [
        d.title,
        uniqueSlug(d.title),
        d.excerpt,
        d.body,
        d.categoryId,
        d.status,
        d.featured,
        d.author,
      ],
    );
    await insertImages(client, rows[0].id, d.images);
    await client.query("COMMIT");
    res.status(201).json(rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});
