// Shared first-paint coordinator for every iMoein page, including generated Blog Studio pages.
// Reveal only after page data has rendered, navigation/font metrics stabilise, and the
// visible images are decoded. Never wait on below-the-fold lazy images or a failed service.
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
  const imageReady = image => {
    if (image.complete) {
      return typeof image.decode === 'function'
        ? within(image.decode(), 1000) : Promise.resolve();
    }
    return within(new Promise(resolve => {
      image.addEventListener('load', resolve, {once:true});
      image.addEventListener('error', resolve, {once:true});
    }), 1650);
  };
  const visibleImagesReady = () => {
    const cutoff = window.innerHeight + 140;
    const candidates = [...document.images].filter(image => {
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.top < cutoff && rect.bottom >= -20;
    }).slice(0, 18);
    return Promise.all(candidates.map(imageReady));
  };
  const ready = async () => {
    if (requested || revealed) return;
    requested = true;
    await within(Promise.all([
      navigationReady(),
      document.fonts?.ready || Promise.resolve()
    ]), 2600);
    await within(visibleImagesReady(), 1800);
    await twoFrames();
    reveal();
  };
  window.siteReady = ready;
  window.addEventListener('pageshow', () => {
    if (revealed) root.classList.remove('site-loading');
  });
})();
