// GET /api/pages → public Jabaris for the home page gallery (newest first)
import { json } from "../../lib/auth.js";
import { imageUrl } from "../../lib/media.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT p.handle, p.data, p.hero_image, p.updated_at,
            (SELECT COUNT(*) FROM follow_history f WHERE f.handle = p.handle) AS followers
       FROM pages p WHERE p.visibility = 'public'
      ORDER BY p.updated_at DESC LIMIT 60`
  ).all();
  return json({
    ok: true,
    pages: results.map((r) => {
      const d = JSON.parse(r.data);
      return {
        handle: r.handle, name: d.name, line2: d.line2, tagline: d.tagline, theme: d.theme,
        heroUrl: r.hero_image ? imageUrl(r.handle, r.hero_image) : null, followers: r.followers,
      };
    }),
  });
}
