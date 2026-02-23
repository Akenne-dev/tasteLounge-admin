(function () {
  const auth = firebase.auth();
  const db = firebase.firestore();

  document.body.style.display = "none";

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "admin-login.html";
      return;
    }

    try {
      const adminRef = db.collection("admins").doc(user.uid);
      const adminSnap = await adminRef.get();

      if (!adminSnap.exists) {
        alert("Access denied. Admins only.");
        await auth.signOut();
        window.location.href = "log-in.html";
        return;
      }

      document.body.style.display = "block";
    } catch (err) {
      console.error("Admin auth error:", err);
      alert("Authentication error. Please login again.");
      await auth.signOut();
      window.location.href = "admin-login.html";
    }
  });
})();
