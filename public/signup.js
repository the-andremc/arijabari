(() => {
  const $ = (s) => document.querySelector(s);
  let email = "";

  async function api(path, body) {
    const res = await fetch(path, body === undefined ? { credentials: "same-origin" } : {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({ ok: false, error: "Something went wrong. Try again." }));
    if (!res.ok && data.ok !== false) data.ok = false;
    return data;
  }

  function show(step) {
    document.querySelectorAll(".step").forEach((s) => { s.hidden = s.dataset.step !== step; });
    const order = ["email", "code", "claim", "done"], idx = order.indexOf(step);
    document.querySelectorAll("[data-dot]").forEach((d) => d.classList.toggle("on", order.indexOf(d.dataset.dot) <= idx));
    error("");
    const first = document.querySelector(`[data-step="${step}"] input`);
    if (first) setTimeout(() => first.focus(), 50);
  }
  function error(msg) { const e = $("#authError"); e.textContent = msg; e.hidden = !msg; }
  function busy(form, on) { form.querySelectorAll("button, input").forEach((el) => { el.disabled = on; }); }
  let toastT;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600);
  }

  function done(handle, signedInEmail) {
    $("#claimedLink").textContent = `arijabari.com/j/${handle}`;
    $("#signedInAs").textContent = signedInEmail;
    show("done");
  }

  /* 1. Email */
  $("#emailForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = $("#email").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) return error("That doesn't look like an email address.");
    busy(e.target, true);
    const r = await api("/api/auth/start", { email: val });
    busy(e.target, false);
    if (!r.ok) return error(r.error);
    email = val.toLowerCase();
    $("#sentTo").textContent = email;
    $("#code").value = "";
    show("code");
  });

  /* 2. Code */
  const codeInput = $("#code");
  codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6);
    if (codeInput.value.length === 6) $("#codeForm").requestSubmit();
  });
  $("#codeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (codeInput.value.length !== 6) return error("The code is 6 numbers.");
    busy(e.target, true);
    const r = await api("/api/auth/verify", { email, code: codeInput.value });
    busy(e.target, false);
    if (!r.ok) { codeInput.value = ""; codeInput.focus(); return error(r.error); }
    if (r.handle) done(r.handle, r.email); else show("claim");
  });
  let resendAt = 0;
  $("#resendBtn").addEventListener("click", async () => {
    const wait = Math.ceil((resendAt - Date.now()) / 1000);
    if (wait > 0) return toast(`Hang on ${wait}s before sending another.`);
    resendAt = Date.now() + 30000;
    const r = await api("/api/auth/start", { email });
    if (!r.ok) return error(r.error);
    error(""); toast("📨 New code sent!");
  });
  $("#changeEmail").addEventListener("click", () => show("email"));

  /* 3. Claim */
  const handleInput = $("#handle"), status = $("#handleStatus"), claimBtn = $("#claimBtn");
  let checkT, lastChecked = "";
  handleInput.addEventListener("input", () => {
    handleInput.value = handleInput.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const h = handleInput.value;
    claimBtn.disabled = true;
    clearTimeout(checkT);
    if (!h) { status.textContent = ""; status.className = "handle-status"; return; }
    status.textContent = "Checking…"; status.className = "handle-status";
    checkT = setTimeout(async () => {
      lastChecked = h;
      const r = await api(`/api/jabari/check?handle=${encodeURIComponent(h)}`);
      if (handleInput.value !== lastChecked) return;
      status.textContent = r.available ? "✅ It's free!" : `❌ ${r.reason}`;
      status.className = "handle-status " + (r.available ? "good" : "bad");
      claimBtn.disabled = !r.available;
    }, 350);
  });
  $("#claimForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    busy(e.target, true);
    const r = await api("/api/jabari/claim", { handle: handleInput.value });
    busy(e.target, false);
    if (!r.ok) { claimBtn.disabled = true; return error(r.error); }
    const me = await api("/api/me");
    done(r.handle, me.email || email);
  });

  /* Sign out */
  $("#logoutBtn").addEventListener("click", async () => {
    await api("/api/auth/logout", {});
    email = ""; $("#email").value = "";
    show("email"); toast("Signed out 👋");
  });

  /* Start: already signed in? */
  (async () => {
    const me = await api("/api/me");
    if (me.signedIn && me.handle) done(me.handle, me.email);
    else if (me.signedIn) { email = me.email; show("claim"); }
    else show("email");
  })();
})();
