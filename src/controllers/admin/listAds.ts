import { query } from "../../database/db.js";
import { wrap } from "../../shared/utils.js";

export const listAds = wrap(async (_req, res) => {
  const { rows } = await query(
    `SELECT a.*, (SELECT count(*) FROM events e WHERE e.type = 'click' AND e.target = 'ad:' || a.id)::int AS clicks
     FROM ads a ORDER BY a.id DESC`,
  );
  res.json(rows);
});
