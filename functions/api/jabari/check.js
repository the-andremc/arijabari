// GET /api/jabari/check?handle=zara  → is this name free?
import { normHandle, handleProblem, json } from "../../../lib/auth.js";

export async function onRequestGet({ request, env }) {
  const handle = normHandle(new URL(request.url).searchParams.get("handle"));
  const problem = handleProblem(handle);
  if (problem) return json({ handle, available: false, reason: problem });
  const taken = await env.DB.prepare("SELECT 1 FROM jabaris WHERE handle = ?").bind(handle).first();
  return json({ handle, available: !taken, reason: taken ? "Already taken." : null });
}
