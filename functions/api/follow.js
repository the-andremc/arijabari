// POST /api/follow { handle, follow: true | false } → follow or unfollow a Jabari
import { readJson, currentUser, normHandle, now, json, fail } from "../../lib/auth.js";
import { followerCount } from "../../lib/pages.js";

export async function onRequestPost({ request, env }) {
  const user = await currentUser(env, request);
  if (!user) return fail(401, "Sign up to follow Jabaris.");
  const body = await readJson(request);
  const handle = normHandle(body?.handle);
  if (handle === user.handle) return fail(400, "You can't follow yourself 😅");

  const target = await env.DB.prepare(
    "SELECT j.user_id FROM jabaris j JOIN pages p ON p.handle = j.handle WHERE j.handle = ? AND p.visibility = 'public'"
  ).bind(handle).first();
  if (!target) return fail(404, "That Jabari doesn't exist or is private.");

  const t = now();
  if (body.follow === false) {
    await env.DB.prepare("DELETE FROM follows WHERE follower_id = ? AND handle = ?").bind(user.id, handle).run();
  } else {
    await env.DB.prepare("INSERT OR IGNORE INTO follows (follower_id, handle, created_at) VALUES (?, ?, ?)").bind(user.id, handle, t).run();
    // Counts are lifetime, and the owner is only notified the first time an account follows them.
    const first = await env.DB.prepare("INSERT OR IGNORE INTO follow_history (follower_id, handle, first_at) VALUES (?, ?, ?)").bind(user.id, handle, t).run();
    if (first.meta.changes > 0) {
      await env.DB.prepare("INSERT INTO notifications (user_id, type, actor, handle, created_at) VALUES (?, 'follow', ?, ?, ?)")
        .bind(target.user_id, user.handle || null, handle, t).run();
    }
  }
  return json({ ok: true, following: body.follow !== false, followers: await followerCount(env, handle) });
}
