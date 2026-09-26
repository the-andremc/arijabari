// GET /api/mypage → your published page (or null)
// PUT /api/mypage { page: {...}, visibility: "public" | "private" } → save + publish
import { readJson, currentUser, now, json, fail } from "../../lib/auth.js";
import { cleanPageData, followerCount, presentPage } from "../../lib/pages.js";

export async function onRequestGet({ request, env }) {
  const user = await currentUser(env, request);
  if (!user) return fail(401, "Sign in first.");
  if (!user.handle) return json({ ok: true, page: null });
  const row = await env.DB.prepare("SELECT data, visibility, updated_at FROM pages WHERE handle = ?").bind(user.handle).first();
  return json({ ok: true, page: row ? presentPage(user.handle, row, await followerCount(env, user.handle)) : null });
}

export async function onRequestPut({ request, env }) {
  const user = await currentUser(env, request);
  if (!user) return fail(401, "Sign in first.");
  if (!user.handle) return fail(400, "Claim your Jabari name first.");
  const body = await readJson(request);
  if (!body) return fail(400, "Bad request.");
  const visibility = body.visibility === "public" ? "public" : "private";

  const { results } = await env.DB.prepare("SELECT id FROM page_images WHERE handle = ?").bind(user.handle).all();
  const data = cleanPageData(body.page, new Set(results.map((r) => r.id)));
  const t = now();
  await env.DB.prepare(
    `INSERT INTO pages (handle, data, hero_image, visibility, updated_at, published_at)
     VALUES (?1, ?2, ?3, ?4, ?5, CASE WHEN ?4 = 'public' THEN ?5 END)
     ON CONFLICT(handle) DO UPDATE SET data = ?2, hero_image = ?3, visibility = ?4, updated_at = ?5,
       published_at = COALESCE(published_at, CASE WHEN ?4 = 'public' THEN ?5 END)`
  ).bind(user.handle, JSON.stringify(data), data.heroId, visibility, t).run();
  return json({ ok: true, handle: user.handle, visibility });
}
