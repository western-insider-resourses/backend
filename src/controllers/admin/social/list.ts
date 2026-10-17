import { query } from "../../../database/db.js";
import { wrap } from "../../../shared/utils.js";

export const listSocialLinks = wrap(async (_req, res) => {
  res.json(
    (await query("SELECT * FROM social_links ORDER BY position, id")).rows,
  );
});
