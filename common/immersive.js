(function () {
  function prefersReducedMotion() {
    return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function ensureOverlay() {
    let overlay = document.getElementById("immersive-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "immersive-overlay";
    overlay.className = "immersive-overlay";
    overlay.innerHTML = `
      <div class="immersive-panel">
        <div class="immersive-orbit">
          <span class="immersive-dot"></span>
          <span class="immersive-dot"></span>
          <span class="immersive-dot"></span>
        </div>
        <h3 id="immersive-title" class="immersive-title">仪式开启</h3>
        <p id="immersive-subtitle" class="immersive-subtitle">请凝神静气，等待天机浮现</p>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  let running = false;

  async function showRitual(options) {
    const cfg = {
      title: "仪式开启",
      subtitle: "请凝神静气，等待天机浮现",
      duration: 900,
      ...options
    };

    if (prefersReducedMotion()) return;
    if (running) return;
    running = true;

    const overlay = ensureOverlay();
    const titleEl = document.getElementById("immersive-title");
    const subtitleEl = document.getElementById("immersive-subtitle");
    if (titleEl) titleEl.textContent = cfg.title;
    if (subtitleEl) subtitleEl.textContent = cfg.subtitle;

    overlay.classList.add("show");
    await new Promise((resolve) => setTimeout(resolve, cfg.duration));
    overlay.classList.remove("show");
    await new Promise((resolve) => setTimeout(resolve, 240));
    running = false;
  }

  function canTransitionLink(evt, anchor) {
    if (!anchor) return false;
    if (evt.defaultPrevented) return false;
    if (evt.button !== 0) return false;
    if (evt.metaKey || evt.ctrlKey || evt.shiftKey || evt.altKey) return false;
    if (anchor.hasAttribute("download")) return false;
    if ((anchor.getAttribute("target") || "") === "_blank") return false;
    const href = anchor.getAttribute("href") || "";
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return false;

    try {
      const next = new URL(anchor.href, window.location.href);
      if (next.origin !== window.location.origin) return false;
      return true;
    } catch {
      return false;
    }
  }

  function wireLinkTransitions() {
    if (window.__mm_link_transition_bound) return;
    window.__mm_link_transition_bound = true;

    document.addEventListener("click", async (evt) => {
      const anchor = evt.target && evt.target.closest ? evt.target.closest("a[href]") : null;
      if (!canTransitionLink(evt, anchor)) return;

      evt.preventDefault();
      const href = anchor.href;
      try {
        await showRitual({ title: "切换命盘中", subtitle: "正在进入下一重仪式", duration: 520 });
      } catch {
        // ignore transition failure
      }
      window.location.href = href;
    });
  }

  window.MMImmersive = {
    showRitual,
    wireLinkTransitions
  };
})();
