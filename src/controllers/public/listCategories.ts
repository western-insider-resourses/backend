import { query } from "../../database/db.js";
import { wrap } from "../../shared/utils.js";

export const listCategories = wrap(async (_req, res) => {
  const { rows } = await query(
    "SELECT id, name, slug FROM categories ORDER BY position, name",
  );
  res.json(rows);
});
