(() => {
  const $ = (s) => document.querySelector(s);
  const { THEMES, DB, toast, api } = window.JB;
  const MAX_IMAGES = 24;
  const MAX_SIDE = 800;
  const params = new URLSearchParams(location.search);

  const DEFAULTS = {
    name: "", line2: "JABARI", tagline: "",
    theme: "neon",
    sticker0: "NOT A BOT", sticker1: "CERTIFIED SILLY", sticker2: "MAIN CHARACTER",
    bubbles: ["bro what", "nah 💀", "ok but listen", "HELLO??", "no cap", "that's crazy"].join("\n"),
    moods: ["When the wifi drops mid-game", "Loading brain… 3%", "Main character energy: ACTIVATED",
            "Five more minutes (it was two hours)", "Absolutely zero thoughts. Just vibes."].join("\n"),
    visibility: "public",
  };

  /* ---------- State ---------- */
  // images: [{ id, blob, serverId? }]; serverId is set once the photo has been uploaded.
  let state = { ...DEFAULTS, images: [], heroId: null, publishedIds: [], dirty: false };
  const urls = new Map();
  const urlFor = (img) => { if (!urls.has(img.id)) urls.set(img.id, URL.createObjectURL(img.blob)); return urls.get(img.id); };
  const isEmpty = (s) => !s.name && !s.images.length;

  let saveT;
  function save({ edited = true } = {}) {
    if (edited) { state.dirty = true; showPubStatus(); }
    clearTimeout(saveT);
    saveT = setTimeout(async () => {
      try { await DB.set("me", state); $("#savedNote").textContent = "✓ Draft saved on this device"; }
      catch { $("#savedNote").textContent = "⚠️ Couldn't save your draft (private browsing?)."; }
    }, 300);
  }

  /* ---------- Photos: resize in the browser (also drops location data) ---------- */
  async function shrink(file) {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    return new Promise((res) => c.toBlob(res, "image/jpeg", 0.82));
  }
  async function addFiles(files) {
    const list = [...files].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    let room = MAX_IMAGES - state.images.length, failed = 0;
    if (room <= 0) return toast(`Max ${MAX_IMAGES} photos. Delete some first.`);
    if (list.length > room) toast(`Only adding ${room}. Max is ${MAX_IMAGES}.`);
    for (const f of list.slice(0, room)) {
      try { state.images.push({ id: crypto.randomUUID(), blob: await shrink(f) }); }
      catch { failed++; }
    }
    if (failed) toast(`${failed} photo${failed > 1 ? "s" : ""} couldn't be read. Try JPG or PNG.`);
    if (!state.heroId && state.images[0]) state.heroId = state.images[0].id;
    renderThumbs(); render(); save();
  }

  const fileInput = $("#fileInput"), drop = $("#drop");
  fileInput.addEventListener("change", () => { addFiles(fileInput.files); fileInput.value = ""; });
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

  function renderThumbs() {
    const box = $("#thumbs"); box.textContent = "";
    for (const img of state.images) {
      const d = document.createElement("div");
      d.className = "thumb" + (img.id === state.heroId ? " hero" : "");
      d.innerHTML = `<img alt=""><button type="button" class="star" title="Make main face">⭐</button><button type="button" class="del" title="Remove">✕</button>`;
      d.querySelector("img").src = urlFor(img);
      d.querySelector(".star").onclick = () => { state.heroId = img.id; renderThumbs(); render(); save(); };
      d.querySelector(".del").onclick = () => {
        state.images = state.images.filter((x) => x.id !== img.id);
        URL.revokeObjectURL(urls.get(img.id)); urls.delete(img.id);
        if (state.heroId === img.id) state.heroId = state.images[0]?.id || null;
        renderThumbs(); render(); save();
      };
      box.append(d);
    }
  }

  /* ---------- Themes ---------- */
  const themeBox = $("#themes");
  for (const [key, t] of Object.entries(THEMES)) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "theme"; b.dataset.key = key;
    b.style.setProperty("--t-bg", t.jbg);
    b.innerHTML = `<i><b style="background:${t.a}"></b><b style="background:${t.b}"></b><b style="background:${t.c}"></b><b style="background:${t.d}"></b></i>${t.label}`;
    b.onclick = () => { state.theme = key; render(); save(); };
    themeBox.append(b);
  }

  /* ---------- Text fields ---------- */
  const form = $("#editor");
  const FIELDS = ["name", "line2", "tagline", "sticker0", "sticker1", "sticker2", "bubbles", "moods"];
  form.addEventListener("input", (e) => {
    if (FIELDS.includes(e.target.name)) { state[e.target.name] = e.target.value; render(); save(); }
    if (e.target.name === "visibility") { state.visibility = e.target.value; save(); }
  });
  const fillForm = () => {
    FIELDS.forEach((f) => { form.elements[f].value = state[f] ?? ""; });
    form.querySelectorAll('[name="visibility"]').forEach((r) => { r.checked = r.value === state.visibility; });
  };

  /* ---------- Preview ---------- */
  const pv = JB.page($("#jb"), { urlFor });
  function render() {
    pv.update(state);
    themeBox.querySelectorAll(".theme").forEach((b) => b.classList.toggle("on", b.dataset.key === state.theme));
  }

  const preview = $("#preview");
  $("#fullBtn").onclick = () => { preview.classList.add("full"); document.body.classList.add("pv-full"); };
  const exitFull = () => { preview.classList.remove("full"); document.body.classList.remove("pv-full"); };
  $("#exitFull").onclick = exitFull;
  addEventListener("keydown", (e) => { if (e.key === "Escape") exitFull(); });

  $("#resetBtn").onclick = async () => {
    if (!confirm("Clear your draft and its photos from this device? (Your published page stays online until you publish again.)")) return;
    urls.forEach((u) => URL.revokeObjectURL(u)); urls.clear();
    state = { ...DEFAULTS, images: [], heroId: null, publishedIds: state.publishedIds, dirty: false };
    fillForm(); renderThumbs(); render(); save();
    toast("Fresh start 🧼");
  };

  /* ---------- Account + publishing ---------- */
  let me = { signedIn: false }, published = null;

  function showPubStatus() {
    const el = $("#pubStatus"); if (!el || !me.handle) return;
    if (!published) el.textContent = "Not published yet.";
    else if (state.dirty) el.textContent = "⚠️ You've made changes since you last published.";
    else el.innerHTML = `✅ Published as <b>${published.visibility === "public" ? "🌍 Public" : "🔒 Private"}</b>. <a href="/j/${me.handle}">View it →</a>`;
  }

  // Upload new photos, remove deleted ones, then save the page.
  async function publish() {
    const btn = $("#publishBtn");
    if (!state.name && !state.images.length) return toast("Add a name or some photos first!");
    btn.disabled = true; btn.textContent = "⏳ Publishing…";
    try {
      for (const img of state.images) {
        if (img.serverId) continue;
        const res = await fetch("/api/images", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "image/jpeg" }, body: img.blob });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "A photo didn't upload.");
        img.serverId = data.id;
      }
      const keep = new Set(state.images.map((i) => i.serverId));
      for (const id of state.publishedIds || []) {
        if (!keep.has(id)) await api(`/api/images?id=${encodeURIComponent(id)}`, undefined, "DELETE");
      }
      const hero = state.images.find((i) => i.id === state.heroId);
      const page = {
        name: state.name, line2: state.line2, tagline: state.tagline, theme: state.theme,
        sticker0: state.sticker0, sticker1: state.sticker1, sticker2: state.sticker2,
        bubbles: state.bubbles, moods: state.moods,
        images: state.images.map((i) => i.serverId), heroId: hero?.serverId || null,
      };
      const r = await api("/api/mypage", { page, visibility: state.visibility }, "PUT");
      if (!r.ok) throw new Error(r.error);
      state.publishedIds = [...keep]; state.dirty = false;
      published = { visibility: r.visibility };
      save({ edited: false }); showPubStatus();
      toast(r.visibility === "public" ? "🚀 You're live! Your Jabari is on the home page." : "🔒 Saved privately. Only you can see it.");
    } catch (err) {
      toast("😬 " + (err.message || "Publishing failed. Try again."));
    } finally {
      btn.disabled = false; btn.textContent = "🚀 Publish";
    }
  }
  $("#publishBtn").onclick = publish;

  $("#shareBtn").onclick = async () => {
    if (!me.handle) return toast("Sign up and claim your name to get a link.");
    if (published?.visibility !== "public") return toast("Publish as Public first so people can open your link.");
    const link = `${location.origin}/j/${me.handle}`;
    try { await navigator.clipboard.writeText(link); toast("🔗 Link copied!"); } catch { toast(link); }
  };

  // Signed in on a new device: pull the published page down as the starting draft.
  async function importPublished(p) {
    const images = [];
    for (const img of p.images) {
      try {
        const blob = await fetch(img.url, { credentials: "same-origin" }).then((r) => (r.ok ? r.blob() : Promise.reject()));
        images.push({ id: crypto.randomUUID(), blob, serverId: img.id });
      } catch {}
    }
    const hero = images.find((i) => i.serverId === p.heroId);
    state = {
      ...DEFAULTS, name: p.name, line2: p.line2, tagline: p.tagline, theme: p.theme,
      sticker0: p.sticker0, sticker1: p.sticker1, sticker2: p.sticker2, bubbles: p.bubbles, moods: p.moods,
      visibility: p.visibility, images, heroId: hero?.id || images[0]?.id || null,
      publishedIds: images.map((i) => i.serverId), dirty: false,
    };
    fillForm(); renderThumbs(); render(); save({ edited: false });
  }

  async function loadAccount() {
    me = await api("/api/me");
    if (!me.signedIn) return;
    $("#publishSignedOut").hidden = true;
    if (!me.handle) {
      $("#publishSignedOut").hidden = false;
      $("#publishSignedOut").innerHTML = `<p class="help">You're signed in. Claim your Jabari name to publish.</p><a href="/signup" class="btn btn-lime">🏁 Claim my name</a>`;
      return;
    }
    $("#publishSignedIn").hidden = false;
    $("#myLink").textContent = `arijabari.com/j/${me.handle}`;
    const r = await api("/api/mypage");
    if (r.ok && r.page) {
      published = { visibility: r.page.visibility };
      if (isEmpty(state)) await importPublished(r.page);
    }
    showPubStatus();
  }

  /* ---------- Boot ---------- */
  (async () => {
    try {
      const saved = await DB.get("me");
      if (saved) state = { ...DEFAULTS, ...saved, images: saved.images || [], publishedIds: saved.publishedIds || [] };
    } catch {}
    fillForm(); renderThumbs(); render();
    await loadAccount();
    if (params.has("view")) $("#fullBtn").click();
  })();
})();
