// GET /api/j/<handle> → a Jabari page (public, or private if it's yours)
import { currentUser, normHandle, json, fail } from "../../../lib/auth.js";
import { followerCount, presentPage } from "../../../lib/pages.js";

export async function onRequestGet({ request, env, params }) {
  const handle = normHandle(params.handle);
  const row = await env.DB.prepare("SELECT data, visibility, updated_at FROM pages WHERE handle = ?").bind(handle).first();
  const user = await currentUser(env, request);
  const isOwner = user?.handle === handle;
  if (!row || (row.visibility !== "public" && !isOwner)) return fail(404, "This Jabari doesn't exist or is private.");

  const following = user && !isOwner
    ? !!(await env.DB.prepare("SELECT 1 FROM follows WHERE follower_id = ? AND handle = ?").bind(user.id, handle).first())
    : false;
  return json({ ok: true, page: presentPage(handle, row, await followerCount(env, handle)), isOwner, following, signedIn: !!user });
}
