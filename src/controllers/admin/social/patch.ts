import { query } from "../../../database/db.js";
import { wrap } from "../../../shared/utils.js";

export const patchSocialLink = wrap(async (req, res) => {
  await query("UPDATE social_links SET active = $2 WHERE id = $1", [
    req.params.id,
    !!req.body.active,
  ]);
  res.json({ ok: true });
});
