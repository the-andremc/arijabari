// /j/<handle> → serve the published-page shell; jview.js loads the data.
export async function onRequestGet({ request, env }) {
  const res = await env.ASSETS.fetch(new URL("/jview", request.url));
  return new Response(res.body, { status: res.status, headers: res.headers });
}
