// GET /api/me  → who's signed in
import { currentUser, json } from "../../lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await currentUser(env, request);
  return json(user ? { signedIn: true, email: user.email, handle: user.handle || null } : { signedIn: false });
}
