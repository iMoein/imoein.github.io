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

  // Navigation is prerendered on some pages. Its initial appearance controls
  // may describe the theme used by the build browser rather than the visitor.
  // Keep those static controls truthful and clickable *before* navigation JS
  // replaces them with interactive controls. The live navigation marks its
  // mount using an ephemeral property (not an HTML attribute), so a prerender
  // snapshot never falsely claims to have been hydrated.
  const syncPrerenderedControls = () => {
    const nav = document.getElementById('site-navigation');
    if (!nav || nav.__siteNavigationHydrated) return false;
    const toggle = nav.querySelector('.theme-mode-switch');
    const automatic = nav.querySelector('.theme-auto-button');
    if (!toggle && !automatic) return false;
    const dark = document.documentElement.dataset.colorScheme === 'dark';
    const lang = document.documentElement.lang === 'en' ? 'en' : 'fa';
    if (toggle) {
      const label = dark
        ? (lang === 'fa' ? 'تغییر به حالت روشن' : 'Switch to light mode')
        : (lang === 'fa' ? 'تغییر به حالت تاریک' : 'Switch to dark mode');
      toggle.setAttribute('aria-checked', String(dark));
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
    }
    if (automatic) {
      const label = lang === 'fa'
        ? 'خودکار؛ مطابق تنظیمات سیستم'
        : 'Auto; follow system appearance';
      automatic.setAttribute('aria-label', label);
      automatic.setAttribute('aria-pressed', String(selected === 'auto'));
      automatic.classList.toggle('is-active', selected === 'auto');
      automatic.title = label;
    }
    return true;
  };

  const apply = () => {
    const effective = selected === 'auto' ? (system.matches ? 'dark' : 'light') : selected;
    const root = document.documentElement;
    root.dataset.theme = selected;
    root.dataset.colorScheme = effective;
    root.style.colorScheme = effective;
    syncPrerenderedControls();

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
  // A cold page load can expose the server-rendered nav before the
  // site-navigation bundle has loaded. Use one fallback listener for those
  // controls; it is skipped once the live navigation owns its buttons.
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.theme-auto-button, .theme-mode-switch');
    const nav = button?.closest('#site-navigation');
    if (!nav || nav.__siteNavigationHydrated) return;
    if (button.classList.contains('theme-auto-button')) {
      set('auto');
    } else {
      set(document.documentElement.dataset.colorScheme === 'dark' ? 'light' : 'dark');
    }
  });

  if (document.readyState === 'loading') {
    const observer = new MutationObserver(() => {
      if (syncPrerenderedControls()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', () => {
      observer.disconnect();
      syncPrerenderedControls();
    }, { once: true });
  } else {
    syncPrerenderedControls();
  }

  // Back/forward cache can restore an older DOM state even though a newer
  // tab or page has changed the stored preference in the meantime.
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    selected = read();
    apply();
  });

  window.siteTheme = { get: () => selected, set, effective: () =>
    document.documentElement.dataset.colorScheme };
  apply();
})();
