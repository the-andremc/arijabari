// POST /api/auth/start  { email }  → emails a 6-digit code
import { readJson, normEmail, issueCode, sendLoginEmail, json, fail } from "../../../lib/auth.js";

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const email = normEmail(body?.email);
  if (!email) return fail(400, "That doesn't look like an email address.");

  const issued = await issueCode(env, email);
  if (issued.error) return fail(issued.status, issued.error);

  try {
    await sendLoginEmail(env, email, issued.code);
  } catch (err) {
    console.error(err);
    return fail(502, "Couldn't send the email. Try again in a minute.");
  }
  return json({ ok: true });
}
