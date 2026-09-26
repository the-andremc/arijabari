(() => {
  const $ = (s) => document.querySelector(s);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const MAX_IMAGES = 24;
  const MAX_SIDE = 800;

  const THEMES = {
    neon:  { label: "Neon",  jbg: "#0d0b1a", a: "#ff2e88", b: "#22e4ff", c: "#c6ff00", d: "#ffe14d" },
    ocean: { label: "Ocean", jbg: "#041a2f", a: "#00a6ff", b: "#7cffcb", c: "#ffd23f", d: "#ffffff" },
    lava:  { label: "Lava",  jbg: "#1a0505", a: "#ff4d00", b: "#ffb800", c: "#ff9e7a", d: "#fff1c1" },
    toxic: { label: "Toxic", jbg: "#06130a", a: "#9d2bff", b: "#39ff14", c: "#39ff14", d: "#fff200" },
    candy: { label: "Candy", jbg: "#2b0a3d", a: "#ff5ccd", b: "#9be7ff", c: "#b8ff9f", d: "#fff07a" },
    mono:  { label: "Mono",  jbg: "#111111", a: "#ff3b3b", b: "#ffffff", c: "#ffffff", d: "#ffffff" },
  };

  const DEFAULTS = {
    name: "", line2: "JABARI", tagline: "",
    theme: "neon",
    sticker0: "NOT A BOT", sticker1: "CERTIFIED SILLY", sticker2: "MAIN CHARACTER",
    bubbles: ["bro what", "nah 💀", "ok but listen", "HELLO??", "no cap", "that's crazy"].join("\n"),
    moods: ["When the wifi drops mid-game", "Loading brain… 3%", "Main character energy: ACTIVATED",
            "Five more minutes (it was two hours)", "Absolutely zero thoughts. Just vibes."].join("\n"),
  };

  /* ---------- Tiny IndexedDB store (photos are too big for localStorage) ---------- */
  const DB = {
    open() {
      return (this._db ||= new Promise((res, rej) => {
        const r = indexedDB.open("jabari", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("kv");
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      }));
    },
    async get(k) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const r = db.transaction("kv").objectStore("kv").get(k);
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
    },
    async set(k, v) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const t = db.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k);
        t.oncomplete = () => res(); t.onerror = () => rej(t.error);
      });
    },
  };

  /* ---------- State ---------- */
  let state = { ...DEFAULTS, images: [], heroId: null }; // images: [{id, blob}]
  const urls = new Map(); // id -> object URL
  const urlFor = (img) => { if (!urls.has(img.id)) urls.set(img.id, URL.createObjectURL(img.blob)); return urls.get(img.id); };
  const lines = (s) => s.split("\n").map((x) => x.trim()).filter(Boolean);

  let saveT;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(async () => {
      try { await DB.set("me", state); $("#savedNote").textContent = "✓ Saved on this device"; }
      catch { $("#savedNote").textContent = "⚠️ Couldn't save (private browsing?). Your page will vanish when you close this tab."; }
    }, 300);
  }

  /* ---------- Sound + toast ---------- */
  let ctx;
  function boop(freq = 520, dur = 0.12, type = "square") {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(freq * 1.8, ctx.currentTime + dur);
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
    } catch {}
  }
  let toastT;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2800);
  }

  /* ---------- Photos: resize in the browser (also drops location data) ---------- */
  async function shrink(file) {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    return new Promise((res) => c.toBlob(res, "image/jpeg", 0.85));
  }
  async function addFiles(files) {
    const list = [...files].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    let room = MAX_IMAGES - state.images.length, failed = 0;
    if (room <= 0) return toast(`Max ${MAX_IMAGES} photos. Delete some first.`);
    if (list.length > room) toast(`Only adding ${room}. Max is ${MAX_IMAGES}.`);
    for (const f of list.slice(0, room)) {
      try {
        const blob = await shrink(f);
        state.images.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), blob });
      } catch { failed++; }
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
    if (!FIELDS.includes(e.target.name)) return;
    state[e.target.name] = e.target.value; render(); save();
  });
  const fillForm = () => FIELDS.forEach((f) => { form.elements[f].value = state[f] ?? ""; });

  /* ---------- Preview ---------- */
  const jb = $("#jb");
  const heroImg = () => state.images.find((i) => i.id === state.heroId) || state.images[0];
  const faceNode = (img) => {
    if (!img) return document.createTextNode("🤪");
    const el = new Image(); el.alt = ""; el.src = urlFor(img); return el;
  };

  function render() {
    const t = THEMES[state.theme] || THEMES.neon;
    for (const k of ["jbg", "a", "b", "c", "d"]) jb.style.setProperty(`--${k}`, t[k]);
    themeBox.querySelectorAll(".theme").forEach((b) => b.classList.toggle("on", b.dataset.key === state.theme));

    $("#pvName").textContent = (state.name || "YOUR NAME").toUpperCase();
    $("#pvLine2").textContent = (state.line2 || "").toUpperCase();
    $("#pvTag").textContent = state.tagline || "Daily chaos. Zero regrets.";
    ["sticker0", "sticker1", "sticker2"].forEach((k, i) => { $(`#pvS${i}`).textContent = state[k] || ""; });

    const face = $("#pvFace"); face.replaceChildren(faceNode(heroImg()));
    $("#pvBubble").textContent = lines(state.bubbles)[0] || "hi 👋";
    $("#pvSlot").replaceChildren(faceNode(heroImg()));

    const tickerItems = [...lines(state.bubbles), ...lines(state.moods)].slice(0, 12);
    const track = $("#pvTicker"); track.textContent = "";
    const items = tickerItems.length ? tickerItems : ["Your nonsense goes here"];
    for (let rep = 0; rep < 2; rep++) for (const s of items) { const sp = document.createElement("span"); sp.textContent = "✦ " + s; track.append(sp); }

    const wall = $("#pvWall"); wall.textContent = "";
    if (!state.images.length) {
      const p = document.createElement("p"); p.className = "jb-empty"; p.textContent = "Add photos to build your face wall 📸"; wall.append(p);
    }
    for (const img of state.images) {
      const b = document.createElement("button"); b.type = "button";
      b.style.setProperty("--r", (Math.random() * 8 - 4).toFixed(1) + "deg");
      b.append(faceNode(img));
      b.onclick = () => { face.replaceChildren(faceNode(img)); pop(face); boop(420); };
      wall.append(b);
    }
  }

  const pop = (el) => { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); };

  let count = 0;
  $("#pvFace").addEventListener("click", () => {
    const face = $("#pvFace"), bub = $("#pvBubble");
    if (state.images.length > 1) {
      const cur = face.querySelector("img")?.src; let img;
      do { img = pick(state.images); } while (urlFor(img) === cur);
      face.replaceChildren(faceNode(img));
    }
    const b = lines(state.bubbles); if (b.length) bub.textContent = pick(b);
    pop(face); pop(bub); boop(300 + Math.random() * 500);
    $("#pvCount").textContent = ++count;
  });

  let spinning = false;
  $("#pvSpin").addEventListener("click", () => {
    if (spinning) return;
    const moods = lines(state.moods); if (!moods.length) return toast("Add some mood captions first!");
    spinning = true;
    const slot = $("#pvSlot"), mood = $("#pvMood");
    slot.classList.add("spinning");
    let i = 0, delay = 50;
    const roll = () => {
      if (state.images.length) slot.replaceChildren(faceNode(pick(state.images)));
      mood.textContent = pick(moods); boop(200 + i * 25, .05); i++; delay *= 1.12;
      if (delay < 380) setTimeout(roll, delay);
      else { slot.classList.remove("spinning"); spinning = false; boop(880, .25, "sawtooth"); }
    };
    roll();
  });

  $("#pvGibBtn").addEventListener("click", () => {
    const p = $("#pvGib");
    p.textContent = `"${pick(GIB.starts)} ${pick(GIB.subjects)} ${pick(GIB.twists)}"`;
    pop(p); boop(260 + Math.random() * 300, .1, "sine");
  });

  /* ---------- Actions ---------- */
  const preview = $("#preview");
  $("#fullBtn").onclick = () => { preview.classList.add("full"); document.body.classList.add("pv-full"); };
  const exitFull = () => { preview.classList.remove("full"); document.body.classList.remove("pv-full"); };
  $("#exitFull").onclick = exitFull;
  addEventListener("keydown", (e) => { if (e.key === "Escape") exitFull(); });
  $("#shareBtn").onclick = () => toast("🔗 Sharing unlocks when sign-up arrives. Coming soon!");
  $("#resetBtn").onclick = async () => {
    if (!confirm("Delete your Jabari page and all its photos from this device?")) return;
    urls.forEach((u) => URL.revokeObjectURL(u)); urls.clear();
    state = { ...DEFAULTS, images: [], heroId: null };
    fillForm(); renderThumbs(); render(); save();
    toast("Fresh start 🧼");
  };

  /* ---------- Boot ---------- */
  (async () => {
    try {
      const saved = await DB.get("me");
      if (saved) state = { ...DEFAULTS, ...saved, images: saved.images || [] };
    } catch {}
    fillForm(); renderThumbs(); render();
  })();
})();
