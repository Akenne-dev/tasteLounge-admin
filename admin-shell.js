// Shared admin page furniture. Load after admin-auth.js on every admin page.
//  1. Fills <nav data-admin-nav></nav> with the menu (staff only see their pages) + Log out.
//  2. New-order alert: a sound, a pop-up and (if allowed) a browser notification the
//     moment a customer places an order. The 🔔 button turns the sound on/off.
(function () {
  const NAV = [
    { href: "admin-dashboard.html", label: "Dashboard", staff: true },
    { href: "admin-orders.html", label: "Orders", staff: true },
    { href: "admin-reports.html", label: "Sales" },
    { href: "admin-foods.html", label: "Foods" },
    { href: "admin-categories.html", label: "Categories" },
    { href: "admin-extras.html", label: "Extras" },
    { href: "admin-promos.html", label: "Promo codes" },
    { href: "admin-reviews.html", label: "Reviews" },
    { href: "admin-website.html", label: "Website" },
    { href: "admin-settings.html", label: "Store Settings" },
    { href: "admin-users.html", label: "Customers" },
    { href: "admin-staff.html", label: "Staff" },
  ];
  const SOUND_KEY = "tl-admin:sound";
  const db = firebase.firestore();
  const page = (location.pathname.split("/").pop() || "admin-dashboard.html").toLowerCase();

  const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
  const money = (n) => "₦" + Number(n || 0).toLocaleString("en-US");

  /* ---------------- styles ---------------- */
  const style = document.createElement("style");
  style.textContent = `
    html[data-role="staff"] [data-admin-only] { display: none !important; }
    .nav-logout { background: none; border: 1px solid rgba(255,255,255,.5); color: #fff; border-radius: 999px;
      padding: 6px 12px; font: inherit; font-size: 13px; cursor: pointer; white-space: nowrap; }
    .nav-logout:hover { background: rgba(255,255,255,.15); }
    .tl-bell { position: fixed; left: 16px; bottom: 16px; z-index: 5000; width: 52px; height: 52px; border-radius: 50%;
      border: 0; background: #1f1f1f; color: #fff; font-size: 22px; cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,.25); }
    .tl-bell.off { background: #9e9e9e; }
    .tl-bell:focus-visible, .tl-alert button:focus-visible, .nav-logout:focus-visible { outline: 3px solid #FBC02D; outline-offset: 2px; }
    .tl-bell .dot { position: absolute; top: 6px; right: 6px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9px;
      background: #e53935; color: #fff; font: 700 11px/18px Arial, sans-serif; display: none; }
    .tl-bell.has-new .dot { display: block; }
    .tl-alerts { position: fixed; top: 76px; right: 16px; z-index: 5001; display: flex; flex-direction: column; gap: 10px;
      width: min(360px, calc(100vw - 32px)); }
    .tl-alert { background: #fff; color: #1f1f1f; border-radius: 14px; padding: 14px 16px; border-left: 6px solid #e53935;
      box-shadow: 0 14px 40px rgba(0,0,0,.22); font-family: Inter, system-ui, Arial, sans-serif; animation: tlAlertIn .35s ease; }
    .tl-alert h4 { margin: 0 0 4px; font-size: 15px; display: flex; justify-content: space-between; gap: 8px; }
    .tl-alert p { margin: 0 0 10px; font-size: 13px; color: #555; line-height: 1.4; }
    .tl-alert .row { display: flex; gap: 8px; }
    .tl-alert button, .tl-alert a { flex: 1; text-align: center; border: 0; border-radius: 999px; padding: 8px 10px;
      font: 600 13px Inter, system-ui, Arial, sans-serif; cursor: pointer; text-decoration: none; }
    .tl-alert a { background: #e53935; color: #fff; }
    .tl-alert button { background: #f1f1f1; color: #1f1f1f; }
    @keyframes tlAlertIn { from { transform: translateX(30px); opacity: 0 } to { transform: none; opacity: 1 } }
    @keyframes tlRing { 0%,100% { transform: rotate(0) } 20% { transform: rotate(-18deg) } 40% { transform: rotate(16deg) } 60% { transform: rotate(-10deg) } 80% { transform: rotate(6deg) } }
    .tl-bell.ring { animation: tlRing .9s ease 2; }`;
  document.head.appendChild(style);

  /* ---------------- navigation ---------------- */
  function renderNav(role) {
    document.querySelectorAll("[data-admin-nav]").forEach((nav) => {
      nav.innerHTML = NAV.filter((l) => role === "admin" || l.staff)
        .map((l) => `<a href="${l.href}"${l.href === page ? ' class="active" aria-current="page"' : ""}>${l.label}</a>`)
        .join("") + `<button type="button" class="nav-logout" data-logout>Log out</button>`;
    });
  }

  document.addEventListener("click", async (e) => {
    if (!e.target.closest("[data-logout]")) return;
    await firebase.auth().signOut();
    location.href = "index.html";
  });

  /* ---------------- sound ---------------- */
  let audio = null;
  let soundOn = (() => {
    try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch (e) { return true; }
  })();

  // Browsers only allow sound after you've clicked somewhere on the page.
  function unlockAudio() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
    } catch (e) { }
  }
  ["pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, unlockAudio, { passive: true }));

  function chime() {
    if (!soundOn || !audio || audio.state !== "running") return;
    const notes = [880, 1175, 1568, 880, 1175, 1568];
    notes.forEach((freq, i) => {
      const t = audio.currentTime + i * 0.16 + (i >= 3 ? 0.35 : 0);
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  }

  /* ---------------- bell + pop-ups ---------------- */
  let bell, alertsBox, unseen = 0;
  const baseTitle = document.title;

  function updateBell() {
    bell.classList.toggle("off", !soundOn);
    bell.textContent = soundOn ? "🔔" : "🔕";
    bell.title = soundOn ? "New-order sound is on (click to mute)" : "New-order sound is off (click to turn on)";
    bell.setAttribute("aria-label", bell.title);
    bell.setAttribute("aria-pressed", String(soundOn));
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.textContent = unseen > 9 ? "9+" : String(unseen);
    bell.appendChild(dot);
    bell.classList.toggle("has-new", unseen > 0);
  }

  function buildBell() {
    bell = document.createElement("button");
    bell.type = "button";
    bell.className = "tl-bell";
    bell.onclick = () => {
      unlockAudio();
      soundOn = !soundOn;
      try { localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off"); } catch (e) { }
      if (soundOn && "Notification" in window && Notification.permission === "default") Notification.requestPermission();
      unseen = 0;
      document.title = baseTitle;
      updateBell();
      if (soundOn) chime();
    };
    document.body.appendChild(bell);
    alertsBox = document.createElement("div");
    alertsBox.className = "tl-alerts";
    alertsBox.setAttribute("aria-live", "assertive");
    document.body.appendChild(alertsBox);
    updateBell();
  }

  function clearUnseen() {
    if (document.hidden) return;
    unseen = 0;
    document.title = baseTitle;
    if (bell) updateBell();
  }
  document.addEventListener("visibilitychange", clearUnseen);
  window.addEventListener("focus", clearUnseen);

  function announce(id, o) {
    const short = id.slice(0, 4).toUpperCase();
    const items = (o.items || []).reduce((n, i) => n + (Number(i.quantity ?? i.qty) || 1), 0);
    const who = (o.delivery && o.delivery.name) || "A customer";
    const total = money(o.pricing && o.pricing.total);

    const card = document.createElement("div");
    card.className = "tl-alert";
    card.setAttribute("role", "alert");
    card.innerHTML = `
      <h4><span>🔔 New order #${escapeHtml(short)}</span><span>${escapeHtml(total)}</span></h4>
      <p>${escapeHtml(who)} · ${items} item${items === 1 ? "" : "s"}${o.deliveryType === "express" ? " · ⚡ Express" : ""}</p>
      <div class="row"><a href="order-details.html?id=${encodeURIComponent(id)}">View order</a><button type="button">Dismiss</button></div>`;
    card.querySelector("button").onclick = () => card.remove();
    alertsBox.prepend(card);
    while (alertsBox.children.length > 4) alertsBox.lastChild.remove();

    chime();
    bell.classList.remove("ring");
    void bell.offsetWidth;
    bell.classList.add("ring");
    if (document.hidden || !document.hasFocus()) {
      unseen++;
      document.title = `(${unseen}) New order! — ${baseTitle}`;
    }
    updateBell();

    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      try {
        const n = new Notification(`New order #${short} — ${total}`, { body: `${who} · ${items} item${items === 1 ? "" : "s"}`, tag: id });
        n.onclick = () => { window.focus(); location.href = `order-details.html?id=${encodeURIComponent(id)}`; };
      } catch (e) { }
    }
    document.dispatchEvent(new CustomEvent("admin:new-order", { detail: { id, order: o } }));
  }

  // Watch the newest orders; anything that appears after the page opened is new.
  function watchOrders() {
    let first = true;
    db.collection("orders").orderBy("createdAt", "desc").limit(15).onSnapshot((snap) => {
      if (first) {
        first = false;
        return;
      }
      snap.docChanges().forEach((ch) => {
        if (ch.type !== "added" || ch.doc.metadata.hasPendingWrites) return;
        const o = ch.doc.data();
        // an old order sliding into the list (e.g. after a delete) isn't new
        const placed = o.createdAt && o.createdAt.toMillis ? o.createdAt.toMillis() : Date.now();
        if (Date.now() - placed > 15 * 60 * 1000) return;
        announce(ch.doc.id, o);
      });
    }, (err) => console.warn("New-order alerts unavailable:", err.message));
  }

  if (window.adminReady) {
    window.adminReady.then(({ role }) => {
      renderNav(role);
      buildBell();
      watchOrders();
    });
  }
})();
