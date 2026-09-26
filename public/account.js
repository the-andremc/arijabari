// Sign-in state in the nav, the 🔔 notifications menu, and the account note on /create.
(async () => {
  let me = { signedIn: false };
  try {
    const r = await fetch("/api/me", { credentials: "same-origin" });
    if (r.ok) me = await r.json();
  } catch {}

  const link = document.getElementById("accountLink");
  if (link) {
    if (me.signedIn && me.handle) { link.textContent = `👤 ${me.handle}`; link.classList.add("in"); link.href = `/j/${me.handle}`; }
    else if (me.signedIn) { link.textContent = "Claim your name"; link.href = "/signup"; }
    else link.href = "/signup";
  }

  const note = document.getElementById("acctNote");
  if (note) {
    note.textContent = "";
    const a = document.createElement("a"); a.href = "/signup";
    if (me.signedIn && me.handle) { note.hidden = true; }
    else if (me.signedIn) { note.append("You're signed in. "); a.textContent = "Claim your Jabari name →"; note.append(a); }
    else { a.textContent = "Sign up to publish your Jabari and get followers →"; note.append(a); }
  }

  if (!me.signedIn || !link) return;

  /* ---------- Notifications ---------- */
  const bell = document.createElement("button");
  bell.type = "button"; bell.className = "bell-btn"; bell.setAttribute("aria-label", "Notifications");
  bell.innerHTML = `🔔<span class="bell-dot" hidden></span>`;
  link.before(bell);
  const dot = bell.querySelector(".bell-dot");
  const setUnread = (n) => { dot.hidden = !n; dot.textContent = n > 99 ? "99+" : n; };
  setUnread(me.unread || 0);

  const panel = document.createElement("div");
  panel.className = "notif-panel"; panel.hidden = true;
  panel.innerHTML = `<p class="notif-head">Notifications</p><ul class="notif-list"></ul>`;
  document.body.append(panel);

  const ago = (t) => {
    const s = Math.max(1, Math.floor(Date.now() / 1000 - t));
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  async function open() {
    panel.hidden = false;
    const list = panel.querySelector(".notif-list");
    list.innerHTML = `<li class="notif-empty">Loading…</li>`;
    const r = await fetch("/api/notifications", { credentials: "same-origin" }).then((x) => x.json()).catch(() => ({ items: [] }));
    list.textContent = "";
    if (!r.items?.length) { list.innerHTML = `<li class="notif-empty">Nothing yet. When someone follows you, it shows up here.</li>`; }
    for (const n of r.items || []) {
      const li = document.createElement("li");
      if (!n.read_at) li.className = "unread";
      const who = document.createElement(n.actor ? "a" : "b");
      if (n.actor) { who.href = `/j/${n.actor}`; who.textContent = `@${n.actor}`; } else who.textContent = "Someone";
      li.append("⭐ ", who, " followed your Jabari");
      const time = document.createElement("small"); time.textContent = ago(n.created_at); li.append(time);
      list.append(li);
    }
    if (r.unread) {
      await fetch("/api/notifications", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}" });
      setUnread(0);
    }
  }
  bell.addEventListener("click", (e) => { e.stopPropagation(); panel.hidden ? open() : (panel.hidden = true); });
  document.addEventListener("click", (e) => { if (!panel.hidden && !panel.contains(e.target)) panel.hidden = true; });
  addEventListener("keydown", (e) => { if (e.key === "Escape") panel.hidden = true; });
})();
