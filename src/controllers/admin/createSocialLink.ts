import { query } from "../../database/db.js";
import { bad, wrap } from "../../shared/utils.js";

export const createSocialLink = wrap(async (req, res) => {
  const { platform, url } = req.body;
  if (!platform || !/^https?:\/\//.test(url || ""))
    throw bad("Choose a platform and enter a full link starting with https://");
  const { rows } = await query(
    `INSERT INTO social_links (platform, url, position)
     VALUES ($1,$2,(SELECT COALESCE(max(position),0)+1 FROM social_links)) RETURNING *`,
    [platform, url],
  );
  res.status(201).json(rows[0]);
});
