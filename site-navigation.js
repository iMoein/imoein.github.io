// Shared primary navigation for the home page, portfolio and bilingual resumes.
(() => {
  const mount = document.getElementById('site-navigation');
  if (!mount) return;
  const isResume = document.body.classList.contains('resume-page');
  const locale = () => document.documentElement.lang === 'en' ? 'en' : 'fa';
  const items = (lang) => [
    { fa: 'صفحه اصلی', en: 'Home', href: '/' + (lang === 'en' ? '?lang=en' : '') },
    { fa: 'پروژه‌ها', en: 'Projects', href: '/portfolio.html?lang=' + lang },
    { fa: 'رزومه', en: 'Resume', href: '/resume/moein-ghezelbash-' + lang + '.html' }
  ];
  const switcher = document.getElementById('locale-switcher') || document.createElement('div');
  switcher.id = 'locale-switcher';
  switcher.classList.add('locale-switcher');
  switcher.setAttribute('aria-label', 'Language');
  const links = document.createElement('nav');
  links.className = 'primary-nav-links';
  links.setAttribute('aria-label', 'Primary navigation');
  const brand = document.createElement('a');
  brand.className = 'site-nav-brand';
  brand.href = '/';
  const logo = document.createElement('img');
  logo.src = (isResume ? '../' : '') + 'assets/logo/imoein.com.webp';
  logo.width = 146;
  logo.height = 60;
  logo.alt = 'iMoein';
  brand.appendChild(logo);
  // Direct light/dark switch, plus a separate one-tap return to system Auto.
  const themePicker = document.createElement('div');
  themePicker.className = 'theme-picker';
  themePicker.setAttribute('role', 'group');

  const themeAuto = document.createElement('button');
  themeAuto.type = 'button';
  themeAuto.className = 'theme-auto-button';
  const monitor = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  monitor.setAttribute('viewBox', '0 0 24 24');
  monitor.setAttribute('aria-hidden', 'true');
  monitor.setAttribute('fill', 'none');
  monitor.setAttribute('stroke', 'currentColor');
  monitor.setAttribute('stroke-width', '1.8');
  monitor.setAttribute('stroke-linecap', 'round');
  monitor.setAttribute('stroke-linejoin', 'round');
  const screen = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  screen.setAttribute('x', '3');
  screen.setAttribute('y', '4');
  screen.setAttribute('width', '18');
  screen.setAttribute('height', '14');
  screen.setAttribute('rx', '2');
  const stand = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  stand.setAttribute('d', 'M8 22h8M12 18v4');
  monitor.append(screen, stand);
  themeAuto.appendChild(monitor);

  const themeSwitch = document.createElement('button');
  themeSwitch.type = 'button';
  themeSwitch.className = 'theme-mode-switch';
  themeSwitch.setAttribute('role', 'switch');
  const sun = document.createElement('span');
  sun.className = 'theme-symbol theme-sun';
  sun.setAttribute('aria-hidden', 'true');
  sun.textContent = '☀';
  const moon = document.createElement('span');
  moon.className = 'theme-symbol theme-moon';
  moon.setAttribute('aria-hidden', 'true');
  moon.textContent = '☾';
  const thumb = document.createElement('span');
  thumb.className = 'theme-switch-thumb';
  thumb.setAttribute('aria-hidden', 'true');
  themeSwitch.append(sun, moon, thumb);

  const themeLabels = {
    fa: { group: 'حالت نمایش', auto: 'خودکار؛ مطابق تنظیمات سیستم',
      toLight: 'تغییر به حالت روشن', toDark: 'تغییر به حالت تاریک' },
    en: { group: 'Appearance', auto: 'Auto; follow system appearance',
      toLight: 'Switch to light mode', toDark: 'Switch to dark mode' }
  };
  const updateThemeControl = () => {
    const words = themeLabels[locale()];
    const mode = window.siteTheme?.get() || 'auto';
    const dark = (window.siteTheme?.effective() || 'light') === 'dark';
    themePicker.setAttribute('aria-label', words.group);
    themeAuto.setAttribute('aria-label', words.auto);
    themeAuto.title = words.auto;
    themeAuto.setAttribute('aria-pressed', String(mode === 'auto'));
    themeAuto.classList.toggle('is-active', mode === 'auto');
    themeSwitch.setAttribute('aria-checked', String(dark));
    themeSwitch.setAttribute('aria-label', dark ? words.toLight : words.toDark);
    themeSwitch.title = dark ? words.toLight : words.toDark;
  };
  themeSwitch.addEventListener('click', () => {
    const dark = (window.siteTheme?.effective() || 'light') === 'dark';
    window.siteTheme?.set(dark ? 'light' : 'dark');
    updateThemeControl();
  });
  themeAuto.addEventListener('click', () => {
    window.siteTheme?.set('auto');
    updateThemeControl();
  });
  themePicker.append(themeAuto, themeSwitch);
  document.addEventListener('site-theme-change', updateThemeControl);
  mount.append(brand, links, themePicker, switcher);
  function draw() {
    const lang = locale();
    links.replaceChildren();
    items(lang).forEach((item) => {
      const link = document.createElement('a');
      link.href = item.href;
      link.textContent = item[lang];
      const page = location.pathname;
      const active = item.href.startsWith('/resume/') ? page.includes('/resume/') :
        item.href.startsWith('/portfolio') ? page.includes('portfolio.html') :
        page === '/' || page.endsWith('/index.html');
      if (active) link.setAttribute('aria-current', 'page');
      links.appendChild(link);
    });
    updateThemeControl();
    if (isResume) {
      switcher.replaceChildren();
      ['fa', 'en'].forEach((lng) => {
        const link = document.createElement('a');
        link.href = 'moein-ghezelbash-' + lng + '.html';
        link.textContent = lng === 'fa' ? 'فا' : 'EN';
        if (lng === lang) link.className = 'active';
        link.setAttribute('hreflang', lng);
        link.setAttribute('aria-label', lng === 'fa' ? 'رزومه فارسی' : 'English resume');
        link.addEventListener('click', () => {
          try { localStorage.setItem('site-locale', lng); } catch (_) {}
        });
        switcher.appendChild(link);
      });
    }
  }
  draw();
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
