export const POST_FIELDS = `
  p.id, p.title, p.slug, p.excerpt, p.featured, p.author, p.views, p.published_at,
  c.name AS category_name, c.slug AS category_slug,
  (SELECT url FROM post_images i WHERE i.post_id = p.id ORDER BY i.position LIMIT 1) AS cover,
  (SELECT count(*) FROM likes l WHERE l.post_id = p.id)::int AS likes,
  (SELECT count(*) FROM comments m WHERE m.post_id = p.id AND m.status = 'visible')::int AS comments`;

export const POST_FROM = `FROM posts p LEFT JOIN categories c ON c.id = p.category_id`;
