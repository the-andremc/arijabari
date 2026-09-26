// POST /api/auth/verify  { email, code }  → signs in (creates the account on first sign-in)
import { readJson, normEmail, checkCode, upsertUser, createSession, json, fail } from "../../../lib/auth.js";

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const email = normEmail(body?.email);
  if (!email) return fail(400, "That doesn't look like an email address.");
  if (!(await checkCode(env, email, String(body?.code || "").trim()))) {
    return fail(401, "That code didn't work. Check it, or send a new one.");
  }
  const userId = await upsertUser(env, email);
  const cookie = await createSession(env, userId, request);
  const jabari = await env.DB.prepare("SELECT handle FROM jabaris WHERE user_id = ?").bind(userId).first();
  return json({ ok: true, email, handle: jabari?.handle || null }, 200, { "Set-Cookie": cookie });
}
