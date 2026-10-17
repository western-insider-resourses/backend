import { query } from "../../../database/db.js";
import { wrap } from "../../../shared/utils.js";

export const deleteComment = wrap(async (req, res) => {
  await query("DELETE FROM comments WHERE id = $1", [req.params.id]);
  res.status(204).end();
});
