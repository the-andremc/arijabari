// Shared bits for Jabari pages: themes, on-device storage, example pages.
window.JB = (() => {
  const THEMES = {
    neon:  { label: "Neon",  jbg: "#0d0b1a", a: "#ff2e88", b: "#22e4ff", c: "#c6ff00", d: "#ffe14d" },
    ocean: { label: "Ocean", jbg: "#041a2f", a: "#00a6ff", b: "#7cffcb", c: "#ffd23f", d: "#ffffff" },
    lava:  { label: "Lava",  jbg: "#1a0505", a: "#ff4d00", b: "#ffb800", c: "#ff9e7a", d: "#fff1c1" },
    toxic: { label: "Toxic", jbg: "#06130a", a: "#9d2bff", b: "#39ff14", c: "#39ff14", d: "#fff200" },
    candy: { label: "Candy", jbg: "#2b0a3d", a: "#ff5ccd", b: "#9be7ff", c: "#b8ff9f", d: "#fff07a" },
    mono:  { label: "Mono",  jbg: "#111111", a: "#ff3b3b", b: "#ffffff", c: "#ffffff", d: "#ffffff" },
  };

  // Photos are too big for localStorage, so pages live in IndexedDB on this device.
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

  // Emoji "faces" for the example pages (no real people in examples).
  const emojiFace = (emoji, bg) => "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="${bg}"/>` +
    `<text x="150" y="215" font-size="190" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`
  );

  const EXAMPLES = {
    kevin: {
      name: "KEVIN", line2: "THE FISH", tagline: "Three second memory. Unlimited opinions.", theme: "ocean",
      sticker0: "FISH FACTS", sticker1: "WET", sticker2: "BOWL LIFE",
      faces: ["🐟", "🐠", "🐡", "🫧", "🦈", "🐙"],
      bubbles: "blub\nwait who are you\nblub blub (angrily)\nis this the same castle\nnew bowl who dis",
      moods: "Forgot what I was doing. Again.\nWhen someone taps the glass\nFood flakes incoming\nPretending to be a shark\nSwimming in circles (professionally)",
    },
    nugget: {
      name: "SIR", line2: "NUGGET", tagline: "Fried. Golden. Dangerously confident.", theme: "lava",
      sticker0: "CRISPY", sticker1: "DIP ME", sticker2: "LEGEND",
      faces: ["🍗", "🍟", "😎", "🔥", "🥫", "👑"],
      bubbles: "dip responsibly\nI'm not chicken, YOU'RE chicken\nsauce me\nten piece energy\nhot and ready",
      moods: "When they pick the last nugget\nSauce shortage. Panic.\nFreshly fried and feeling it\nCrispy on the outside, soft on the inside\nKing of the kids' menu",
    },
    robo: {
      name: "ROBO", line2: "JABARI", tagline: "Beep boop. Mostly boop.", theme: "toxic",
      sticker0: "100% METAL", sticker1: "NEEDS UPDATE", sticker2: "BATTERY LOW",
      faces: ["🤖", "👾", "🛸", "⚡", "🔋", "🧠"],
      bubbles: "beep\nboop\ncomputing…\nerror 404: chill not found\ndoes not compute",
      moods: "Updating… 1 of 9,999\nBattery at 2%, vibes at 100%\nWhen the wifi password is wrong\nDancing robot mode: ON\nRebooting brain.exe",
    },
  };

  // Turn an example into the same shape as a saved page.
  function exampleState(key) {
    const ex = EXAMPLES[key]; if (!ex) return null;
    const bg = (THEMES[ex.theme] || THEMES.neon).a;
    const images = ex.faces.map((e, i) => ({ id: `${key}-${i}`, url: emojiFace(e, bg) }));
    return { ...ex, images, heroId: images[0].id, example: key };
  }

  return { THEMES, DB, EXAMPLES, exampleState };
})();
