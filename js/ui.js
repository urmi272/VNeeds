// ===== Shared UI: toast, dark mode, sidebar, notification bell =====

// ---- XSS defense: escape any user-supplied text before it goes into innerHTML ----
// Product names/descriptions, chat messages, notification text, display names, etc.
// are all attacker-controlled (any signed-in user can set them), so every one of
// them MUST go through this before being placed in an HTML string. Values placed
// via .innerText / .textContent do NOT need this — the DOM already escapes those.
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Product/user images are always meant to be data: URLs (produced by resizeImage()
// or seedDemoProducts()) — never remote URLs. Rejecting anything else blocks
// javascript:/vbscript: src tricks and stray HTML in an "image" field.
function safeImageSrc(src) {
  return typeof src === "string" && /^data:image\//i.test(src)
    ? src
    : "data:image/svg+xml;utf8," + encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='#EDEBFF'/></svg>`
      );
}

function showToast(message) {
  let container = document.getElementById("toastContainer");
  if (!container) return;
  let toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 50);
  setTimeout(() => toast.classList.remove("show"), 2500);
  setTimeout(() => toast.remove(), 3000);
}

function initDarkMode() {
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
  }
  const btn = document.getElementById("darkToggle");
  if (btn) btn.onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("darkMode", document.body.classList.contains("dark"));
  };
}

function toggleSidebar() {
  const sidebar = document.querySelector("aside");
  const overlay = document.getElementById("sidebarOverlay");
  if (!sidebar || !overlay) return;
  const active = sidebar.classList.toggle("active");
  overlay.style.display = active ? "block" : "none";
}
function closeSidebar() {
  const sidebar = document.querySelector("aside");
  const overlay = document.getElementById("sidebarOverlay");
  if (!sidebar || !overlay) return;
  sidebar.classList.remove("active");
  overlay.style.display = "none";
}

function showSkeletons(container, count = 6) {
  container.innerHTML = Array(count).fill(
    `<div class="product skeleton">
       <div class="skel-img"></div>
       <div class="skel-line" style="width:70%"></div>
       <div class="skel-line" style="width:40%"></div>
     </div>`
  ).join("");
}

function emptyState(container, icon, message) {
  container.innerHTML = `<div class="empty-state">
    <div class="empty-icon">${icon}</div>
    <p>${message}</p>
  </div>`;
}

// --- Notification bell: call once per page after auth is known ---
function initNotificationBell(uid) {
  const bellBtn = document.getElementById("notifBell");
  const dropdown = document.getElementById("notifDropdown");
  const badge = document.getElementById("notifBadge");
  if (!bellBtn || !dropdown || !badge) return;

  watchNotifications(uid, (notifs) => {
    const unread = notifs.filter(n => !n.read).length;
    badge.style.display = unread > 0 ? "inline-block" : "none";
    badge.innerText = unread;

    dropdown.innerHTML = notifs.length
      ? notifs.map(n => `
          <div class="notif-item ${n.read ? "" : "unread"}" data-id="${escapeHtml(n.id)}" data-link="${escapeHtml(n.link || "")}">
            ${escapeHtml(n.text)}
          </div>`).join("")
      : `<div class="notif-item">No notifications yet</div>`;

    dropdown.querySelectorAll(".notif-item[data-id]").forEach(el => {
      el.onclick = async () => {
        await markNotificationRead(uid, el.dataset.id);
        if (el.dataset.link) window.location.href = el.dataset.link;
      };
    });
  });

  bellBtn.onclick = (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  };
  document.addEventListener("click", () => dropdown.classList.remove("open"));
}

function starPickerHTML(name) {
  return `<div class="star-picker" id="${name}">
    ${[1,2,3,4,5].map(n => `<span data-val="${n}">☆</span>`).join("")}
  </div>`;
}
function bindStarPicker(id, onSelect) {
  const el = document.getElementById(id);
  let selected = 0;
  el.querySelectorAll("span").forEach(star => {
    star.onclick = () => {
      selected = parseInt(star.dataset.val);
      el.querySelectorAll("span").forEach((s, i) => s.innerText = i < selected ? "★" : "☆");
      onSelect(selected);
    };
  });
}
