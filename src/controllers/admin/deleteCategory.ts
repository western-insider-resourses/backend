import { query } from "../../database/db.js";
import { wrap } from "../../shared/utils.js";

export const deleteCategory = wrap(async (req, res) => {
  await query("DELETE FROM categories WHERE id = $1", [req.params.id]);
  res.status(204).end();
});
