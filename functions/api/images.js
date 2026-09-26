// POST   /api/images            (body: JPEG bytes) → { id, url }
// DELETE /api/images?id=<id>
import { currentUser, json, fail } from "../../lib/auth.js";
import { putImage, deleteImage, imageUrl, MAX_IMAGES, MAX_IMAGE_BYTES } from "../../lib/media.js";

export async function onRequestPost({ request, env }) {
  const user = await currentUser(env, request);
  if (!user?.handle) return fail(401, "Sign in and claim your name first.");
  if (request.headers.get("Content-Type") !== "image/jpeg") return fail(415, "Photos must be JPEG.");

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) return fail(413, "That photo is too big.");
  if (bytes.length < 100 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return fail(415, "That isn't a JPEG.");

  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM page_images WHERE handle = ?").bind(user.handle).first();
  if (n >= MAX_IMAGES) return fail(409, `Max ${MAX_IMAGES} photos.`);

  const id = crypto.randomUUID();
  await putImage(env, user.handle, id, bytes);
  return json({ ok: true, id, url: imageUrl(user.handle, id) });
}

export async function onRequestDelete({ request, env }) {
  const user = await currentUser(env, request);
  if (!user?.handle) return fail(401, "Sign in first.");
  const id = new URL(request.url).searchParams.get("id") || "";
  await deleteImage(env, user.handle, id);
  return json({ ok: true });
}
