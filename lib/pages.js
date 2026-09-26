// Shaping and validating published Jabari pages.
import { MAX_IMAGES, imageUrl } from "./media.js";

const THEMES = ["neon", "ocean", "lava", "toxic", "candy", "mono"];
const ID_RE = /^[0-9a-f-]{36}$/;
const str = (v, max) => String(v ?? "").slice(0, max);
const lines = (v, maxLines, maxLen) => str(v, maxLines * (maxLen + 1)).split("\n").map((l) => l.trim().slice(0, maxLen)).filter(Boolean).slice(0, maxLines).join("\n");

// Only keep known fields, with length limits. `known` = image ids this handle actually owns.
export function cleanPageData(input, known) {
  const images = (Array.isArray(input?.images) ? input.images : []).filter((id) => ID_RE.test(id) && known.has(id)).slice(0, MAX_IMAGES);
  return {
    name: str(input?.name, 12), line2: str(input?.line2, 12), tagline: str(input?.tagline, 60),
    theme: THEMES.includes(input?.theme) ? input.theme : "neon",
    sticker0: str(input?.sticker0, 16), sticker1: str(input?.sticker1, 16), sticker2: str(input?.sticker2, 16),
    bubbles: lines(input?.bubbles, 20, 60), moods: lines(input?.moods, 30, 80),
    images, heroId: images.includes(input?.heroId) ? input.heroId : images[0] || null,
  };
}

export async function followerCount(env, handle) {
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM follow_history WHERE handle = ?").bind(handle).first();
  return r?.n || 0;
}

// Public-facing shape of a page (image ids become URLs).
export function presentPage(handle, row, followers) {
  const d = JSON.parse(row.data);
  return {
    handle, followers, visibility: row.visibility, updatedAt: row.updated_at,
    ...d,
    images: d.images.map((id) => ({ id, url: imageUrl(handle, id) })),
    heroUrl: d.heroId ? imageUrl(handle, d.heroId) : null,
  };
}
