import { query } from "../../database/db.js";
import { wrap } from "../../shared/utils.js";
import { readAd } from "./adHelpers.js";

export const createAd = wrap(async (req, res) => {
  const { rows } = await query(
    `INSERT INTO ads (name, placement, image_url, image_public_id, link_url, html_code, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    readAd(req.body),
  );
  res.status(201).json(rows[0]);
});
