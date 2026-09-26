// POST /api/auth/logout
import { endSession, sessionCookie, json } from "../../../lib/auth.js";

export async function onRequestPost({ request, env }) {
  await endSession(env, request);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0, request) });
}
