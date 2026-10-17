import type { PoolClient } from "pg";
import { bad } from "../../../shared/utils.js";

interface ImageInput {
  url: string;
  public_id?: string | null;
  caption?: string;
}

interface PostInput {
  title: string;
  status: "draft" | "published";
  images: ImageInput[];
  excerpt: string;
  body: string;
  categoryId: number | null;
  featured: boolean;
  author: string;
}

export function readPost(b: Record<string, unknown>): PostInput {
  const title = String(b.title || "").trim();
  if (!title) throw bad("Add a title.");
  const images: ImageInput[] = Array.isArray(b.images)
    ? (b.images as ImageInput[]).filter((i) => i?.url)
    : [];
  if (images.length < 1 || images.length > 3)
    throw bad("Each story needs 1 to 3 images.");
  const status = b.status === "published" ? "published" : "draft";
  return {
    title,
    status,
    images,
    excerpt: String(b.excerpt || "")
      .trim()
      .slice(0, 400),
    body: String(b.body || "").trim(),
    categoryId: b.categoryId ? Number(b.categoryId) : null,
    featured: !!b.featured,
    author: String(b.author || "Editorial Team")
      .trim()
      .slice(0, 80),
  };
}

export const insertImages = (
  client: PoolClient,
  postId: string,
  images: ImageInput[],
) =>
  Promise.all(
    images.map((img, i) =>
      client.query(
        "INSERT INTO post_images (post_id, url, public_id, caption, position) VALUES ($1,$2,$3,$4,$5)",
        [
          postId,
          img.url,
          img.public_id || null,
          String(img.caption || "").slice(0, 200),
          i,
        ],
      ),
    ),
  );
