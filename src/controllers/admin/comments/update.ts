import { query } from "../../../database/db.js";
import { wrap } from "../../../shared/utils.js";

export const updateComment = wrap(async (req, res) => {
  await query("UPDATE comments SET status = $2 WHERE id = $1", [
    req.params.id,
    req.body.status === "hidden" ? "hidden" : "visible",
  ]);
  res.json({ ok: true });
});
