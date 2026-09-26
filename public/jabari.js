// Shared bits for Jabari pages: themes, on-device drafts, sounds, and the page renderer
// used by the creator preview (/create) and published pages (/j/<name>).
window.JB = (() => {
  const THEMES = {
    neon:  { label: "Neon",  jbg: "#0d0b1a", a: "#ff2e88", b: "#22e4ff", c: "#c6ff00", d: "#ffe14d" },
    ocean: { label: "Ocean", jbg: "#041a2f", a: "#00a6ff", b: "#7cffcb", c: "#ffd23f", d: "#ffffff" },
    lava:  { label: "Lava",  jbg: "#1a0505", a: "#ff4d00", b: "#ffb800", c: "#ff9e7a", d: "#fff1c1" },
    toxic: { label: "Toxic", jbg: "#06130a", a: "#9d2bff", b: "#39ff14", c: "#39ff14", d: "#fff200" },
    candy: { label: "Candy", jbg: "#2b0a3d", a: "#ff5ccd", b: "#9be7ff", c: "#b8ff9f", d: "#fff07a" },
    mono:  { label: "Mono",  jbg: "#111111", a: "#ff3b3b", b: "#ffffff", c: "#ffffff", d: "#ffffff" },
  };

  // Drafts (with photos) are too big for localStorage, so they live in IndexedDB on this device.
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
  const pop = (el) => { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const lines = (s) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);

  function toast(msg) {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2800);
  }

  const SKELETON = `
    <div class="jb-hero">
      <h2 class="jb-title"><span class="l1"></span><span class="l2"></span></h2>
      <p class="jb-tag"></p>
      <div class="jb-social"></div>
      <div class="jb-face-wrap">
        <button class="jb-face" type="button" aria-label="Click to change face"></button>
        <div class="jb-bubble"></div>
        <span class="jb-sticker k0"></span><span class="jb-sticker k1"></span><span class="jb-sticker k2"></span>
        <div class="jb-count"><span>0</span> faces pulled</div>
      </div>
    </div>
    <div class="jb-ticker"><div class="jb-ticker-track"></div></div>
    <section class="jb-sec">
      <h3>MOOD ROULETTE</h3>
      <div class="jb-roulette">
        <div class="jb-slot"></div>
        <p class="jb-mood">Press spin. If you dare.</p>
        <button class="btn btn-lime jb-spin" type="button">🎰 SPIN</button>
      </div>
    </section>
    <section class="jb-sec">
      <h3>THE FACE WALL</h3>
      <div class="jb-wall"></div>
    </section>
    <section class="jb-sec">
      <h3>GIBBERISH GENERATOR</h3>
      <div class="jb-gib">
        <p>"So basically right, the toaster looked at me funny."</p>
        <button class="btn btn-hot" type="button">🌀 Generate</button>
      </div>
    </section>
    <div class="jb-extra"></div>
    <p class="jb-foot">Made with <b>Create Your Own Jabari</b> · <a href="/">arijabari.com</a></p>`;

  // Draws an interactive Jabari page into `root`. Call update(state) whenever the data changes.
  // state: { name, line2, tagline, theme, sticker0-2, bubbles, moods, images: [{id, url|blob}], heroId }
  function page(root, { urlFor = (img) => img.url } = {}) {
    root.classList.add("jb");
    root.innerHTML = SKELETON;
    const q = (s) => root.querySelector(s);
    let st = { images: [] }, count = 0, spinning = false;

    const heroImg = () => st.images.find((i) => i.id === st.heroId) || st.images[0];
    const faceNode = (img) => {
      if (!img) return document.createTextNode("🤪");
      const el = new Image(); el.alt = ""; el.src = urlFor(img); return el;
    };

    q(".jb-face").addEventListener("click", () => {
      const face = q(".jb-face"), bub = q(".jb-bubble");
      if (st.images.length > 1) {
        const cur = face.querySelector("img")?.src; let img;
        do { img = pick(st.images); } while (new URL(urlFor(img), location.href).href === cur);
        face.replaceChildren(faceNode(img));
      }
      const b = lines(st.bubbles); if (b.length) bub.textContent = pick(b);
      pop(face); pop(bub); boop(300 + Math.random() * 500);
      q(".jb-count span").textContent = ++count;
    });

    q(".jb-spin").addEventListener("click", () => {
      if (spinning) return;
      const moods = lines(st.moods); if (!moods.length) return toast("No mood captions yet!");
      spinning = true;
      const slot = q(".jb-slot"), mood = q(".jb-mood");
      slot.classList.add("spinning");
      let i = 0, delay = 50;
      const roll = () => {
        if (st.images.length) slot.replaceChildren(faceNode(pick(st.images)));
        mood.textContent = pick(moods); boop(200 + i * 25, .05); i++; delay *= 1.12;
        if (delay < 380) setTimeout(roll, delay);
        else { slot.classList.remove("spinning"); spinning = false; boop(880, .25, "sawtooth"); }
      };
      roll();
    });

    q(".jb-gib button").addEventListener("click", () => {
      const p = q(".jb-gib p");
      p.textContent = `"${pick(GIB.starts)} ${pick(GIB.subjects)} ${pick(GIB.twists)}"`;
      pop(p); boop(260 + Math.random() * 300, .1, "sine");
    });

    function update(state) {
      st = state;
      const t = THEMES[st.theme] || THEMES.neon;
      for (const k of ["jbg", "a", "b", "c", "d"]) root.style.setProperty(`--${k}`, t[k]);
      q(".l1").textContent = (st.name || "YOUR NAME").toUpperCase();
      q(".l2").textContent = (st.line2 || "").toUpperCase();
      q(".jb-tag").textContent = st.tagline || "Daily chaos. Zero regrets.";
      root.querySelectorAll(".jb-sticker").forEach((el, i) => { el.textContent = st[`sticker${i}`] || ""; });
      q(".jb-face").replaceChildren(faceNode(heroImg()));
      q(".jb-bubble").textContent = lines(st.bubbles)[0] || "hi 👋";
      q(".jb-slot").replaceChildren(faceNode(heroImg()));

      const items = [...lines(st.bubbles), ...lines(st.moods)].slice(0, 12);
      const track = q(".jb-ticker-track"); track.textContent = "";
      for (let rep = 0; rep < 2; rep++) for (const s of (items.length ? items : ["Nonsense loading…"])) {
        const sp = document.createElement("span"); sp.textContent = "✦ " + s; track.append(sp);
      }

      const wall = q(".jb-wall"); wall.textContent = "";
      if (!st.images.length) {
        const p = document.createElement("p"); p.className = "jb-empty"; p.textContent = "No faces yet 📸"; wall.append(p);
      }
      for (const img of st.images) {
        const b = document.createElement("button"); b.type = "button";
        b.style.setProperty("--r", (Math.random() * 8 - 4).toFixed(1) + "deg");
        b.append(faceNode(img));
        b.onclick = () => { const f = q(".jb-face"); f.replaceChildren(faceNode(img)); pop(f); boop(420); };
        wall.append(b);
      }
    }

    return { update, social: q(".jb-social"), extra: q(".jb-extra") };
  }

  async function api(path, body, method) {
    const opts = { credentials: "same-origin" };
    if (body !== undefined) {
      opts.method = method || "POST";
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    } else if (method) opts.method = method;
    try {
      const res = await fetch(path, opts);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, status: res.status, error: data.error || "Something went wrong. Try again." };
      return data;
    } catch { return { ok: false, error: "You're offline. Try again when you're back online." }; }
  }

  const fmt = (n) => Number(n || 0).toLocaleString("en-AU"); // exact counts, never "1.2K"

  return { THEMES, DB, page, boop, pop, pick, lines, toast, api, fmt };
})();
