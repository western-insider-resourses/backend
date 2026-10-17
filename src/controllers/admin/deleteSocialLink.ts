import { query } from "../../database/db.js";
import { wrap } from "../../shared/utils.js";

export const deleteSocialLink = wrap(async (req, res) => {
  await query("DELETE FROM social_links WHERE id = $1", [req.params.id]);
  res.status(204).end();
});
