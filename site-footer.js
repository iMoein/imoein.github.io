/* A single footer navigation contract, mirrored across both locales. */
(() => {
  const footer = document.querySelector('footer.site-unified-footer');
  if (!footer) return;

  const translations = {
    fa: {home:'خانه',about:'درباره من',projects:'پروژه‌ها',resume:'رزومه',blog:'بلاگ',name:'معین قزلباش'},
    en: {home:'Home',about:'About Me',projects:'Projects',resume:'Resume',blog:'Blog',name:'Moein Ghezelbash'}
  };

  function render() {
    const lang = document.documentElement.lang === 'en' ? 'en' : 'fa';
    const words = translations[lang];
    const routes = {
      home: '/' + (lang === 'en' ? '?lang=en' : ''),
      about: '/about.html' + (lang === 'en' ? '?lang=en' : ''),
      projects: '/portfolio.html?lang=' + lang,
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
    const copy = footer.querySelector('.site-footer-copy');
    if (copy) {
      const year = new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-GB',
        {useGrouping:false}).format(new Date().getFullYear());
      copy.textContent = '© ' + year + ' ' + words.name;
    }
    const logo = footer.querySelector('.site-footer-brand');
    if (logo) logo.href = routes.home;
  }
  render();
  new MutationObserver(render).observe(document.documentElement,
    {attributes:true,attributeFilter:['lang']});
})();
