// GET /api/me  → who's signed in
import { currentUser, json } from "../../lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await currentUser(env, request);
  if (!user) return json({ signedIn: false });
  const unread = await env.DB.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL").bind(user.id).first();
  return json({ signedIn: true, email: user.email, handle: user.handle || null, unread: unread?.n || 0 });
}
