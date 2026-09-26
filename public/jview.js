// Published Jabari page: /j/<handle>
(async () => {
  const { api, toast, fmt, boop } = JB;
  const handle = decodeURIComponent(location.pathname.split("/")[2] || "").toLowerCase();
  const root = document.getElementById("jb");

  const r = handle ? await api(`/api/j/${encodeURIComponent(handle)}`) : { ok: false };
  if (!r.ok) { document.getElementById("missing").hidden = false; return; }

  const p = r.page;
  document.title = `${p.name || handle} ${p.line2 || ""} · Jabari`.replace(/\s+/g, " ");
  root.hidden = false;
  const pv = JB.page(root);
  pv.update(p);

  // Follow bar
  const bar = pv.social;
  bar.innerHTML = `
    <span class="jb-handle">@${handle}</span>
    <span class="jb-followers"><b></b> <span></span></span>
    <button type="button" class="btn jb-follow"></button>`;
  const countEl = bar.querySelector(".jb-followers b"), labelEl = bar.querySelector(".jb-followers span"), btn = bar.querySelector(".jb-follow");
  let following = r.following, followers = p.followers;

  function paint() {
    countEl.textContent = fmt(followers);
    labelEl.textContent = followers === 1 ? "follower" : "followers";
    if (r.isOwner) { btn.textContent = "✏️ Edit my Jabari"; btn.className = "btn btn-ghost jb-follow"; return; }
    btn.textContent = following ? "✓ Following" : "➕ Follow";
    btn.className = "btn jb-follow " + (following ? "btn-ghost following" : "btn-lime");
  }
  paint();

  if (r.isOwner && p.visibility === "private") {
    pv.extra.innerHTML = `<p class="jv-private">🔒 This Jabari is private. Only you can see it. Switch it to Public on the <a href="/create">create page</a>.</p>`;
  }

  btn.addEventListener("click", async () => {
    if (r.isOwner) { location.href = "/create"; return; }
    if (!r.signedIn) { toast("Sign up to follow Jabaris ✨"); setTimeout(() => { location.href = "/signup"; }, 900); return; }
    btn.disabled = true;
    const res = await api("/api/follow", { handle, follow: !following });
    btn.disabled = false;
    if (!res.ok) return toast(res.error);
    following = res.following; followers = res.followers;
    paint();
    if (following) { boop(660, .2, "triangle"); toast(`You're following @${handle} 🎉`); }
  });
})();
