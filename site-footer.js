/* A single footer navigation contract, mirrored across both locales. */
(() => {
  const footer = document.querySelector('footer.site-unified-footer');
  if (!footer) return;

  const translations = {
    fa: {home:'خانه',about:'درباره من',projects:'پروژه‌ها',resume:'رزومه',blog:'بلاگ',name:'معین قزلباش'},
    en: {home:'Home',about:'About Me',projects:'Projects',resume:'Resume',blog:'Blog',name:'Moein Ghezelbash'}
  };

  // Defensive hydration: older cached blog and resume HTML had only five
  // navigation links, so recreate the missing canonical entry before
  // translating. The canonical static HTML is produced by Site Studio.
  function ensureLinks() {
    const nav = footer.querySelector('.site-footer-nav');
    if (!nav) return;
    const sequence = ['home','about','projects','guide','resume','blog'];
    const existing = new Map();
    nav.querySelectorAll('a').forEach(link => {
      const key = link.hasAttribute('data-site-footer-guide')
        ? 'guide' : link.dataset.siteFooterLink;
      if (key && sequence.includes(key) && !existing.has(key)) existing.set(key,link);
      else link.remove(); // no stale, duplicated or unrecognised links
    });
    sequence.forEach(key => {
      let link=existing.get(key);
      if (!link) {
        link=document.createElement('a');
        if (key === 'guide') link.setAttribute('data-site-footer-guide','');
        else link.dataset.siteFooterLink=key;
      }
      nav.appendChild(link); // stable ordering across every page
    });
  }

  function render() {
    ensureLinks();
    const lang = document.documentElement.lang === 'en' ? 'en' : 'fa';
    const words = translations[lang];
    const routes = {
      home: lang === 'en' ? '/en/' : '/',
      about: lang === 'en' ? '/en/about.html' : '/about.html',
      projects: lang === 'en' ? '/en/portfolio.html' : '/portfolio.html',
      resume: '/resume/moein-ghezelbash-' + lang + '.html',
      blog: '/blog/' + lang + '/'
    };
    footer.querySelectorAll('[data-site-footer-link]').forEach(link => {
      const key = link.dataset.siteFooterLink;
      if (!Object.prototype.hasOwnProperty.call(routes, key)) return;
      link.href = routes[key];
      link.textContent = words[key];
      if (new URL(link.href, location.href).pathname === location.pathname) {
        link.setAttribute('aria-current','page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
    const guide = footer.querySelector('[data-site-footer-guide]');
    if (guide) {
      guide.href = lang === 'en' ? '/en/product-management.html' : '/product-management.html';
      guide.textContent = lang === 'en' ? 'Product management' : 'مدیریت محصول';
      if (location.pathname === new URL(guide.href,location.href).pathname) {
        guide.setAttribute('aria-current','page');
      } else {
        guide.removeAttribute('aria-current');
      }
    }
    const copy = footer.querySelector('.site-footer-copy');
    if (copy) {
      const year = new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-GB',
        {useGrouping:false}).format(new Date().getFullYear());
      copy.textContent = '© ' + year + ' ' + words.name;
    }
    const logo = footer.querySelector('.site-footer-brand');
    if (logo) {
      logo.href = routes.home;
      logo.setAttribute('aria-label','iMoein home');
    }
    const linksNav = footer.querySelector('.site-footer-nav');
    if (linksNav) linksNav.setAttribute('aria-label',
      lang === 'fa' ? 'پیوندهای فوتر سایت' : 'Footer navigation');
  }
  render();
  new MutationObserver(render).observe(document.documentElement,
    {attributes:true,attributeFilter:['lang']});
})();
