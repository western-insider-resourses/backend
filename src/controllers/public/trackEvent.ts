import { query } from "../../database/db.js";
import { wrap } from "../../shared/utils.js";

export const trackEvent = wrap(async (req, res) => {
  const {
    type,
    path = "",
    target = null,
    visitorId = null,
    referrer = "",
  } = req.body;
  if (!["view", "click"].includes(type)) return res.status(400).end();
  const slug: string | null =
    /^\/post\/([^/?#]+)/.exec(path)?.[1] ||
    (target?.startsWith("post:") ? target.slice(5) : null);
  let postId: string | null = null;
  if (slug)
    postId =
      (await query("SELECT id FROM posts WHERE slug = $1", [slug])).rows[0]
        ?.id || null;
  let ref: string | null = null;
  try {
    if (referrer) ref = new URL(referrer).hostname;
  } catch {
    /* ignore */
  }
  await query(
    `INSERT INTO events (type, post_id, path, target, visitor_id, referrer) VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      type,
      postId,
      String(path).slice(0, 300),
      target && String(target).slice(0, 120),
      visitorId,
      ref,
    ],
  );
  if (type === "view" && postId && /^\/post\//.test(path)) {
    await query("UPDATE posts SET views = views + 1 WHERE id = $1", [postId]);
  }
  res.status(204).end();
});
