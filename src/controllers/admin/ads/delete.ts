import { query } from "../../../database/db.js";
import { destroyImages } from "../../../services/cloudinary.js";
import { wrap } from "../../../shared/utils.js";

export const deleteAd = wrap(async (req, res) => {
  const ad = (
    await query("DELETE FROM ads WHERE id = $1 RETURNING image_public_id", [
      req.params.id,
    ])
  ).rows[0];
  if (ad) await destroyImages([ad.image_public_id]);
  res.status(204).end();
});
