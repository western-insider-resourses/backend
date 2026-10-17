import { query } from "../../../database/db.js";
import { wrap } from "../../../shared/utils.js";
import { readAd } from "./helpers.js";

export const updateAd = wrap(async (req, res) => {
  await query(
    `UPDATE ads SET name=$2, placement=$3, image_url=$4, image_public_id=$5, link_url=$6, html_code=$7, active=$8 WHERE id=$1`,
    [req.params.id, ...readAd(req.body)],
  );
  res.json({ ok: true });
});
