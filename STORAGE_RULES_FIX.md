# 🔥 Firebase Storage Rules Fix

## Your Current Issue
**Upload hangs after starting** - No completion log, no error

## Step 1: Check Storage Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **taste-lounge-3075**
3. Go to **Storage** → **Rules** tab
4. **Send me screenshot of current rules**

## Step 2: Apply These Rules

If your current rules are too restrictive, replace with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload foods
    match /foods/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

**Steps to apply:**
1. Copy the rules above
2. Open Firebase Console → Storage → Rules tab
3. Delete existing rules
4. Paste the new rules
5. Click **Publish**
6. Wait for "Rules updated successfully" message

## Step 3: After Updating Rules

1. **Reload the page** (Ctrl+Shift+Delete to hard refresh)
2. **Try uploading image again**
3. **Watch console for progress logs:**
   - 📊 Upload progress: 0%
   - 📊 Upload progress: 50%
   - 📊 Upload progress: 100%
   - ✅ Image uploaded: [URL]

## Expected Console Output (Success)
```
📝 Form submitted: {name: 's', desc: 'd', price: 7000, hasImage: true}
📤 Uploading image to Firebase Storage...
File size: 0.XX MB
File type: image/jpeg
📊 Upload progress: 0%
📊 Upload progress: 25%
📊 Upload progress: 50%
📊 Upload progress: 75%
📊 Upload progress: 100%
✅ Image uploaded: https://firebasestorage.googleapis.com/...
💾 Saving food to Firestore...
✅ Food saved successfully!
```

## If Still Hanging

### Check File Size
Browsers often have upload limits. Try a **smaller image** (~1-2 MB).

### Check Browser Upload Limit
Paste in console:
```javascript
const maxSize = 50 * 1024 * 1024; // 50MB
console.log("Max upload size:", (maxSize / 1024 / 1024) + "MB");
```

### Test Storage Access Directly
Paste in console:
```javascript
firebase.storage().ref('foods/test.txt')
  .putString('test')
  .then(() => {
    console.log("✅ Storage works!");
    return firebase.storage().ref('foods/test.txt').delete();
  })
  .catch(err => {
    console.error("❌ Storage error:", err.code, err.message);
  });
```

## Quick Checklist
- [ ] Checked Storage Rules in Firebase
- [ ] Applied new rules (published)
- [ ] Hard refreshed page (Ctrl+Shift+Delete)
- [ ] Tried uploading small image (~500KB)
- [ ] Watched console for progress logs
- [ ] Screenshot of any error messages

Tell me what you find!
