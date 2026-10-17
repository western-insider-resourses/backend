import { query } from "../../../database/db.js";
import { destroyImages } from "../../../services/cloudinary.js";
import { wrap } from "../../../shared/utils.js";

export const deletePost = wrap(async (req, res) => {
  const ids = (
    await query("SELECT public_id FROM post_images WHERE post_id = $1", [
      req.params.id,
    ])
  ).rows;
  await query("DELETE FROM posts WHERE id = $1", [req.params.id]);
  await destroyImages(ids.map((i) => i.public_id));
  res.status(204).end();
});
