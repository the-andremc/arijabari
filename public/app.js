(() => {
  const $ = (s) => document.querySelector(s);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const faceSrc = (n) => `/media/faces/face-${String(n).padStart(2, "0")}.jpg`;
  const randFace = () => 1 + Math.floor(Math.random() * FACE_COUNT);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  // Preload faces so clicks feel instant
  for (let i = 1; i <= FACE_COUNT; i++) new Image().src = faceSrc(i);

  /* ---------- Sound (tiny synth, no files) ---------- */
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

  /* ---------- Confetti ---------- */
  const cv = $("#confetti"), cx = cv.getContext("2d");
  let bits = [], raf;
  const resize = () => { cv.width = innerWidth; cv.height = innerHeight; };
  resize(); addEventListener("resize", resize);
  function confetti(x = innerWidth / 2, y = innerHeight / 3, n = 120) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cols = ["#ff2e88", "#c6ff00", "#22e4ff", "#ffe14d", "#8b5cff"];
    for (let i = 0; i < n; i++) bits.push({
      x, y, vx: (Math.random() - .5) * 14, vy: Math.random() * -14 - 4,
      r: Math.random() * 360, vr: (Math.random() - .5) * 20, s: 6 + Math.random() * 8,
      c: pick(cols), life: 120,
    });
    if (!raf) tick();
  }
  function tick() {
    cx.clearRect(0, 0, cv.width, cv.height);
    bits = bits.filter((b) => b.life-- > 0 && b.y < cv.height + 20);
    for (const b of bits) {
      b.vy += .45; b.vx *= .99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
      cx.save(); cx.translate(b.x, b.y); cx.rotate(b.r * Math.PI / 180);
      cx.fillStyle = b.c; cx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); cx.restore();
    }
    raf = bits.length ? requestAnimationFrame(tick) : (cx.clearRect(0, 0, cv.width, cv.height), null);
  }

  /* ---------- Toast ---------- */
  let toastT;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* ---------- Hero face ---------- */
  let faceCount = store.get("faces", 0);
  $("#faceCount").textContent = faceCount;
  $("#heroFace").addEventListener("click", (e) => {
    const img = $("#heroFaceImg"), face = $("#heroFace"), bub = $("#heroBubble");
    let n; do { n = randFace(); } while (img.src.endsWith(faceSrc(n)));
    img.src = faceSrc(n);
    bub.textContent = pick(BUBBLES);
    [face, bub].forEach((el) => { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); });
    boop(300 + Math.random() * 500);
    faceCount++; store.set("faces", faceCount); $("#faceCount").textContent = faceCount;
    if (faceCount % 10 === 0) { confetti(e.clientX, e.clientY); toast(`🏆 ${faceCount} faces! You're officially a fan.`); }
  });

  /* ---------- Ticker ---------- */
  const tickerHTML = TICKER.map((t) => `<span>${t}</span>`).join("");
  $("#ticker").innerHTML = tickerHTML + tickerHTML;

  /* ---------- Stat counters ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target, end = +el.dataset.count, t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / 1400);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString();
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step); io.unobserve(el);
    });
  }, { threshold: .6 });
  document.querySelectorAll("[data-count]").forEach((el) => io.observe(el));

  /* ---------- Episodes ---------- */
  const player = $("#player"), frame = $("#playerFrame");
  let currentDay;
  function loadEpisode(ep, autoplay) {
    player.src = ep.video; player.poster = ep.poster;
    frame.classList.toggle("wide", !ep.vertical);
    $("#latestTag").textContent = `DAY ${ep.day}${ep === EPISODES[0] ? " · NEW" : ""}`;
    $("#latestTitle").textContent = ep.title;
    $("#latestDesc").textContent = ep.desc;
    loadReactions(ep.day);
    document.querySelectorAll(".ep").forEach((b) => b.classList.toggle("playing", +b.dataset.day === ep.day));
    if (autoplay) { $("#latest").scrollIntoView({ behavior: "smooth" }); player.play().catch(() => {}); }
  }
  $("#epGrid").innerHTML = EPISODES.map((ep, i) => `
    <button class="ep" data-i="${i}" data-day="${ep.day}">
      <div class="ep-thumb">
        <img src="${ep.poster}" alt="" loading="lazy">
        <span class="day">DAY ${ep.day}</span>
        ${i === 0 ? '<span class="now">NEW</span>' : ""}
        <span class="play">▶</span>
      </div>
      <div class="ep-body"><h4>${ep.title}</h4><p>${ep.desc}</p></div>
    </button>`).join("");
  $("#epGrid").addEventListener("click", (e) => {
    const b = e.target.closest(".ep"); if (b) loadEpisode(EPISODES[+b.dataset.i], true);
  });
  loadEpisode(EPISODES[0], false);

  /* ---------- Reactions (saved per viewer) ---------- */
  function loadReactions(day) {
    currentDay = day;
    const r = store.get(`react-${day}`, {});
    document.querySelectorAll("[data-react]").forEach((b) => { b.querySelector("span").textContent = r[b.dataset.react] || 0; });
  }
  $("#reactBar").addEventListener("click", (e) => {
    const b = e.target.closest("[data-react]"); if (!b) return;
    const key = `react-${currentDay}`, r = store.get(key, {}), em = b.dataset.react;
    r[em] = (r[em] || 0) + 1; store.set(key, r); b.querySelector("span").textContent = r[em];
    const f = document.createElement("span"); f.className = "float-emoji"; f.textContent = em;
    f.style.left = e.clientX - 16 + "px"; f.style.top = e.clientY - 20 + "px";
    document.body.append(f); setTimeout(() => f.remove(), 1100);
    boop(700, .08, "triangle");
  });

  /* ---------- Mood roulette ---------- */
  let spinning = false;
  $("#spinBtn").addEventListener("click", () => {
    if (spinning) return; spinning = true;
    const img = $("#slotImg"), slot = img.parentElement, mood = $("#moodText");
    slot.classList.add("spinning");
    let i = 0, delay = 50;
    const roll = () => {
      img.src = faceSrc(randFace()); mood.textContent = pick(MOODS); boop(200 + i * 25, .05);
      i++; delay *= 1.12;
      if (delay < 380) setTimeout(roll, delay);
      else {
        slot.classList.remove("spinning"); spinning = false; boop(880, .25, "sawtooth");
        const r = slot.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2, 70);
      }
    };
    roll();
  });

  /* ---------- Face wall + lightbox ---------- */
  const wall = $("#faceWall");
  const faces = Array.from({ length: FACE_COUNT }, (_, i) => i + 1).sort(() => Math.random() - .5);
  wall.innerHTML = faces.map((n) => `
    <button class="face-tile" data-n="${n}" style="--r:${(Math.random() * 8 - 4).toFixed(1)}deg" aria-label="Open face ${n}">
      <img src="${faceSrc(n)}" alt="" loading="lazy">
    </button>`).join("");
  const lb = $("#lightbox");
  wall.addEventListener("click", (e) => {
    const t = e.target.closest(".face-tile"); if (!t) return;
    $("#lbImg").src = faceSrc(t.dataset.n); $("#lbCap").textContent = pick(MOODS);
    lb.hidden = false; boop(420);
  });
  const closeLb = () => { lb.hidden = true; };
  lb.addEventListener("click", (e) => { if (e.target === lb || e.target.closest(".lb-close")) closeLb(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeLb(); });

  /* ---------- Gibberish ---------- */
  $("#gibBtn").addEventListener("click", () => {
    const t = $("#gibText");
    t.textContent = `"${pick(GIB.starts)} ${pick(GIB.subjects)} ${pick(GIB.twists)}"`;
    t.classList.remove("pop"); void t.offsetWidth; t.classList.add("pop");
    boop(260 + Math.random() * 300, .1, "sine");
  });
  $("#gibCopy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("#gibText").textContent); toast("Copied! Go confuse your friends 😂"); }
    catch { toast("Couldn't copy. Just yell it instead."); }
  });

  /* ---------- Subscribe / bell (no data collected) ---------- */
  let subbed = store.get("subbed", false);
  const syncSub = () => document.querySelectorAll(".sub-btn").forEach((b) => {
    b.classList.toggle("on", subbed); b.textContent = subbed ? "Subscribed ✓" : "Subscribe";
  });
  syncSub();
  document.querySelectorAll("[data-subscribe]").forEach((b) => b.addEventListener("click", (e) => {
    subbed = !subbed; store.set("subbed", subbed); syncSub();
    if (subbed) {
      confetti(e.clientX, e.clientY, 160); boop(660, .2, "triangle");
      toast("🔔 You're in! (The YouTube channel is coming soon.)");
      b.classList.remove("ringing"); void b.offsetWidth; b.classList.add("ringing");
    } else toast("Unsubscribed 😢 He'll get over it. Probably.");
  }));

  $("#yr").textContent = new Date().getFullYear();

  /* ---------- Web app: offline + install ---------- */
  if ("serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const installBtn = $("#installBtn"), sheet = $("#iosSheet");
  let deferred = null;

  if (!standalone) {
    if (isIOS) installBtn.hidden = false;
    addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; installBtn.hidden = false; });
  }
  installBtn.addEventListener("click", async () => {
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      if (outcome === "accepted") installBtn.hidden = true;
    } else if (isIOS) {
      sheet.hidden = false;
    }
  });
  sheet.addEventListener("click", (e) => { if (e.target === sheet || e.target.closest("#iosClose")) sheet.hidden = true; });
  addEventListener("appinstalled", () => {
    installBtn.hidden = true; confetti(); toast("📲 Ari is on your home screen!");
  });
})();
