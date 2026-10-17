import { query, type Row } from "../../database/db.js";
import { wrap } from "../../shared/utils.js";

export const listComments = wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT m.id, m.parent_id, m.name, m.body, m.created_at
     FROM comments m JOIN posts p ON p.id = m.post_id
     WHERE p.slug = $1 AND m.status = 'visible' ORDER BY m.created_at`,
    [req.params.slug],
  );
  interface CommentNode extends Row {
    replies: CommentNode[];
  }
  const byId = new Map<number, CommentNode>(
    rows.map((r) => [r.id, { ...r, replies: [] }]),
  );
  const roots: CommentNode[] = [];
  for (const c of byId.values()) {
    const parent = c.parent_id ? byId.get(c.parent_id) : undefined;
    (parent ? parent.replies : roots).push(c);
  }
  res.json({ comments: roots.reverse(), total: rows.length });
});
