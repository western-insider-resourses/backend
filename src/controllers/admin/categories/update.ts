import { query } from "../../../database/db.js";
import { bad, slugify, wrap } from "../../../shared/utils.js";

export const updateCategory = wrap(async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) throw bad("Add a category name.");
  await query(
    "UPDATE categories SET name=$2, slug=$3, position=COALESCE($4, position) WHERE id=$1",
    [req.params.id, name, slugify(name), req.body.position ?? null],
  );
  res.json({ ok: true });
});
