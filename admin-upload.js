// "Upload" buttons for photo and video fields, using Cloudinary's free plan.
// Any <input data-upload="image"> (or "video") gets an Upload button next to it;
// the uploaded file's link is put into the input, so the rest of the page works as
// if the link had been pasted. Cloudinary details are saved in
// Admin → Store Settings → Photo uploads (Firestore adminConfig/media, admins only).
(function () {
  const MAX_MB = { image: 10, video: 100 }; // Cloudinary free-plan limits
  let config = null;

  const say = (msg, type) => (typeof toast === "function" ? toast(msg, type) : alert(msg));

  async function getConfig() {
    if (config) return config;
    const snap = await firebase.firestore().collection("adminConfig").doc("media").get();
    config = snap.exists ? snap.data() : {};
    return config;
  }

  const style = document.createElement("style");
  style.textContent = `
    .upload-wrap { display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: center; flex: 1; min-width: 0; }
    .upload-wrap > input { flex: 1; min-width: 0; }
    .upload-btn { flex: none; white-space: nowrap; }
    .upload-status { flex-basis: 100%; font-size: 12px; color: #6b6b6b; }
    .upload-status:empty { display: none; }
    .upload-status.error { color: #c62828; }`;
  document.head.appendChild(style);

  function upload(file, kind, cfg, onProgress) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", cfg.uploadPreset);
      form.append("folder", "taste-lounge");
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloudName)}/${kind}/upload`);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => {
        let res = {};
        try { res = JSON.parse(xhr.responseText); } catch (e) { }
        if (xhr.status >= 200 && xhr.status < 300 && res.secure_url) resolve(res.secure_url);
        else reject(new Error((res.error && res.error.message) || `Upload failed (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error("Network error — check your connection"));
      xhr.send(form);
    });
  }

  function enhance(input) {
    if (input.dataset.uploadReady) return;
    input.dataset.uploadReady = "1";
    const kind = input.dataset.upload === "video" ? "video" : "image";

    const wrap = document.createElement("div");
    wrap.className = "upload-wrap";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary btn-sm upload-btn";
    btn.textContent = kind === "video" ? "⬆ Upload video" : "⬆ Upload photo";
    wrap.appendChild(btn);

    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = kind === "video" ? "video/*" : "image/*";
    picker.hidden = true;
    wrap.appendChild(picker);

    const status = document.createElement("span");
    status.className = "upload-status";
    status.setAttribute("role", "status");
    wrap.appendChild(status);

    btn.onclick = async () => {
      try {
        const cfg = await getConfig();
        if (!cfg.cloudName || !cfg.uploadPreset) {
          say("Photo uploads aren't set up yet — add your Cloudinary details in Store Settings → Photo uploads.", "error");
          return;
        }
        picker.click();
      } catch (err) {
        say("Couldn't check the upload settings: " + err.message, "error");
      }
    };

    picker.onchange = async () => {
      const file = picker.files && picker.files[0];
      picker.value = "";
      if (!file) return;
      if (file.size > MAX_MB[kind] * 1024 * 1024) {
        status.textContent = `That file is too big — the limit is ${MAX_MB[kind]} MB.`;
        status.className = "upload-status error";
        return;
      }
      btn.disabled = true;
      status.className = "upload-status";
      status.textContent = "Uploading… 0%";
      try {
        let url = await upload(file, kind, config, (p) => (status.textContent = `Uploading… ${p}%`));
        // serve photos in the best format and size for each phone (smaller, faster pages)
        if (kind === "image") url = url.replace("/image/upload/", "/image/upload/f_auto,q_auto,c_limit,w_1600/");
        input.value = url;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        status.textContent = "✓ Uploaded — remember to save.";
      } catch (err) {
        status.textContent = err.message;
        status.className = "upload-status error";
      } finally {
        btn.disabled = false;
      }
    };
  }

  function scan(root) {
    (root.querySelectorAll ? root.querySelectorAll("input[data-upload]") : []).forEach(enhance);
  }

  scan(document);
  new MutationObserver((records) => records.forEach((r) => r.addedNodes.forEach((n) => {
    if (n.nodeType !== 1) return;
    if (n.matches && n.matches("input[data-upload]")) enhance(n);
    else scan(n);
  }))).observe(document.body, { childList: true, subtree: true });
})();
