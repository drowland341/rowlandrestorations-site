// assets/js/projects-render.js
(function () {
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] || m
    ));
  }

  function isProjectsPage() {
    return window.location.pathname.includes("/projects/");
  }

  function renderProjectsGrid() {
    const grid = document.getElementById("projectsGrid");
    if (!grid) return;

    const projects = Array.isArray(window.RR_PROJECTS) ? window.RR_PROJECTS : [];
    if (!projects.length) {
      grid.innerHTML = '<p style="color:var(--muted);">No projects found. (projects.js loaded?)</p>';
      return;
    }

    const sorted = [...projects].sort((a, b) => {
      const fa = !!a.featured, fb = !!b.featured;
      if (fa !== fb) return fa ? -1 : 1;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });

    const prefix = isProjectsPage() ? "" : "projects/";

    grid.innerHTML = sorted.map((p) => {
      const title = escapeHtml(p.title || "");
      const blurb = escapeHtml(p.blurb || "");
      const meta = escapeHtml(p.meta || "Photos + build overview");
      const href = prefix + (p.page || "#");

      return `
        <a class="card" href="${href}">
          <h3>${title}</h3>
          <p>${blurb}</p>
          <div class="meta">${meta}</div>
        </a>
      `;
    }).join("");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderProjectsGrid);
  } else {
    renderProjectsGrid();
  }
})();
