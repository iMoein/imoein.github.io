// Shared first-paint coordinator for every iMoein page, including generated Blog Studio pages.
// Keep the loading transition for data-dependent pages, but never block the
// initial content paint on font downloads or image decoding.
(() => {
  const root = document.documentElement;
  let requested = false;
  let revealed = false;
  const within = (promise, ms) => Promise.race([
    Promise.resolve(promise).catch(() => {}),
    new Promise(resolve => setTimeout(resolve, ms))
  ]);
  const twoFrames = () => new Promise(resolve => requestAnimationFrame(
    () => requestAnimationFrame(resolve)));
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    root.classList.remove('site-loading');
    root.classList.add('site-ready');
    const loader = document.getElementById('site-loader');
    if (loader) {
      const hide = () => { loader.hidden = true; };
      loader.addEventListener('transitionend', hide, {once:true});
      setTimeout(hide, 320);
    }
  };
  // Unavailable JS, a stalled request or blocked font can never lock the page.
  setTimeout(reveal, 7500);
  const navigationReady = () => new Promise(resolve => {
    if (document.querySelector('#site-navigation .primary-nav-links')) return resolve();
    const mount = document.getElementById('site-navigation');
    if (!mount) return resolve();
    const observer = new MutationObserver(() => {
      if (mount.querySelector('.primary-nav-links')) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(mount, {childList:true,subtree:true});
    setTimeout(() => {observer.disconnect();resolve();}, 2400);
  });
  const ready = async () => {
    if (requested || revealed) return;
    requested = true;
    // The caller has rendered the page data. Navigation is the only remaining
    // prerequisite; fonts and images are progressively rendered by the browser.
    await within(navigationReady(), 1200);
    await twoFrames();
    reveal();
  };
  window.siteReady = ready;
  window.addEventListener('pageshow', () => {
    if (revealed) root.classList.remove('site-loading');
  });
})();
