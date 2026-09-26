// Shared helpers for the /api Pages Functions.

export const SESSION_COOKIE = "jb_session";
const SESSION_DAYS = 30;
const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;        // wrong guesses per code
const MAX_SENDS_PER_HOUR = 5;  // codes emailed per address per hour

export const now = () => Math.floor(Date.now() / 1000);

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}
export const fail = (status, error) => json({ ok: false, error }, status);

// Only accept JSON bodies: blocks cross-site form posts (they can't send application/json without CORS).
export async function readJson(request) {
  if (!(request.headers.get("Content-Type") || "").includes("application/json")) return null;
  try { return await request.json(); } catch { return null; }
}

export function normEmail(raw) {
  const e = String(raw || "").trim().toLowerCase();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const secret = (env) => {
  if (!env.AUTH_SECRET) throw new Error("AUTH_SECRET is not set");
  return env.AUTH_SECRET;
};
const hashCode = (env, email, code) => sha256(`code:${secret(env)}:${email}:${code}`);
const hashToken = (env, token) => sha256(`session:${secret(env)}:${token}`);

function randomToken(bytes = 32) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function randomCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(n).padStart(6, "0");
}

/* ---------- Login codes ---------- */

// Returns { code } or { error, status }.
export async function issueCode(env, email) {
  const t = now();
  const row = await env.DB.prepare("SELECT sent_count, window_start FROM login_codes WHERE email = ?").bind(email).first();
  let sent = 1, windowStart = t;
  if (row && t - row.window_start < 3600) {
    if (row.sent_count >= MAX_SENDS_PER_HOUR) return { error: "Too many codes. Try again in an hour.", status: 429 };
    sent = row.sent_count + 1; windowStart = row.window_start;
  }
  const code = randomCode();
  await env.DB.prepare(
    `INSERT INTO login_codes (email, code_hash, expires_at, attempts, sent_count, window_start)
     VALUES (?1, ?2, ?3, 0, ?4, ?5)
     ON CONFLICT(email) DO UPDATE SET code_hash = ?2, expires_at = ?3, attempts = 0, sent_count = ?4, window_start = ?5`
  ).bind(email, await hashCode(env, email, code), t + CODE_MINUTES * 60, sent, windowStart).run();
  return { code };
}

// Returns true when the code matches (and consumes it).
export async function checkCode(env, email, code) {
  if (!/^\d{6}$/.test(String(code || ""))) return false;
  const row = await env.DB.prepare("SELECT code_hash, expires_at, attempts FROM login_codes WHERE email = ?").bind(email).first();
  if (!row || row.expires_at < now() || row.attempts >= MAX_ATTEMPTS) return false;
  if (row.code_hash !== await hashCode(env, email, code)) {
    await env.DB.prepare("UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?").bind(email).run();
    return false;
  }
  // Keep the row (for the hourly send limit) but make the code unusable.
  await env.DB.prepare("UPDATE login_codes SET expires_at = 0 WHERE email = ?").bind(email).run();
  return true;
}

/* ---------- Users + sessions ---------- */

export async function upsertUser(env, email) {
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)").bind(id, email, now()).run();
  return id;
}

export async function createSession(env, userId, request) {
  const token = randomToken();
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await hashToken(env, token), userId, now() + SESSION_DAYS * 86400).run();
  return sessionCookie(token, SESSION_DAYS * 86400, request);
}

export function sessionCookie(value, maxAge, request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function readCookie(request, name) {
  const m = (request.headers.get("Cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}

// Returns { id, email, handle } or null.
export async function currentUser(env, request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, j.handle FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN jabaris j ON j.user_id = u.id
      WHERE s.token_hash = ? AND s.expires_at > ?`
  ).bind(await hashToken(env, token), now()).first();
  return row || null;
}

export async function endSession(env, request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await hashToken(env, token)).run();
}

/* ---------- Jabari names ---------- */

const RESERVED = new Set([
  "ari", "arijabari", "jabari", "admin", "administrator", "api", "app", "create", "signup", "sign-up", "login",
  "logout", "signin", "account", "me", "settings", "help", "support", "about", "contact", "privacy", "terms",
  "www", "mail", "email", "hello", "j", "static", "media", "icons", "official", "staff", "mod", "moderator",
]);

export function normHandle(raw) {
  return String(raw || "").trim().toLowerCase();
}

// Returns an error message, or null when the name is allowed.
export function handleProblem(h) {
  if (h.length < 3) return "At least 3 characters.";
  if (h.length > 20) return "20 characters max.";
  if (!/^[a-z0-9-]+$/.test(h)) return "Only letters, numbers and dashes.";
  if (h.startsWith("-") || h.endsWith("-") || h.includes("--")) return "Dashes can't be at the start, end, or doubled.";
  if (RESERVED.has(h)) return "That one's reserved.";
  return null;
}

/* ---------- Email ---------- */

export async function sendLoginEmail(env, to, code) {
  const from = env.EMAIL_FROM || "hello@arijabari.com";
  const subject = `${code} is your Jabari code`;
  const text = `Your Jabari sign-in code is ${code}\n\nIt expires in ${CODE_MINUTES} minutes. If you didn't ask for this, you can ignore this email.`;
  const html = `<!doctype html><html><body style="margin:0;background:#0d0b1a;font-family:Arial,sans-serif;color:#fdfcff">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0b1a;padding:40px 16px"><tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#17142b;border-radius:20px;padding:32px">
  <tr><td style="font-size:26px;font-weight:bold;letter-spacing:1px">ARI<span style="color:#ff2e88">JABARI</span></td></tr>
  <tr><td style="padding:20px 0 8px;color:#a9a3c7;font-size:16px">Here's your sign-in code:</td></tr>
  <tr><td style="font-size:44px;font-weight:bold;letter-spacing:10px;color:#c6ff00;padding:6px 0 18px">${code}</td></tr>
  <tr><td style="color:#a9a3c7;font-size:14px;line-height:1.5">It expires in ${CODE_MINUTES} minutes.<br>If you didn't ask for this, just ignore this email.</td></tr>
  </table></td></tr></table></body></html>`;

  // 1) Cloudflare Email Service binding, 2) its REST API, 3) local dev: print the code.
  if (env.EMAIL?.send) {
    await env.EMAIL.send({ to, from, subject, html, text });
    return;
  }
  if (env.CF_EMAIL_TOKEN && env.CF_ACCOUNT_ID) {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/email/sending/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CF_EMAIL_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to, from, subject, html, text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(`Email send failed: ${res.status} ${JSON.stringify(data.errors || data)}`);
    return;
  }
  if (env.DEV_LOG_CODES === "1") {
    console.log(`\n[dev] Jabari sign-in code for ${to}: ${code}\n`);
    return;
  }
  throw new Error("No email sender configured");
}
