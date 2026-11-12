/**
 * Shared Firebase setup + small helpers for the admin menu pages.
 * Load after the Firebase SDK scripts and before admin-auth.js.
 */
firebase.initializeApp({
  apiKey: "AIzaSyAW3atuDYr7OeuT2b-Tn_ooD93ZfPqMA4g",
  authDomain: "taste-lounge-3075.firebaseapp.com",
  projectId: "taste-lounge-3075",
});

const db = firebase.firestore();
const auth = firebase.auth();

function serverTime() {
  return firebase.firestore.FieldValue.serverTimestamp();
}

// Escape text before putting it into HTML.
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function naira(amount) {
  return "₦" + Number(amount || 0).toLocaleString("en-US");
}

// "" -> null, "12" -> 12
function numOrNull(value) {
  const text = String(value ?? "").trim();
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

let toastTimer;
function toast(message, type = "success") {
  let el = document.getElementById("adminToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "adminToast";
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

// Sort helper shared by the menu pages: menu order first, then newest.
function byMenuOrder(a, b) {
  const ao = a.order ?? Number.MAX_SAFE_INTEGER;
  const bo = b.order ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  const at = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
  const bt = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
  return at - bt;
}
