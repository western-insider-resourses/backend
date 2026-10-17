import { query } from "../../database/db.js";
import { intParam, wrap } from "../../shared/utils.js";

export const getAnalytics = wrap(async (req, res) => {
  const days = Math.min(Math.max(intParam(req.query.days, 30), 1), 365);
  const since = `created_at >= now() - make_interval(days => $1)`;
  const [totals, daily, topPosts, topClicks, sources, topPages, counts] =
    await Promise.all([
      query(
        `SELECT count(*) FILTER (WHERE type='view')::int AS views,
                  count(DISTINCT visitor_id)::int AS visitors,
                  count(*) FILTER (WHERE type='click')::int AS clicks
           FROM events WHERE ${since}`,
        [days],
      ),
      query(
        `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                  count(*) FILTER (WHERE type='view')::int AS views,
                  count(*) FILTER (WHERE type='click')::int AS clicks
           FROM events WHERE ${since} GROUP BY 1 ORDER BY 1`,
        [days],
      ),
      query(
        `SELECT p.title, p.slug, count(*)::int AS views
           FROM events e JOIN posts p ON p.id = e.post_id
           WHERE e.type='view' AND e.${since} GROUP BY p.id ORDER BY views DESC LIMIT 10`,
        [days],
      ),
      query(
        `SELECT target, count(*)::int AS clicks FROM events
           WHERE type='click' AND target IS NOT NULL AND ${since}
           GROUP BY target ORDER BY clicks DESC LIMIT 15`,
        [days],
      ),
      query(
        `SELECT COALESCE(NULLIF(referrer,''), 'Direct') AS source, count(*)::int AS views
           FROM events WHERE type='view' AND ${since} GROUP BY 1 ORDER BY views DESC LIMIT 8`,
        [days],
      ),
      query(
        `SELECT path, count(*)::int AS views FROM events
           WHERE type='view' AND ${since} GROUP BY path ORDER BY views DESC LIMIT 10`,
        [days],
      ),
      query(`SELECT (SELECT count(*) FROM posts WHERE status='published')::int AS posts,
                  (SELECT count(*) FROM comments)::int AS comments,
                  (SELECT count(*) FROM likes)::int AS likes`),
    ]);
  res.json({
    days,
    totals: totals.rows[0],
    daily: daily.rows,
    topPosts: topPosts.rows,
    topClicks: topClicks.rows,
    sources: sources.rows,
    topPages: topPages.rows,
    counts: counts.rows[0],
  });
});
