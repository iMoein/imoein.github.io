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
  mount.append(brand, links, switcher);
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
