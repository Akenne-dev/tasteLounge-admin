// Guards admin pages: only signed-in users listed in the "admins" collection may stay.
(function () {
  const auth = firebase.auth();
  const db = firebase.firestore();
  const LOGIN_PAGE = "index.html"; // the admin login page

  document.body.style.display = "none";

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = LOGIN_PAGE;
      return;
    }

    try {
      const adminRef = db.collection("admins").doc(user.uid);
      const adminSnap = await adminRef.get();

      if (!adminSnap.exists) {
        alert("Access denied. Admins only.");
        await auth.signOut();
        window.location.href = LOGIN_PAGE;
        return;
      }

      document.body.style.display = "block";
    } catch (err) {
      console.error("Admin auth error:", err);
      alert("Authentication error. Please login again.");
      await auth.signOut();
      window.location.href = LOGIN_PAGE;
    }
  });
})();
