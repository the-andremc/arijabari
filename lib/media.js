// Photo storage for published pages. Uses R2 when a MEDIA bucket is bound, otherwise D1.
import { now } from "./auth.js";

export const MAX_IMAGES = 24;
export const MAX_IMAGE_BYTES = 1_500_000;

export async function putImage(env, handle, id, bytes) {
  if (env.MEDIA) {
    await env.MEDIA.put(`pages/${handle}/${id}.jpg`, bytes, { httpMetadata: { contentType: "image/jpeg" } });
    await env.DB.prepare("INSERT INTO page_images (id, handle, bytes, created_at) VALUES (?, ?, NULL, ?)").bind(id, handle, now()).run();
  } else {
    await env.DB.prepare("INSERT INTO page_images (id, handle, bytes, created_at) VALUES (?, ?, ?, ?)").bind(id, handle, bytes, now()).run();
  }
}

export async function getImage(env, handle, id) {
  const row = await env.DB.prepare("SELECT bytes FROM page_images WHERE id = ? AND handle = ?").bind(id, handle).first();
  if (!row) return null;
  if (row.bytes) return new Uint8Array(row.bytes);
  if (!env.MEDIA) return null;
  const obj = await env.MEDIA.get(`pages/${handle}/${id}.jpg`);
  return obj ? new Uint8Array(await obj.arrayBuffer()) : null;
}

export async function deleteImage(env, handle, id) {
  await env.DB.prepare("DELETE FROM page_images WHERE id = ? AND handle = ?").bind(id, handle).run();
  if (env.MEDIA) await env.MEDIA.delete(`pages/${handle}/${id}.jpg`);
}

export const imageUrl = (handle, id) => `/u/${handle}/${id}.jpg`;
