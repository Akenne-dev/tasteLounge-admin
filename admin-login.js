auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const adminRef = db.collection("admins").doc(user.uid);
  const adminSnap = await adminRef.get();

  if (!adminSnap.exists) {
    alert("Not authorized as admin");
    auth.signOut();
    return;
  }

  window.location.href = "admin-dashboard.html";
});
