import { query } from "../../database/db.js";
import { wrap } from "../../shared/utils.js";

export const listPublicAds = wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, placement, image_url, link_url, html_code FROM ads
     WHERE active AND ($1::text IS NULL OR placement = $1) ORDER BY random()`,
    [req.query.placement || null],
  );
  res.json(rows);
});
