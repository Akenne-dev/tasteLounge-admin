// Guards admin pages.
//   Admins (listed in the "admins" collection) can open every page.
//   Staff (added in Admin → Staff, "staff" collection) can only open pages whose
//   <body> has the data-staff attribute: the dashboard, orders and order details.
// Load after firebase.initializeApp().
//
//   window.adminReady   → Promise of { user, role: "admin" | "staff", name }
//   <html data-role="staff"> lets CSS hide admin-only things ([data-admin-only])
(function () {
  const auth = firebase.auth();
  const db = firebase.firestore();
  const LOGIN_PAGE = "index.html";
  const STAFF_HOME = "admin-orders.html";

  let resolveReady;
  window.adminReady = new Promise((resolve) => (resolveReady = resolve));
  window.adminRole = null;

  document.body.style.display = "none";

  async function deny(message) {
    alert(message);
    await auth.signOut();
    window.location.href = LOGIN_PAGE;
  }

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = LOGIN_PAGE;
      return;
    }

    try {
      const [adminSnap, staffSnap] = await Promise.all([
        db.collection("admins").doc(user.uid).get(),
        db.collection("staff").doc(user.uid).get(),
      ]);

      let role = null;
      if (adminSnap.exists) role = "admin";
      else if (staffSnap.exists && staffSnap.data().active !== false) role = "staff";

      if (!role) return deny("Access denied. Admins and staff only.");

      if (role === "staff" && !document.body.hasAttribute("data-staff")) {
        window.location.href = STAFF_HOME; // staff can't open this page
        return;
      }

      window.adminRole = role;
      document.documentElement.dataset.role = role;
      document.body.style.display = "";
      const name = (staffSnap.exists && staffSnap.data().name) || user.displayName || user.email;
      resolveReady({ user, role, name });
    } catch (err) {
      console.error("Admin auth error:", err);
      deny("Authentication error. Please login again.");
    }
  });
})();
