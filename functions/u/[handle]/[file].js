// GET /u/<handle>/<id>.jpg → a photo from a published page (private pages: owner only)
import { currentUser, normHandle } from "../../../lib/auth.js";
import { getImage } from "../../../lib/media.js";

export async function onRequestGet({ request, env, params }) {
  const handle = normHandle(params.handle);
  const id = String(params.file || "").replace(/\.jpg$/, "");
  const page = await env.DB.prepare("SELECT visibility FROM pages WHERE handle = ?").bind(handle).first();
  const isPublic = page?.visibility === "public";
  if (!isPublic) {
    const user = await currentUser(env, request);
    if (user?.handle !== handle) return new Response("Not found", { status: 404 });
  }
  const bytes = await getImage(env, handle, id);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(bytes, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": isPublic ? "public, max-age=86400" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
