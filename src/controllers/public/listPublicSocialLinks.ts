import { query } from "../../database/db.js";
import { wrap } from "../../shared/utils.js";

export const listPublicSocialLinks = wrap(async (_req, res) => {
  const { rows } = await query(
    "SELECT id, platform, url FROM social_links WHERE active ORDER BY position, id",
  );
  res.json(rows);
});
