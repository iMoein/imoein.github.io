// Shared first-paint coordinator. Avoid delaying below-the-fold images or external services.
(() => {
  let finished = false;
  const deadline = (promise, ms) => Promise.race([
    promise,
    new Promise((resolve) => window.setTimeout(resolve, ms))
  ]);

  const ready = async () => {
    if (finished) return;
    finished = true;
    try {
      if (document.fonts && document.fonts.ready) {
        await deadline(document.fonts.ready.catch(() => {}), 1200);
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    } finally {
      document.documentElement.classList.remove("site-loading");
      document.documentElement.classList.add("site-ready");
      const loader = document.getElementById("site-loader");
      if (loader) {
        loader.addEventListener("transitionend", () => { loader.hidden = true; }, { once: true });
        window.setTimeout(() => { loader.hidden = true; }, 350);
      }
    }
  };

  window.siteReady = ready;
  window.addEventListener("pageshow", () => {
    if (finished) document.documentElement.classList.remove("site-loading");
  });
})();
