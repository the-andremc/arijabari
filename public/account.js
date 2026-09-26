// Shows sign-in state in the nav (and on the create page). Safe to load on any page.
(async () => {
  let me = { signedIn: false };
  try {
    const r = await fetch("/api/me", { credentials: "same-origin" });
    if (r.ok) me = await r.json();
  } catch {}

  const link = document.getElementById("accountLink");
  if (link) {
    if (me.signedIn && me.handle) { link.textContent = `👤 ${me.handle}`; link.classList.add("in"); }
    else if (me.signedIn) { link.textContent = "Claim your name"; }
    link.href = "/signup";
  }

  const note = document.getElementById("acctNote");
  if (note) {
    note.textContent = "";
    const a = document.createElement("a"); a.href = "/signup";
    if (me.signedIn && me.handle) {
      note.append(`✅ You've claimed arijabari.com/j/${me.handle}. Publishing your page there is coming soon.`);
    } else if (me.signedIn) {
      note.append("You're signed in. "); a.textContent = "Claim your Jabari name →"; note.append(a);
    } else {
      a.textContent = "Sign up to claim your Jabari name →"; note.append(a);
    }
  }
})();
