# Admin Foods Debugging Guide

## Step 1: Open Browser Console
1. Press **F12** to open Developer Tools
2. Go to the **Console** tab
3. Test the page and **screenshot/copy ALL console messages**

## Expected Console Output (Success Case)
```
🔍 Admin Foods Page Loaded
✅ Logged in as: [YOUR_USER_ID] [YOUR_EMAIL]
🔄 Setting up Firestore listener for foods...
📥 Snapshot received, docs count: X
✅ Loading X foods...
```

## What to Check Based on Console Errors

### ❌ Error 1: "NOT logged in - auth guard should redirect"
- **Problem**: You're not logged in
- **Solution**: Go to `admin-login.html` and log in first

### ❌ Error 2: "permission-denied" on Firestore read
- **Problem**: Firestore security rules don't allow your user to read "foods" collection
- **Solution**: Check your Firebase console Security Rules

### ❌ Error 3: "not-found" or "unauthenticated"
- **Problem**: Firebase auth token missing or expired
- **Solution**: Log out and log in again

### ❌ Error 4: "Foods collection doesn't exist"
- **Shows**: "No foods found" with no errors
- **Solution**: Add your first food via the form
- **Note**: Check if form gives upload errors

---

## Step 2: Check Firebase Security Rules

Go to **Firebase Console** → Your Project → **Firestore Database** → **Rules** tab

### ✅ Minimum Required Rules (Allow authenticated users):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow admins to read/write foods
    match /foods/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Verify admin status
    match /admins/{uid} {
      allow read: if request.auth.uid == uid;
    }
  }
}
```

### Current Rule Issues to Check:
- Does "foods" collection have `allow read`? ← Must have this
- Is there a wildcard rule denying all access?
- Are there role/claim-based restrictions?

---

## Step 3: Test Admin Status

In browser console, paste:
```javascript
firebase.auth().currentUser.getIdTokenResult().then(idTokenResult => {
  console.log("Custom claims:", idTokenResult.claims);
  console.log("Is admin?", idTokenResult.claims.admin === true);
});
```

This shows if you're marked as admin in Firebase.

---

## Step 4: Test Firestore Access Directly

In browser console, paste:
```javascript
firebase.firestore().collection("foods").get()
  .then(snap => {
    console.log("✅ Can read foods:", snap.size, "docs");
  })
  .catch(err => {
    console.error("❌ Cannot read foods:", err.message, err.code);
  });
```

If this fails → **Security Rules problem**

---

## Step 5: Test Storage Access

In browser console, paste:
```javascript
firebase.storage().ref('foods/').listAll()
  .then(result => {
    console.log("✅ Can access storage:", result.items.length, "files");
  })
  .catch(err => {
    console.error("❌ Cannot access storage:", err.message, err.code);
  });
```

---

## Step 6: Common Fixes

### Fix #1: Update Security Rules
Replace rules in Firebase Console with rules shown in Step 2 above.

### Fix #2: Ensure Admin Exists in Firestore
Check `admins` collection exists and has your UID as document with any data.

### Fix #3: Clear Browser Cache
- Press **Ctrl + Shift + Delete**
- Clear all browsing data
- Reload page

### Fix #4: Re-login
- Click logout
- Log in again
- Wait for auth guard to complete

---

## Console Messages Legend

| Icon | Meaning |
|------|---------|
| 🔍 | Debug info |
| ✅ | Success |
| ❌ | Error |
| ⚠️ | Warning |
| 📥 | Data received |
| 📤 | Uploading |
| 💾 | Saving |
| ✏️ | Editing |
| 🗑️ | Deleting |
| 🔄 | Loading |

---

## What to Tell Me

1. **Screenshot of console** showing the error
2. **Full error message** (code and text)
3. **Are you logged in?** (check if page shows content or redirects)
4. **Did you add foods before?** (checking if collection exists)
