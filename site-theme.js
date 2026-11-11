// Three-state appearance controller. Runs before CSS to avoid a theme flash.
(() => {
  const key = 'site-theme';
  const modes = ['auto', 'light', 'dark'];
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const read = () => {
    try {
      const saved = localStorage.getItem(key);
      return modes.includes(saved) ? saved : 'auto';
    } catch (_) {
      return 'auto';
    }
  };
  let selected = read();

  const apply = () => {
    const effective = selected === 'auto' ? (system.matches ? 'dark' : 'light') : selected;
    const root = document.documentElement;
    root.dataset.theme = selected;
    root.dataset.colorScheme = effective;
    root.style.colorScheme = effective;

    // Match browser chrome / iOS top safe area to the active page palette.
    document.querySelectorAll('meta[name="theme-color"]').forEach((tag) => {
      const mobile = tag.media?.includes('max-width');
      tag.content = effective === 'dark'
        ? (mobile ? '#122433' : '#101D2B')
        : (mobile ? '#E4ECE8' : '#102A43');
    });
    document.dispatchEvent(new CustomEvent('site-theme-change', {
      detail: { mode: selected, effective }
    }));
  };

  const set = (mode) => {
    if (!modes.includes(mode)) return;
    selected = mode;
    try { localStorage.setItem(key, mode); } catch (_) {}
    apply();
  };

  if (system.addEventListener) system.addEventListener('change', () => {
    if (selected === 'auto') apply();
  });
  else if (system.addListener) system.addListener(() => {
    if (selected === 'auto') apply();
  });
  window.addEventListener('storage', (event) => {
    if (event.key === key) {
      selected = read();
      apply();
    }
  });
  window.siteTheme = { get: () => selected, set, effective: () =>
    document.documentElement.dataset.colorScheme };
  apply();
})();
