// assets/js/lightbox.js
(function () {
  const modal = document.createElement("div");
  modal.className = "lightbox";
  modal.innerHTML = `
    <div class="lightbox__backdrop" data-close="1"></div>
    <div class="lightbox__content" role="dialog" aria-modal="true" aria-label="Image viewer">
      <button class="lightbox__close" aria-label="Close" data-close="1">✕</button>
      <button class="lightbox__nav lightbox__prev" aria-label="Previous">‹</button>
      <img class="lightbox__img" alt="" />
      <button class="lightbox__nav lightbox__next" aria-label="Next">›</button>
      <div class="lightbox__caption"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const imgEl = modal.querySelector(".lightbox__img");
  const captionEl = modal.querySelector(".lightbox__caption");
  const prevBtn = modal.querySelector(".lightbox__prev");
  const nextBtn = modal.querySelector(".lightbox__next");

  let items = [];
  let index = 0;

  function openLightbox(startIndex) {
    items = Array.from(document.querySelectorAll("[data-lightbox='hero']"));
    index = startIndex;
    render();
    modal.classList.add("is-open");
    document.body.classList.add("no-scroll");
  }

  function closeLightbox() {
    modal.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
    imgEl.src = "";
  }

  function render() {
    const el = items[index];
    const src = el.getAttribute("data-src");
    const caption = el.getAttribute("data-caption") || "";
    imgEl.src = src;
    captionEl.textContent = caption;
  }

  function next() {
    index = (index + 1) % items.length;
    render();
  }

  function prev() {
    index = (index - 1 + items.length) % items.length;
    render();
  }

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-lightbox='hero']");
    if (trigger) {
      const all = Array.from(document.querySelectorAll("[data-lightbox='hero']"));
      const i = all.indexOf(trigger);
      openLightbox(i);
      return;
    }
    if (e.target.closest("[data-close='1']")) closeLightbox();
  });

  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);

  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });
})();
