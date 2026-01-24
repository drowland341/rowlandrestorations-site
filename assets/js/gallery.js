// assets/js/gallery.js
// Requires: <script src="../../assets/js/supabase.env.js"></script> before this module
// Expects: #galleryGrid + #galleryStatus + (optional) #loadMoreBtn + (optional) #loadMoreBtnBottom

const cfg = window.RR_SUPABASE;
if (!cfg?.url || !cfg?.bucket || !cfg?.anonKey) {
  console.warn("RR_SUPABASE config missing. Check supabase.env.js");
}

const grid = document.getElementById("galleryGrid");
const statusEl = document.getElementById("galleryStatus");

// Support BOTH buttons
const loadMoreBtnTop = document.getElementById("loadMoreBtn");
const loadMoreBtnBottom = document.getElementById("loadMoreBtnBottom");
const loadButtons = [loadMoreBtnTop, loadMoreBtnBottom].filter(Boolean);

const project = grid?.dataset?.project;
const folder = grid?.dataset?.folder || "gallery";
const pageSize = parseInt(grid?.dataset?.pageSize || "60", 10);

let offset = 0;
let loaded = 0;
let done = false;
let loading = false;

// Build a public URL for an object inside your public bucket
function publicUrl(objectName) {
  // objectName is like: "1969-camaro/gallery/FILE.jpeg"
  return `${cfg.url}/storage/v1/object/public/${cfg.bucket}/${objectName}`;
}

// Supabase Storage "list objects" endpoint (POST)
async function listObjects(prefix, limit, offset) {
  const endpoint = `${cfg.url}/storage/v1/object/list/${cfg.bucket}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.anonKey}`,
    },
    body: JSON.stringify({
      prefix,
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`List failed (${res.status}). ${text}`);
  }

  return res.json();
}

function isImage(name = "") {
  const n = name.toLowerCase();
  return (
    n.endsWith(".jpg") ||
    n.endsWith(".jpeg") ||
    n.endsWith(".png") ||
    n.endsWith(".webp") ||
    n.endsWith(".gif")
  );
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function setButtonState() {
  // Update BOTH buttons
  for (const btn of loadButtons) {
    if (done) {
      btn.textContent = "No more photos";
      btn.disabled = true;
      btn.style.opacity = "0.75";
      continue;
    }

    btn.disabled = loading;
    btn.textContent = loading ? "Loading…" : "Load more";
    btn.style.opacity = "1";
  }
}

function createTile(fullUrl, indexForLightbox) {
  const tile = document.createElement("div");
  tile.className = "gallery-item";
  tile.setAttribute("role", "button");
  tile.setAttribute("tabindex", "0");
  tile.dataset.index = String(indexForLightbox);
  tile.dataset.full = fullUrl;

  const img = document.createElement("img");
  img.loading = "lazy";
  img.decoding = "async";
  img.alt = `Photo ${indexForLightbox + 1}`;
  img.src = fullUrl;

  img.addEventListener("load", () => tile.classList.add("is-loaded"), { once: true });
  img.addEventListener("error", () => tile.classList.add("is-loaded"), { once: true });

  tile.appendChild(img);

  // Click / keyboard open
  tile.addEventListener("click", () => openLightboxByUrl(fullUrl, indexForLightbox));
  tile.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openLightboxByUrl(fullUrl, indexForLightbox);
    }
  });

  return tile;
}

/* ---------------- Lightbox wiring (URL-based) ---------------- */

const lightbox = document.getElementById("lightbox");
const lbImg = document.getElementById("lbImg");
const lbCaption = document.getElementById("lbCaption");
const lbBackdrop = document.getElementById("lbBackdrop");
const lbClose = document.getElementById("lbClose");
const lbPrev = document.getElementById("lbPrev");
const lbNext = document.getElementById("lbNext");

let LIGHTBOX_URLS = [];
let currentIndex = 0;

function openLightboxByUrl(url, idx) {
  // Keep a list of ALL URLs currently rendered
  // (so prev/next works across what you loaded so far)
  if (!LIGHTBOX_URLS.includes(url)) {
    LIGHTBOX_URLS.push(url);
  }

  currentIndex = typeof idx === "number" ? idx : LIGHTBOX_URLS.indexOf(url);
  if (currentIndex < 0) currentIndex = 0;

  if (!lightbox || !lbImg) return;

  lbImg.src = LIGHTBOX_URLS[currentIndex];
  lbImg.alt = `Photo ${currentIndex + 1}`;
  if (lbCaption) lbCaption.textContent = `Photo ${currentIndex + 1} of ${LIGHTBOX_URLS.length}`;

  lightbox.classList.add("is-open");
  document.body.classList.add("no-scroll");
  lightbox.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  if (!lightbox || !lbImg) return;
  lightbox.classList.remove("is-open");
  document.body.classList.remove("no-scroll");
  lightbox.setAttribute("aria-hidden", "true");
  lbImg.src = "";
}

function prevImage() {
  if (!LIGHTBOX_URLS.length) return;
  currentIndex = (currentIndex - 1 + LIGHTBOX_URLS.length) % LIGHTBOX_URLS.length;
  openLightboxByUrl(LIGHTBOX_URLS[currentIndex], currentIndex);
}

function nextImage() {
  if (!LIGHTBOX_URLS.length) return;
  currentIndex = (currentIndex + 1) % LIGHTBOX_URLS.length;
  openLightboxByUrl(LIGHTBOX_URLS[currentIndex], currentIndex);
}

// Controls
lbBackdrop?.addEventListener("click", closeLightbox);
lbClose?.addEventListener("click", closeLightbox);
lbPrev?.addEventListener("click", (e) => { e.stopPropagation(); prevImage(); });
lbNext?.addEventListener("click", (e) => { e.stopPropagation(); nextImage(); });

// Keyboard
window.addEventListener("keydown", (e) => {
  if (!lightbox?.classList.contains("is-open")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") prevImage();
  if (e.key === "ArrowRight") nextImage();
});

/* ---------------- Loading + rendering ---------------- */

async function loadNextPage() {
  if (loading || done) return;

  loading = true;
  setButtonState();

  try {
    const prefix = `${project}/${folder}`;
    setStatus(`Loading…`);

    const items = await listObjects(prefix, pageSize, offset);

    // Filter to image objects
    const imageItems = (items || []).filter((it) => isImage(it?.name));

    // If the API returns 0 images, we’re done
    if (!imageItems.length) {
      done = true;
      setStatus(loaded ? `Loaded ${loaded} photos` : "No photos found");
      setButtonState();
      return;
    }

    // Append tiles
    for (const it of imageItems) {
      const objectName = `${prefix}/${it.name}`;
      const url = publicUrl(objectName);

      // Push URL into lightbox list in the same order rendered
      LIGHTBOX_URLS.push(url);

      const tile = createTile(url, LIGHTBOX_URLS.length - 1);
      grid.appendChild(tile);
      loaded++;
    }

    offset += pageSize;

    // If we got fewer than requested, probably end of folder
    if (items.length < pageSize) {
      done = true;
    }

    setStatus(`Loaded ${loaded} photos`);
    setButtonState();
  } catch (err) {
    console.error(err);
    setStatus(`Error loading photos (check console)`);
  } finally {
    loading = false;
    setButtonState();
  }
}

// Bind BOTH buttons
for (const btn of loadButtons) {
  btn.addEventListener("click", loadNextPage);
}

// Initial load
if (grid && project && cfg?.url && cfg?.bucket && cfg?.anonKey) {
  loadNextPage();
} else {
  setStatus("Gallery not configured (missing data-project or RR_SUPABASE).");
  setButtonState();
}
