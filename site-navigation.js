// Shared primary navigation for the home page, portfolio and bilingual resumes.
(() => {
  const mount = document.getElementById('site-navigation');
  if (!mount) return;
  const isResume = document.body.classList.contains('resume-page');
  const isBlog = document.body.classList.contains('blog-page');
  const locale = () => document.documentElement.lang === 'en' ? 'en' : 'fa';
  // Text labels can now be changed in the local Site Studio. Keep a
  // hardcoded fallback for network failures and offline preview.
  let studioNavigation = null;
  const fallbackNavigation = {
    fa: {home:'درباره من',projects:'پروژه‌ها',resume:'رزومه',blog:'بلاگ'},
    en: {home:'About Me',projects:'Projects',resume:'Resume',blog:'Blog'}
  };
  const items = (lang) => {
    const words = studioNavigation?.[lang] || fallbackNavigation[lang];
    return [
      {label:words.home,href:'/' + (lang === 'en' ? '?lang=en' : '')},
      {label:words.projects,href:'/portfolio.html?lang=' + lang},
      {label:words.resume,href:'/resume/moein-ghezelbash-' + lang + '.html'},
      {label:words.blog,href:'/blog/' + lang + '/'}
    ];
  };
  const switcher = document.getElementById('locale-switcher') || document.createElement('div');
  switcher.id = 'locale-switcher';
  switcher.classList.add('locale-switcher');
  switcher.setAttribute('aria-label', 'Language');
  switcher.setAttribute('role', 'group');
  switcher.classList.add('locale-animated');
  switcher.dataset.locale = locale();
  // Keep the moving thumb mounted while the page language is re-rendered.
  // Home and portfolio replace only their buttons, never this decoration.
  const localeOrb = document.createElement('span');
  localeOrb.className = 'locale-motion-orb';
  localeOrb.setAttribute('aria-hidden', 'true');
  switcher.prepend(localeOrb);
  const links = document.createElement('nav');
  links.className = 'primary-nav-links';
  links.setAttribute('aria-label', 'Primary navigation');
  const brand = document.createElement('a');
  brand.className = 'site-nav-brand';
  brand.href = '/';
  const logo = document.createElement('img');
  logo.src = '/assets/logo/imoein.com.webp';
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
  // Small, self-contained day/night sky. The movement and appearance are
  // authored for iMoein instead of embedding the reference demo or assets.
  // The same scene works in either RTL or LTR navigation.
  const scene = document.createElement('span');
  scene.className = 'daynight-scene';
  scene.setAttribute('aria-hidden', 'true');

  const daytime = document.createElement('span');
  daytime.className = 'daynight-sky daynight-sky-day';
  const nighttime = document.createElement('span');
  nighttime.className = 'daynight-sky daynight-sky-night';
  const auras = document.createElement('span');
  auras.className = 'daynight-auras';
  const stars = document.createElement('span');
  stars.className = 'daynight-stars';
  // Explicit individual stars allow subtle staggered motion.
  [
    [19, 23, 2], [29, 61, 2], [39, 39, 1], [12, 68, 1],
    [47, 19, 1], [34, 13, 1], [49, 78, 2], [62, 49, 1],
    [17, 48, 1], [53, 60, 1]
  ].forEach(([x, y, size], index) => {
    const star = document.createElement('span');
    star.className = 'daynight-star';
    star.style.setProperty('--star-x', x + '%');
    star.style.setProperty('--star-y', y + '%');
    star.style.setProperty('--star-size', size + 'px');
    star.style.setProperty('--star-delay', (index * 45) + 'ms');
    stars.appendChild(star);
  });
  const clouds = document.createElement('span');
  clouds.className = 'daynight-clouds';
  ['rear', 'middle', 'front'].forEach(layer => {
    const cloud = document.createElement('span');
    cloud.className = 'daynight-cloud daynight-cloud-' + layer;
    clouds.appendChild(cloud);
  });
  const thumb = document.createElement('span');
  thumb.className = 'theme-switch-thumb daynight-orb';
  const sun = document.createElement('span');
  sun.className = 'daynight-sun';
  const moon = document.createElement('span');
  moon.className = 'daynight-moon';
  ['one', 'two', 'three'].forEach(index => {
    const crater = document.createElement('span');
    crater.className = 'daynight-crater daynight-crater-' + index;
    moon.appendChild(crater);
  });
  thumb.append(sun, moon);
  scene.append(daytime, nighttime, auras, stars, clouds, thumb);
  themeSwitch.appendChild(scene);
  themeSwitch.setAttribute('aria-checked', 'false');


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
    // A brief squash-and-settle motion gives the moving orb some weight.
    // CSS handles sliding and crossfade; Web Animations adds only this accent.
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
        typeof thumb.animate === 'function') {
      thumb.animate([
        { scale: '1 1' },
        { scale: '1.14 .88', offset: .32 },
        { scale: '.96 1.05', offset: .68 },
        { scale: '1 1' }
      ], { duration: 720, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
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
    switcher.dataset.locale = lang;
    switcher.setAttribute('aria-label', lang === 'fa' ? 'انتخاب زبان سایت' : 'Choose site language');
    links.replaceChildren();
    items(lang).forEach((item) => {
      const link = document.createElement('a');
      link.href = item.href;
      link.textContent = item.label;
      const page = location.pathname;
      const active = item.href.startsWith('/blog/') ? page.startsWith('/blog/') :
        item.href.startsWith('/resume/') ? page.includes('/resume/') :
        item.href.startsWith('/portfolio') ? page.includes('portfolio.html') :
        page === '/' || page.endsWith('/index.html');
      if (active) link.setAttribute('aria-current', 'page');
      links.appendChild(link);
    });
    updateThemeControl();
    if (isBlog) {
      switcher.querySelectorAll('a').forEach(node => node.remove());
      ['en', 'fa'].forEach((lng) => {
        const link = document.createElement('a');
        const destination = lng === 'fa' ? document.body.dataset.blogAltFa : document.body.dataset.blogAltEn;
        link.href = destination || '/blog/' + lng + '/';
        link.textContent = lng === 'fa' ? 'فا' : 'EN';
        link.lang = lng;
        link.dataset.lang = lng;
        link.setAttribute('hreflang', lng);
        link.setAttribute('aria-label', lng === 'fa' ? 'مطالب فارسی' : 'English articles');
        if (lng === lang) {
          link.className = 'active';
          link.setAttribute('aria-current', 'true');
        }
        link.addEventListener('click', () => {
          try { localStorage.setItem('site-locale', lng); } catch (_) {}
        });
        switcher.appendChild(link);
      });
    } else if (isResume) {
      switcher.querySelectorAll('a').forEach(node => node.remove());
      ['en', 'fa'].forEach((lng) => {
        const link = document.createElement('a');
        link.href = 'moein-ghezelbash-' + lng + '.html';
        link.textContent = lng === 'fa' ? 'فا' : 'EN';
        link.lang = lng;
        link.dataset.lang = lng;
        if (lng === lang) {
          link.className = 'active';
          link.setAttribute('aria-current', 'true');
        }
        link.setAttribute('hreflang', lng);
        link.setAttribute('aria-label', lng === 'fa' ? 'رزومه فارسی' : 'English resume');
        link.addEventListener('click', () => {
          try { localStorage.setItem('site-locale', lng); } catch (_) {}
        });
        switcher.appendChild(link);
      });
    }
  }
  // Same spring-like microinteraction as the sun/moon switch, without
  // day/night metaphors. The target is always the real link/button.
  let localeNavigationPending = false;
  switcher.addEventListener('click', (event) => {
    if (localeNavigationPending) {
      event.preventDefault();
      return;
    }
    const option = event.target.closest('[data-lang]');
    if (!option || !switcher.contains(option) || option.dataset.lang === locale()) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const next = option.dataset.lang;
    if (next !== 'fa' && next !== 'en') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && typeof localeOrb.animate === 'function') {
      localeOrb.animate([
        { scale: '1 1', offset: 0 },
        { scale: '1.13 .90', offset: .29 },
        { scale: '.95 1.06', offset: .72 },
        { scale: '1 1', offset: 1 }
      ], { duration: 720, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    // A normal link would navigate before the thumb visibly slides.
    // Briefly play the transition, then preserve the original href.
    if (option.tagName === 'A' && !reduce) {
      event.preventDefault();
      localeNavigationPending = true;
      switcher.dataset.locale = next;
      switcher.querySelectorAll('a[data-lang]').forEach(link => {
        const selected = link.dataset.lang === next;
        link.classList.toggle('active', selected);
        if (selected) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
      window.setTimeout(() => { window.location.assign(option.href); }, 530);
    }
  });

  draw();
  // This is the existing public data source, not a new API or database.
  fetch('/resume/site-data.json')
    .then(response => response.ok ? response.json() : null)
    .then(data => {
      if (data?.siteNavigation) {
        studioNavigation = data.siteNavigation;
        draw();
      }
    })
    .catch(() => {});
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
