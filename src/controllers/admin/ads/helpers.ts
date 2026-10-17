import { bad } from "../../../shared/utils.js";

export function readAd(b: Record<string, unknown>): unknown[] {
  const name = String(b.name || "").trim();
  if (!name) throw bad("Name the ad so you can find it later.");
  if (
    !["header", "sidebar", "in_article", "footer"].includes(String(b.placement))
  )
    throw bad("Choose where the ad appears.");
  if (!b.image_url && !b.html_code)
    throw bad("Upload a banner or paste ad code.");
  return [
    name,
    b.placement,
    b.image_url || null,
    b.image_public_id || null,
    b.link_url || null,
    b.html_code || null,
    b.active !== false,
  ];
}
