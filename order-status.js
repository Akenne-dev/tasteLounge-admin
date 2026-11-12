/* Order status — shared by the customer app and the admin.
 * TasteLounge-Admin has an identical copy of this file: keep the two the same.
 *
 * The kitchen moves each order along in Admin → Orders; customers see it live.
 *   Delivery: paid → processing → out_for_delivery → delivered
 *   Pickup:   paid → processing → ready            → delivered (shown as "Picked up")
 *   Any order can be cancelled.
 *
 *   tlIsPickup(order)                    true when the customer collects the order
 *   tlStatusOf(order)                    the current status value
 *   tlStatusLabel(order, status, admin)  "Ready for pickup", "Picked up", "New order" (admin) …
 *   tlStatusOptions(order)               [[value, label]] for the admin's status dropdown
 *   tlStatusMessage(order)               the sentence the customer sees
 *   tlStatusTracker(order)               HTML for the customer's progress tracker
 *   tlStatusAlert(order, id)             { title, body, important } when an order moves along
 *   tlStatusUpdate(next, serverTime)     the Firestore update for a status change (keeps the times)
 *   tlWhatsAppText(order, id)            a message for the customer about the current status
 *   tlWhatsAppLink(phone, text)          wa.me link to that message (null if the phone looks wrong)
 */
const TL_STATUS = {
  paid: { label: "Order received", short: "Received", admin: "New order", icon: "🧾" },
  processing: { label: "Processing", short: "Processing", admin: "Processing", icon: "👩‍🍳" },
  ready: { label: "Ready for pickup", short: "Ready for pickup", admin: "Ready for pickup", icon: "🛍️" },
  out_for_delivery: { label: "Out for delivery", short: "Out for delivery", admin: "Out for delivery", icon: "🛵" },
  delivered: { label: "Delivered", short: "Delivered", admin: "Delivered", icon: "✅" },
  cancelled: { label: "Cancelled", short: "Cancelled", admin: "Cancelled", icon: "✕" },
};

// Customers type local numbers like 0803 123 4567; WhatsApp links need the country code.
const TL_PHONE_COUNTRY = "234";

function tlIsPickup(o) {
  return !!o && o.deliveryType === "pickup";
}

function tlStatusOf(o) {
  return (o && o.status && o.status.current) || "paid";
}

function tlStatusLabel(o, status, forAdmin) {
  const st = status || tlStatusOf(o);
  if (st === "delivered" && tlIsPickup(o)) return "Picked up";
  const def = TL_STATUS[st];
  return def ? (forAdmin ? def.admin : def.label) : String(st).replace(/_/g, " ");
}

function tlStatusFlow(o) {
  return ["paid", "processing", tlIsPickup(o) ? "ready" : "out_for_delivery", "delivered"];
}

function tlStatusOptions(o) {
  const list = [...tlStatusFlow(o), "cancelled"];
  const st = tlStatusOf(o);
  if (!list.includes(st)) list.splice(2, 0, st); // keep an unusual current value selectable
  return list.map((v) => [v, tlStatusLabel(o, v, true)]);
}

// When the order reached a status (Admin saves status.times.<status>)
function tlStatusTime(o, st) {
  const t = o && o.status && o.status.times && o.status.times[st];
  if (t && t.toDate) return t.toDate();
  if (st === "paid" && o && o.createdAt && o.createdAt.toDate) return o.createdAt.toDate();
  return null;
}

function tlStatusMessage(o) {
  const pickup = tlIsPickup(o);
  const where = pickup ? o.pickup && o.pickup.address : o.delivery && o.delivery.address;
  switch (tlStatusOf(o)) {
    case "paid": return "We've got your order. The kitchen will start on it shortly.";
    case "processing": return "The kitchen is preparing your food.";
    case "ready": return `Your order is ready! Come and pick it up${where ? " at " + where : ""}.`;
    case "out_for_delivery": return `Your order is on its way${where ? " to " + where : ""}.`;
    case "delivered": return pickup ? "Picked up. Enjoy your meal!" : "Delivered. Enjoy your meal!";
    case "cancelled": return "This order was cancelled. Please contact us if you have any questions.";
    default: return "";
  }
}

function tlStatusAlert(o, id) {
  const n = "#" + String(id).slice(0, 4).toUpperCase();
  const pickup = tlIsPickup(o);
  switch (tlStatusOf(o)) {
    case "processing": return { title: `👩‍🍳 Order ${n} is being prepared`, body: "The kitchen has started on your food.", important: false };
    case "ready": return { title: `🛍️ Order ${n} is ready for pickup!`, body: tlStatusMessage(o), important: true };
    case "out_for_delivery": return { title: `🛵 Order ${n} is on its way!`, body: tlStatusMessage(o), important: true };
    case "delivered": return { title: `✅ Order ${n} ${pickup ? "picked up" : "delivered"}`, body: "Enjoy your meal! You can rate your dishes from the receipt.", important: false };
    case "cancelled": return { title: `Order ${n} was cancelled`, body: tlStatusMessage(o), important: true };
    default: return null;
  }
}

function tlStatusUpdate(next, serverTime) {
  return { "status.current": next, [`status.times.${next}`]: serverTime, updatedAt: serverTime };
}

function tlWhatsAppText(o, id) {
  const first = String((o.delivery && o.delivery.name) || "").trim().split(/\s+/)[0];
  const n = "#" + String(id).slice(0, 4).toUpperCase();
  const hi = `Hi${first ? " " + first : ""}, `;
  switch (tlStatusOf(o)) {
    case "processing": return `${hi}we're preparing your Taste Lounge order ${n} now.`;
    case "ready": return `${hi}your Taste Lounge order ${n} is ready for pickup${o.pickup && o.pickup.address ? " at " + o.pickup.address : ""}. See you soon!`;
    case "out_for_delivery": return `${hi}your Taste Lounge order ${n} is on its way to you!`;
    case "delivered": return `${hi}thank you for ordering from Taste Lounge! We hope you enjoy order ${n}.`;
    case "cancelled": return `${hi}this is Taste Lounge about your order ${n}.`;
    default: return `${hi}we've received your Taste Lounge order ${n}. We'll let you know when it's ${tlIsPickup(o) ? "ready for pickup" : "on its way"}.`;
  }
}

function tlWhatsAppLink(phone, text) {
  const raw = String(phone || "").trim();
  let d = raw.replace(/\D/g, "");
  if (!raw.startsWith("+")) {
    if (d.startsWith("00")) d = d.slice(2);
    else if (d.startsWith("0")) d = TL_PHONE_COUNTRY + d.slice(1);
  }
  if (d.length < 8 || d.length > 15) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(text || "")}`;
}

/* ---------------- customer progress tracker ---------------- */
function tlStatusStyles() {
  if (document.getElementById("tl-status-style")) return;
  const style = document.createElement("style");
  style.id = "tl-status-style";
  style.textContent = `
    .tl-track{margin:14px 0 6px}
    .tl-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,1fr)}
    .tl-steps li{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;padding:0 2px;
      font:600 12px/1.2 Inter,Poppins,system-ui,sans-serif;color:#9e9e9e}
    .tl-steps li::before{content:"";position:absolute;top:13px;right:50%;width:100%;height:3px;background:#e0e0e0}
    .tl-steps li:first-child::before{display:none}
    .tl-steps li.done::before,.tl-steps li.now::before{background:#2e7d32}
    .tl-dot{position:relative;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;
      background:#eee;color:#9e9e9e;font:700 13px/1 Inter,system-ui,sans-serif;border:2px solid #fff}
    .tl-steps .done .tl-dot{background:#2e7d32;color:#fff}
    .tl-steps .now .tl-dot{background:#ff0000;color:#fff;animation:tlPulse 1.8s infinite}
    .tl-steps .done{color:#2e7d32}
    .tl-steps .now{color:#1a1a1a}
    .tl-steps time{font-weight:400;font-size:11px;color:#888}
    .tl-track-msg{margin:12px 0 0;padding:10px 12px;border-radius:10px;background:#f6f6f6;color:#333;
      font:400 14px/1.45 Inter,Poppins,system-ui,sans-serif}
    .tl-track[data-st="ready"] .tl-track-msg,.tl-track[data-st="out_for_delivery"] .tl-track-msg{background:#fff8e1;color:#6d4c00;font-weight:600}
    .tl-track[data-st="delivered"] .tl-track-msg{background:#e8f5e9;color:#1b5e20}
    .tl-track[data-st="cancelled"] .tl-track-msg{background:#eee;color:#616161}
    @keyframes tlPulse{0%{box-shadow:0 0 0 0 rgba(255,0,0,.45)}70%{box-shadow:0 0 0 10px rgba(255,0,0,0)}100%{box-shadow:0 0 0 0 rgba(255,0,0,0)}}
    @media (prefers-reduced-motion:reduce){.tl-steps .now .tl-dot{animation:none}}
    body.dark .tl-steps li,body.dark .tl-steps time{color:#9e9e9e!important}
    body.dark .tl-steps .done{color:#66bb6a!important}
    body.dark .tl-steps .now{color:#fff!important}
    body.dark .tl-dot{border-color:#1e1e1e;background:#333}
    body.dark .tl-steps .done .tl-dot,body.dark .tl-steps .now .tl-dot{color:#fff!important}
    body.dark .tl-track-msg{background:#2a2a2a!important;color:#eee!important}`;
  document.head.appendChild(style);
}

function tlStatusTracker(o) {
  tlStatusStyles();
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const st = tlStatusOf(o);
  if (st === "cancelled") {
    return `<div class="tl-track" data-st="cancelled"><p class="tl-track-msg"><b>✕ Cancelled.</b> ${esc(tlStatusMessage(o))}</p></div>`;
  }
  const flow = tlStatusFlow(o);
  let at = flow.indexOf(st);
  if (at < 0) at = st === "ready" || st === "out_for_delivery" ? 2 : 0;
  const finished = st === "delivered";
  const steps = flow.map((s, i) => {
    const state = finished || i < at ? "done" : i === at ? "now" : "todo";
    const when = state === "todo" ? null : tlStatusTime(o, s);
    const label = s === "delivered" && tlIsPickup(o) ? "Picked up" : TL_STATUS[s].short;
    return `<li class="${state}"${state === "now" ? ' aria-current="step"' : ""}>
        <span class="tl-dot" aria-hidden="true">${state === "done" ? "✓" : i + 1}</span>
        <span>${esc(label)}</span>
        ${when ? `<time>${esc(when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }))}</time>` : ""}
      </li>`;
  }).join("");
  return `<div class="tl-track" data-st="${esc(st)}">
      <ol class="tl-steps" aria-label="Order progress">${steps}</ol>
      <p class="tl-track-msg">${TL_STATUS[st] ? TL_STATUS[st].icon + " " : ""}${esc(tlStatusMessage(o))}</p>
    </div>`;
}
