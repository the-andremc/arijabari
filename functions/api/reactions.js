// GET  /api/reactions?clips=ari-day-1,ari-day-2 → totals per clip + your reaction
// POST /api/reactions { clip, emoji } → one reaction per account per clip:
//      same emoji again = take it back, different emoji = switch
import { readJson, currentUser, now, json, fail } from "../../lib/auth.js";

const EMOJIS = ["🔥", "💀", "😂", "🤯"];
const CLIP_RE = /^ari-day-\d{1,4}$/;

async function summary(env, clip, userId) {
  const { results } = await env.DB.prepare("SELECT emoji, COUNT(*) AS n FROM reactions WHERE clip_id = ? GROUP BY emoji").bind(clip).all();
  const counts = Object.fromEntries(EMOJIS.map((e) => [e, 0]));
  for (const r of results) if (r.emoji in counts) counts[r.emoji] = r.n;
  const mine = userId ? (await env.DB.prepare("SELECT emoji FROM reactions WHERE user_id = ? AND clip_id = ?").bind(userId, clip).first())?.emoji || null : null;
  return { counts, mine };
}

export async function onRequestGet({ request, env }) {
  const clips = (new URL(request.url).searchParams.get("clips") || "").split(",").filter((c) => CLIP_RE.test(c)).slice(0, 50);
  const user = await currentUser(env, request);
  const out = {};
  for (const c of clips) out[c] = await summary(env, c, user?.id);
  return json({ ok: true, signedIn: !!user, clips: out });
}

export async function onRequestPost({ request, env }) {
  const user = await currentUser(env, request);
  if (!user) return fail(401, "Sign up to react.");
  const body = await readJson(request);
  const clip = String(body?.clip || ""), emoji = String(body?.emoji || "");
  if (!CLIP_RE.test(clip) || !EMOJIS.includes(emoji)) return fail(400, "Bad reaction.");

  const current = await env.DB.prepare("SELECT emoji FROM reactions WHERE user_id = ? AND clip_id = ?").bind(user.id, clip).first();
  if (current?.emoji === emoji) {
    await env.DB.prepare("DELETE FROM reactions WHERE user_id = ? AND clip_id = ?").bind(user.id, clip).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO reactions (user_id, clip_id, emoji, created_at) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(user_id, clip_id) DO UPDATE SET emoji = ?3, created_at = ?4`
    ).bind(user.id, clip, emoji, now()).run();
  }
  return json({ ok: true, clip, ...(await summary(env, clip, user.id)) });
}
