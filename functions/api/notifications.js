// GET  /api/notifications → latest notifications + unread count
// POST /api/notifications → mark all as read
import { currentUser, now, json, fail } from "../../lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await currentUser(env, request);
  if (!user) return fail(401, "Sign in first.");
  const { results } = await env.DB.prepare(
    "SELECT id, type, actor, handle, created_at, read_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 30"
  ).bind(user.id).all();
  const unread = await env.DB.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL").bind(user.id).first();
  return json({ ok: true, unread: unread.n, items: results });
}

export async function onRequestPost({ request, env }) {
  const user = await currentUser(env, request);
  if (!user) return fail(401, "Sign in first.");
  await env.DB.prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL").bind(now(), user.id).run();
  return json({ ok: true });
}
