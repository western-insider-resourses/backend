import { query } from "../../../database/db.js";
import { wrap } from "../../../shared/utils.js";

export const patchAd = wrap(async (req, res) => {
  await query("UPDATE ads SET active = $2 WHERE id = $1", [
    req.params.id,
    !!req.body.active,
  ]);
  res.json({ ok: true });
});
