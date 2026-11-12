/* Bilingual iMoein landing: public articles + independent projects, no private drafts. */
(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const translations = {
    fa: {
      linkedinText:'LinkedIn', githubText:'GitHub',
      skip: 'رفتن به محتوا', home: 'خانه', about: 'درباره من', projects: 'پروژه‌ها', resume: 'رزومه', blog: 'بلاگ',
      eyebrow: 'از مسئله تا محصول', heroName: 'معین قزلباش',
      heroRole: 'مدیر ارشد محصول فنی · سازنده محصول',
      heroLead: 'با ترکیب نگاه کسب‌وکار، فناوری و داده، مسائل واقعی را به محصولاتی قابل‌استفاده تبدیل می‌کنم؛ از کشف مسئله و MVP تا توسعه و تحویل.',
      aboutDetail: 'مسیر و تجربه حرفه‌ای', projectsDetail: 'محصولات و تجربه‌های اجرایی', resumeDetail: 'سوابق، مهارت‌ها و دستاوردها',
      collaborationsTitle: 'همکاری‌ها و تجربه‌های حرفه‌ای', collaborationsIntro: 'از همکاری تمام‌وقت و مشاوره تا پروژه‌ها و مشارکت‌های مستقل.',
      latest: 'تازه‌ترین یادداشت‌ها', allPosts: 'همه یادداشت‌ها', loadingPosts: 'در حال بارگذاری یادداشت‌ها…',
      blogError: 'فهرست یادداشت‌ها در دسترس نیست. از صفحه بلاگ دیدن کنید.',
      noPosts: 'هنوز یادداشتی منتشر نشده است.', moreSoon: 'سه جایگاه دیگر با انتشار یادداشت‌های تازه تکمیل می‌شوند.',
      featured: 'منتخب', minRead: 'دقیقه مطالعه', read: 'مطالعه مقاله',
      independent: 'پروژه‌های مستقل', allProjects: 'همه پروژه‌ها',
      independentIntro: 'محصولاتی که مستقل یا در همکاری‌های کوچک، از ایده تا ساخت و توسعه‌شان پیش رفته‌ام. صفحه اختصاصی هر محصول به‌مرور اضافه می‌شود.',
      loadingProjects: 'در حال بارگذاری پروژه‌ها…', projectDetails: 'آشنایی بیشتر', projectError: 'جزئیات پروژه‌ها در دسترس نیست.',
      projectTag: 'محصول مستقل', projectPending: 'در حال تکامل', projectVisit: 'مشاهده محصول', comingSoon: 'صفحه اختصاصی به‌زودی',
      timeVisit: 'ورود به وب‌اپ TIME', timeOverview: 'معرفی پروژه',
      timePreviewAlt: 'پیش‌نمایش داشبورد TIME؛ ساعت تهران، تقویم و اطلاعات روشنایی روز',
      contactKicker: 'ارتباط مستقیم', contactTitle: 'گفتگو، مشاوره یا شروع همکاری',
      contactLead: 'اگر ایده‌ای داری، با چالش محصول روبه‌رو شده‌ای یا می‌خواهی درباره یک همکاری صحبت کنیم، خوشحال می‌شوم گفتگو کنیم.',
      telegram: 'گفتگو در تلگرام', telegramChannel:'عضویت در کانال تلگرام', whatsapp: 'گفتگو در واتساپ',
      title: 'معین قزلباش | از مسئله تا محصول',
      description: 'معین قزلباش، مدیر ارشد محصول فنی و سازنده محصولات مستقل؛ یادداشت‌های مدیریت محصول، پروژه‌ها و راه‌های شروع همکاری.',
      copyright: 'معین قزلباش'
    },
    en: {
      linkedinText:'LinkedIn', githubText:'GitHub',
      skip: 'Skip to content', home: 'Home', about: 'About Me', projects: 'Projects', resume: 'Resume', blog: 'Blog',
      eyebrow: 'FROM PROBLEM TO PRODUCT', heroName: 'Moein Ghezelbash',
      heroRole: 'Senior Technical Product Manager · Product Builder',
      heroLead: 'I turn real business and user problems into usable digital products, combining product thinking, technical depth and data — from discovery and MVP to delivery.',
      aboutDetail: 'My experience and professional journey', projectsDetail: 'Products and hands-on work', resumeDetail: 'Experience, skills and achievements',
      collaborationsTitle: 'Companies & collaborations', collaborationsIntro: 'From full-time roles and consulting engagements to independent ventures and professional contributions.',
      latest: 'Latest writing', allPosts: 'Explore all articles', loadingPosts: 'Loading articles…',
      blogError: 'Articles are temporarily unavailable. Visit the journal instead.',
      noPosts: 'No published articles yet.', moreSoon: 'Three more articles will appear here as new writing is published.',
      featured: 'Featured', minRead: 'min read', read: 'Read article',
      independent: 'Independent projects', allProjects: 'Explore all projects',
      independentIntro: 'Products I have taken from idea to delivery, independently or with small teams. Each will have its own dedicated page over time.',
      loadingProjects: 'Loading projects…', projectDetails: 'Learn more', projectError: 'Project details are temporarily unavailable.',
      projectTag: 'Independent product', projectPending: 'Evolving product', projectVisit: 'Visit product', comingSoon: 'Dedicated page coming soon',
      timeVisit: 'Open TIME web app', timeOverview: 'Project overview',
      timePreviewAlt: 'Preview of the TIME dashboard with Tehran clock, calendar and daylight information',
      contactKicker: 'GET IN TOUCH', contactTitle: 'Let’s talk, consult or collaborate',
      contactLead: 'Have an idea, a product challenge, or a project worth building? I would love to explore it with you.',
      telegram: 'Message on Telegram', telegramChannel:'Follow Telegram Channel', whatsapp: 'Chat on WhatsApp',
      title: 'Moein Ghezelbash | From problem to product',
      description: 'Moein Ghezelbash, Senior Technical Product Manager and independent product builder. Explore projects, product writing and ways to collaborate.',
      copyright: 'Moein Ghezelbash'
    }
  };
  let lang = document.documentElement.lang === 'en' ? 'en' : 'fa';
  let siteData = null;
  let latestRequest = 0;
  const node = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = String(text);
    return el;
  };
  const homeContent = () => siteData?.landing?.[lang] || null;
  const currentCopy = () => {
    const source=homeContent();
    if (!source) return translations[lang];
    return Object.assign({}, translations[lang],
      ...['hero','shortcuts','journal','independent','collaborations','contact','seo']
        .map(section => source[section] && typeof source[section]==='object' ? source[section] : {}));
  };
  const validHref = value => {
    if (typeof value!=='string' || !value || value!==value.trim() || /[\\\x00-\x1F]/.test(value)) return false;
    if (value.startsWith('/') && !value.startsWith('//'))
      return !value.split(/[?#]/)[0].split('/').includes('..');
    if (!value.startsWith('https://')) return false;
    try {
      const url=new URL(value);
      return url.protocol==='https:' && !url.username && !url.password && !!url.hostname;
    } catch (_) { return false; }
  };
  const safeBlogUrl = (value) => typeof value === 'string' && value.startsWith('/blog/' + lang + '/') && !value.includes('//')
    ? value : '/blog/' + lang + '/';
  const safeCoverUrl = (value) => typeof value === 'string' && value.startsWith('/assets/blog/media/')
    ? value : '/assets/logo/imoein-symbol.webp';
  const localHref = (name) => {
    const defaults={
      home:'/' + (lang==='en'?'?lang=en':''),
      about:'/about.html' + (lang==='en'?'?lang=en':''),
      projects:'/portfolio.html?lang=' + lang + '#live-projects',
      resume:'/resume/moein-ghezelbash-' + lang + '.html',
      blog:'/blog/' + lang + '/',
      allPosts:'/blog/' + lang + '/',
      allProjects:'/portfolio.html?lang=' + lang + '#live-projects',
      timeOverview:'/portfolio.html?lang=' + lang + '#live-projects'
    };
    const configured=homeContent()?.links?.[name];
    return validHref(configured) ? configured : defaults[name];
  };
  const displayDate = (iso) => {
    const value = new Date((iso || '') + 'T12:00:00Z');
    if (Number.isNaN(value.getTime())) return iso || '';
    return new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-GB',
      {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}).format(value);
  };
  const makeLink = (href, text, cls='') => {
    const a = node('a', cls, text);
    a.href = href;
    return a;
  };
  const createFeatured = (post) => {
    const article = node('article', 'landing-story');
    const media = makeLink(safeBlogUrl(post.url), '', 'landing-story-media' + (post.coverFit === 'contain' ? ' is-contained' : ''));
    const img = node('img');
    img.src = safeCoverUrl(post.cover);
    img.alt = post.coverAlt || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    media.append(img);
    const content = node('div', 'landing-story-body');
    const meta = node('div', 'landing-story-meta');
    if (post.featured) meta.append(node('span','landing-featured-pill','✦ ' + currentCopy().featured));
    meta.append(node('span','landing-category',post.category || 'Product'));
    meta.append(node('span','landing-read-time',(post.minutes || 1) + ' ' + currentCopy().minRead));
    const title = node('h3');
    title.append(makeLink(safeBlogUrl(post.url),post.title || ''));
    const summary = node('p','landing-story-excerpt',post.summary || '');
    const tags = node('div','landing-tags');
    (post.tags || []).slice(0,2).forEach(t => tags.append(node('span','landing-tag',t)));
    const footer = node('div','landing-story-footer');
    const date = node('time','landing-date',displayDate(post.date));
    if (post.date) date.dateTime = post.date;
    const action = makeLink(safeBlogUrl(post.url),currentCopy().read + ' ↗','landing-read-link');
    footer.append(date,action);
    content.append(meta,title,summary,tags,footer);
    article.append(media,content);
    return article;
  };
  const createSmallPost = (post) => {
    // One accessible link per article card: no competing thumbnail/title/arrow links.
    const card = node('article', 'landing-mini-post');
    const link = makeLink(safeBlogUrl(post.url), '', 'landing-mini-link');
    const titleText = post.title || (lang === 'fa' ? 'یادداشت' : 'Article');
    // Let the visible card text supply the accessible name. An aria-label
    // containing only the title conflicts with the link's other visible text.
    const hasCover = typeof post.cover === 'string' && post.cover.startsWith('/assets/blog/media/');
    const visual = node('div', 'landing-mini-cover'
      + (post.coverFit === 'contain' ? ' is-contained' : '')
      + (!hasCover ? ' is-placeholder' : ''));
    const img = node('img');
    img.src = safeCoverUrl(post.cover);
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    visual.append(img);

    const content = node('div', 'landing-mini-info');
    const meta = node('div', 'landing-mini-meta');
    meta.append(node('span', 'landing-mini-category', post.category || (lang === 'fa' ? 'یادداشت' : 'Article')));
    if (Number.isFinite(Number(post.minutes)) && Number(post.minutes) > 0) {
      meta.append(node('span', 'landing-mini-read-time',
        new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-GB').format(post.minutes) + ' ' + currentCopy().minRead));
    }
    const title = node('h3', '', titleText);
    content.append(meta, title);
    if (typeof post.summary === 'string' && post.summary.trim()) {
      content.append(node('p', 'landing-mini-excerpt', post.summary.trim()));
    }

    const bottom = node('div', 'landing-mini-bottom');
    const date = node('time', '', displayDate(post.date));
    if (post.date) date.dateTime = post.date;
    const action = node('span', 'landing-mini-action');
    action.append(node('span', '', currentCopy().read), node('span', 'landing-mini-arrow', '↗'));
    bottom.append(date, action);
    link.append(visual, content, bottom);
    card.append(link);
    return card;
  };
  const renderBlog = async () => {
    const request = ++latestRequest;
    const featured = $('#landing-featured');
    const more = $('#landing-posts');
    const note = $('#landing-journal-note');
    featured.replaceChildren(node('p','landing-featured-loading',currentCopy().loadingPosts));
    more.replaceChildren();
    note.hidden = true;
    try {
      const response = await fetch('/blog/' + lang + '/index.json', {cache:'no-cache'});
      if (!response.ok) throw new Error('Could not fetch public blog index');
      const data = await response.json();
      if (request !== latestRequest) return;
      const published = Array.isArray(data.posts) ? data.posts.filter(p =>
        p && typeof p.url === 'string' && p.url.startsWith('/blog/' + lang + '/')) : [];
      published.sort((a,b) => (b.date || '').localeCompare(a.date || ''));
      const four = published.slice(0,4);
      if (!four.length) {
        featured.replaceChildren(node('p','landing-featured-loading',currentCopy().noPosts));
        return;
      }
      const lead = four.find(p=>p.featured) || four[0];
      featured.replaceChildren(createFeatured(lead));
      const ordinary = four.filter(p=>p!==lead);
      more.replaceChildren(...ordinary.map(createSmallPost));
      if (ordinary.length < 3) {
        note.textContent = currentCopy().moreSoon;
        note.hidden = false;
      }
    } catch (_) {
      if (request === latestRequest) {
        featured.replaceChildren(node('p','landing-featured-loading',currentCopy().blogError));
        more.replaceChildren();
      }
    }
  };
  const projectVisual = {
    'FARVAH / Smart Coffee': {monogram:'F',skin:'coffee'},
    'Device Sync': {monogram:'↔',skin:'sync'},
    'AI Detector': {monogram:'AI',skin:'ai'},
    'QR Code Studio': {monogram:'QR',skin:'qr'},
    'TIME': {monogram:'◷',skin:'time'}
  };
  const createTimeCard = (item) => {
    const card = node('article', 'landing-time-card');
    const copy = node('div', 'landing-time-copy');
    const kicker = node('span', 'landing-time-kicker', currentCopy().projectTag);
    const title = node('h3', 'landing-time-title', item.title);
    const summary = node('p', 'landing-time-summary', item.homeSummary || item.description || '');
    const highlights = node('ul', 'landing-time-highlights');
    (Array.isArray(item.homeHighlights) ? item.homeHighlights : []).slice(0, 3).forEach(value => {
      if (typeof value !== 'string' || !value.trim()) return;
      const feature = node('li', '', value.trim());
      highlights.append(feature);
    });
    const actions = node('div', 'landing-time-actions');
    const appUrl = validHref(item.url) ? item.url : null;
    if (appUrl) {
      const visit = makeLink(appUrl, currentCopy().timeVisit + ' ↗',
        'landing-time-button landing-time-primary');
      if (appUrl.startsWith('https://')) {
        visit.target = '_blank';
        visit.rel = 'noopener noreferrer';
      }
      actions.append(visit);
    }
    actions.append(makeLink(localHref('timeOverview'), currentCopy().timeOverview + ' ↗',
      'landing-time-button landing-time-secondary'));
    copy.append(kicker, title, summary, highlights, actions);

    const visual = node('div', 'landing-time-visual');
    const frame = node('div', 'landing-time-browser');
    const bar = node('div', 'landing-time-browser-bar');
    // Decorative Safari-inspired chrome, not functional browser controls.
    const left = node('div', 'landing-time-browser-left');
    const controls = node('span', 'landing-time-browser-controls');
    controls.setAttribute('aria-hidden', 'true');
    ['red', 'yellow', 'green'].forEach(color =>
      controls.append(node('span', 'landing-time-browser-control is-' + color)));
    const navigation = node('span', 'landing-time-browser-navigation');
    navigation.setAttribute('aria-hidden', 'true');
    navigation.append(
      node('span', 'landing-time-browser-chevron', '‹'),
      node('span', 'landing-time-browser-chevron', '›')
    );
    left.append(controls, navigation);
    const hostname = appUrl ? new URL(appUrl).hostname : item.title;
    const address = node('span', 'landing-time-browser-address');
    const lock = node('span', 'landing-time-browser-lock');
    lock.setAttribute('aria-hidden', 'true');
    address.append(lock, node('span', 'landing-time-browser-url', hostname));
    const refresh = node('span', 'landing-time-browser-refresh', '↻');
    refresh.setAttribute('aria-hidden', 'true');
    bar.append(left, address, refresh);
    const img = node('img', 'landing-time-screenshot');
    const preview = typeof item.previewImage === 'string' &&
      /^assets\/[a-zA-Z0-9/_-]+\.(webp|png|jpe?g)$/i.test(item.previewImage)
      && !item.previewImage.includes('..') ? item.previewImage : null;
    if (preview) img.src = '/' + preview + '?v=balanced-2';
    else img.src = '/assets/logo/imoein-symbol.webp';
    img.alt = currentCopy().timePreviewAlt;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 1200;
    img.height = 1047;
    frame.append(bar, img);
    visual.append(frame);
    card.append(copy, visual);
    return card;
  };
  const renderProjects = () => {
    const grid = $('#landing-independent-grid');
    const items = siteData?.locales?.[lang]?.independentProjects;
    if (!Array.isArray(items)) {
      grid.replaceChildren(node('p','landing-featured-loading',
        siteData ? currentCopy().projectError : currentCopy().loadingProjects));
      return;
    }
    const selection=homeContent()?.projectSelection;
    const titles=Array.isArray(selection?.cardTitles)
      ? selection.cardTitles : ['FARVAH / Smart Coffee','Device Sync','AI Detector'];
    const chosen = titles.map(title=>items.find(item=>item.title===title)).filter(Boolean);
    const cards = chosen.map(item=>{
      const card = node('article','landing-project-card');
      const art = projectVisual[item.title] || {monogram:'◆',skin:'general'};
      const header = node('div','landing-project-head');
      const icon = node('span','landing-project-icon is-'+art.skin,art.monogram);
      icon.setAttribute('aria-hidden','true');
      const typ = node('div','landing-project-type');
      typ.append(node('span','landing-project-eyebrow',currentCopy().projectTag),node('h3','',item.title));
      header.append(icon,typ);
      const description=node('p','landing-project-description',item.description || '');
      const foot=node('div','landing-project-footer');
      const publicUrl = validHref(item.url) ? item.url : null;
      if (publicUrl) {
        const link = makeLink(publicUrl, currentCopy().projectVisit + ' ↗','landing-project-link');
        if (publicUrl.startsWith('https://')) {
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
        foot.append(node('span','',item.period || ''),link);
      } else {
        foot.append(node('span','',item.period || ''),node('span','landing-project-coming-soon',currentCopy().comingSoon));
      }
      card.append(header,description,foot);
      return card;
    });
    const featuredTitle=selection?.featuredTitle ?? 'TIME';
    const time = featuredTitle ? items.find(item => item.title === featuredTitle) : null;
    grid.replaceChildren(...(time ? [createTimeCard(time)] : []), ...cards);
  };
  const updateSocial = () => {
    const links = siteData?.socialLinks || [];
    const update = (id,name,fallback) => {
      const item=links.find(s=>s.label===name) || (name==='Telegram Chat' ? links.find(s=>s.label==='Telegram') : undefined);
      const el=document.getElementById(id);
      if (!el) return;
      el.hidden=item?.enabled===false;
      el.href=item && validHref(item.url) ? item.url : fallback;
      const icon=el.querySelector('img');
      const asset=item?.iconSrc;
      if (icon && typeof asset==='string' &&
          /^assets\/[a-zA-Z0-9/_-]+\.(png|webp|jpe?g)$/i.test(asset) && !asset.includes('..')) {
        icon.src='/' + asset;
      }
    };
    update('hero-linkedin','LinkedIn','https://www.linkedin.com/in/moeinghezelbash/');
    update('hero-github','GitHub','https://github.com/iMoein');
    update('contact-telegram','Telegram Chat','https://t.me/moeinghezelbash');
    // A channel is a broadcast destination, never a replacement for the chat.
    // It remains hidden until a distinct URL is configured and enabled.
    const channel=links.find(s=>s.label==='Telegram Channel');
    const channelLink=document.getElementById('contact-telegram-channel');
    if (channelLink) {
      const chat=links.find(s=>s.label==='Telegram Chat' || s.label==='Telegram');
      const active=channel?.enabled===true && validHref(channel.url)
        && channel.url.startsWith('https://') && channel.url!==chat?.url;
      channelLink.hidden=!active;
      if (active) channelLink.href=channel.url;
      else channelLink.removeAttribute('href');
    }
    update('contact-whatsapp','WhatsApp','https://wa.me/989120137435');
  };
  const renderLanguageControl = () => {
    const switcher = $('#locale-switcher');
    if (!switcher) return;
    switcher.querySelectorAll('button').forEach(x=>x.remove());
    ['en','fa'].forEach(value=>{
      const button=node('button','',value==='fa'?'فا':'EN');
      button.type='button';
      button.dataset.lang=value;
      button.lang=value;
      button.classList.toggle('active',lang===value);
      button.setAttribute('aria-pressed',String(lang===value));
      button.setAttribute('aria-label',value==='fa'?'نمایش فارسی':'Show English');
      button.addEventListener('click',()=>setLocale(value));
      switcher.append(button);
    });
    switcher.dataset.locale=lang;
  };
  const updateMeta = () => {
    const t=currentCopy();
    document.title=t.title;
    $('#meta-description').content=t.description;
    $('#og-title').content=t.title;
    $('#og-description').content=t.description;
    const ogImage=homeContent()?.seo?.ogImage;
    if (validHref(ogImage)) {
      $('#og-image').content=ogImage;
      $('#twitter-image').content=ogImage;
    }
    $('#og-locale').content=lang==='fa'?'fa_IR':'en_GB';
    const url='https://imoein.com/' + (lang==='en'?'?lang=en':'');
    $('#og-url').content=url;
    $('#canonical-url').href=url;
    $('#homepage-schema').textContent=JSON.stringify({
      '@context':'https://schema.org','@type':'WebPage',
      name:t.title,description:t.description,url,
      about:{'@type':'Person',name:'Moein Ghezelbash',url:'https://imoein.com/about.html'}
    });
    const copyright = $('#landing-copyright');
    if (copyright) copyright.textContent='© ' + new Intl.NumberFormat(lang==='fa'?'fa-IR':'en-GB',{useGrouping:false}).format(new Date().getFullYear())+' '+t.copyright;
  };
  const firstHero = document.getElementById('landing-hero-image');
  const originalHero = {
    src:firstHero?.getAttribute('src'),
    srcset:firstHero?.getAttribute('srcset'),
    sizes:firstHero?.getAttribute('sizes')
  };
  const safeImageUrl = value => {
    if (typeof value !== 'string' || !value.trim() || !validHref(value)) return null;
    return value.startsWith('/assets/') || value.startsWith('https://') ? value : null;
  };
  const syncHomeImages = () => {
    const images=homeContent()?.media;
    if (!images) return;
    const hero=document.getElementById('landing-hero-image');
    const requested=safeImageUrl(images.heroPortrait);
    if (hero && requested) {
      if (hero.getAttribute('src') !== requested) hero.src=requested;
      if (requested === originalHero.src) {
        if (originalHero.srcset) hero.setAttribute('srcset',originalHero.srcset);
        if (originalHero.sizes) hero.setAttribute('sizes',originalHero.sizes);
      } else {
        hero.removeAttribute('srcset');
        hero.removeAttribute('sizes');
      }
    }
    for (const [key,id] of [
      ['aboutIcon','landing-about-icon'],['projectsIcon','landing-projects-icon'],
      ['resumeIcon','landing-resume-icon']
    ]) {
      const img=document.getElementById(id);
      const src=safeImageUrl(images[key]);
      if (img && src && img.getAttribute('src')!==src) img.src=src;
    }
  };
  const applyLandingCopy = () => {
    const t=currentCopy();
    $$('[data-i18n]').forEach(el=>{
      const key=el.dataset.i18n;
      if (Object.hasOwn(t,key)) el.textContent=t[key];
    });
    $$('[data-local-link]').forEach(el=>{
      const dest=localHref(el.dataset.localLink);
      if (!dest) return;
      el.href=dest;
      if (dest.startsWith('https://')) {
        el.target='_blank';
        el.rel='noopener noreferrer';
      } else {
        el.removeAttribute('target');
        el.removeAttribute('rel');
      }
    });
    updateMeta();
    syncHomeImages();
  };
  const renderLocale = () => {
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='fa'?'rtl':'ltr';
    document.body.classList.toggle('locale-fa',lang==='fa');
    document.body.classList.toggle('locale-en',lang==='en');
    applyLandingCopy();
    renderLanguageControl();
    renderProjects();
    window.renderHomeCollaborations?.(siteData, lang);
    const blogReady = renderBlog();
    document.querySelector('.landing-marquee-shell')?.setAttribute('aria-label',
      lang === 'fa' ? 'لوگوهای همکاری‌های حرفه‌ای' : 'Professional collaborations and brands');
    document.documentElement.classList.remove('landing-initializing');
    return blogReady;
  };
  const setLocale = (requested) => {
    if (lang===requested) return;
    lang=requested;
    try {localStorage.setItem('site-locale',lang);}catch(_){}
    const url=new URL(location.href);
    if(lang==='en')url.searchParams.set('lang','en');
    else url.searchParams.delete('lang');
    history.replaceState(null,'',url.pathname+url.search+url.hash);
    renderLocale();
  };
  window.addEventListener('popstate',()=>{
    const requested=new URLSearchParams(location.search).get('lang');
    lang=requested==='en'?'en':'fa';
    renderLocale();
  });
  // First paint is localized without waiting for either content request.
  renderLocale();
  fetch('/resume/site-data.json', {cache:'no-cache'})
    .then(response=>response.ok?response.json():Promise.reject())
    .then(data=>{
      siteData=data;
      applyLandingCopy();
      updateSocial();
      renderProjects();
      window.renderHomeCollaborations?.(siteData, lang);
      // Rebuild the article cards with the localized Studio button labels.
      renderBlog();
    })
    .catch(()=>{
      $('#landing-independent-grid').replaceChildren(
        node('p','landing-featured-loading',currentCopy().projectError));
      document.getElementById('landing-collaborations').hidden = true;
    });
  // The static hero and navigation paint immediately. Dynamic sections
  // populate in place and never hold the first page paint hostage.
})();