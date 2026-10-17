import { query } from "../../../database/db.js";
import { bad, slugify, wrap } from "../../../shared/utils.js";

export const createCategory = wrap(async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) throw bad("Add a category name.");
  const { rows } = await query(
    `INSERT INTO categories (name, slug, position)
     VALUES ($1,$2,(SELECT COALESCE(max(position),0)+1 FROM categories))
     ON CONFLICT (slug) DO NOTHING RETURNING *`,
    [name, slugify(name)],
  );
  if (!rows[0]) throw bad("That category already exists.");
  res.status(201).json(rows[0]);
});
