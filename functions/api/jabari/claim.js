// POST /api/jabari/claim  { handle }  → claims arijabari.com/j/<handle> for the signed-in user
import { readJson, currentUser, normHandle, handleProblem, now, json, fail } from "../../../lib/auth.js";

export async function onRequestPost({ request, env }) {
  const user = await currentUser(env, request);
  if (!user) return fail(401, "Sign in first.");
  if (user.handle) return fail(409, `You've already claimed "${user.handle}".`);

  const body = await readJson(request);
  const handle = normHandle(body?.handle);
  const problem = handleProblem(handle);
  if (problem) return fail(400, problem);

  try {
    await env.DB.prepare("INSERT INTO jabaris (handle, user_id, created_at) VALUES (?, ?, ?)").bind(handle, user.id, now()).run();
  } catch {
    return fail(409, "Already taken. Try another one.");
  }
  return json({ ok: true, handle });
}
