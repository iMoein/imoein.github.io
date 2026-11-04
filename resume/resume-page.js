const root = document.querySelector('#resume-root');
const locale = document.documentElement.lang || 'en';
const dataUrl = 'site-data.json';

const create = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
};

const list = (items, className = '') => {
  const ul = create('ul', '', className);
  items.forEach((item) => ul.appendChild(create('li', item)));
  return ul;
};

const tags = (items) => list(items, 'tags');

const resolveAsset = (path) => `../${path}`;

const logoBox = (logo, company) => {
  const box = create('div', '', 'company-logo');
  const fallback = create('span', logo?.text || company.slice(0, 2));
  const candidates = logo?.candidates?.length ? logo.candidates : [logo?.src].filter(Boolean);
  if (candidates.length) {
    const img = document.createElement('img');
    img.alt = `${company} logo`;
    let candidateIndex = 0;
    const tryNextLogo = () => {
      if (candidateIndex >= candidates.length) {
        img.remove();
        if (!box.contains(fallback)) box.appendChild(fallback);
        return;
      }
      img.src = resolveAsset(candidates[candidateIndex]);
      candidateIndex += 1;
    };
    img.onerror = () => {
      tryNextLogo();
    };
    box.appendChild(img);
    tryNextLogo();
  } else {
    box.appendChild(fallback);
  }
  return box;
};

const profileMark = (data, content) => {
  const mark = create('div', '', 'resume-mark');
  const fallback = create('span', content.profile.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join(''));
  const candidates = data.profileImageCandidates || [data.profileImage].filter(Boolean);
  if (!candidates.length) {
    mark.appendChild(fallback);
    return mark;
  }

  const img = document.createElement('img');
  img.alt = content.profile.name;
  let candidateIndex = 0;
  const tryNextProfile = () => {
    if (candidateIndex >= candidates.length) {
      img.remove();
      if (!mark.contains(fallback)) mark.appendChild(fallback);
      return;
    }
    img.src = resolveAsset(candidates[candidateIndex]);
    candidateIndex += 1;
  };
  img.onerror = tryNextProfile;
  mark.appendChild(img);
  tryNextProfile();
  return mark;
};

const section = (title, className = '') => {
  const wrapper = create('section', '', `resume-section ${className}`.trim());
  wrapper.appendChild(create('h2', title, 'resume-section-title'));
  root.appendChild(wrapper);
  return wrapper;
};

const resolveFooterHref = (href) => {
  if (href === '/') return '../';
  if (href.startsWith('/resume/')) return href.replace('/resume/', '');
  return href;
};

const renderFooter = (data, content) => {
  const nav = document.querySelector('#footer-nav');
  const copy = document.querySelector('#footer-copy');
  const links = data.footerNavigation?.[locale] || data.footerNavigation?.[data.defaultLocale] || [];

  if (nav) {
    nav.textContent = '';
    links.forEach((item) => {
      const link = create('a', item.label);
      link.href = resolveFooterHref(item.href);
      nav.appendChild(link);
    });
  }

  if (copy) {
    copy.textContent = `© ${new Date().getFullYear()} ${data.copyright || content.profile.name}.`;
  }
};

const contactLabels = {
  en: { panel: 'Contact details', location: 'Location', phone: 'Phone', email: 'Email', linkedin: 'Profile' },
  fa: { panel: 'اطلاعات تماس', location: 'موقعیت', phone: 'تلفن', email: 'ایمیل', linkedin: 'لینکدین' }
};

const contactItem = (label, value, href = '') => {
  const item = href ? create('a', '') : create('span', '');
  if (href) item.href = href;
  item.append(create('small', label), create('strong', value));
  return item;
};

const renderHero = (data, content) => {
  const hero = create('header', '', 'resume-hero');
  const copy = create('div', '', 'resume-hero-copy');
  copy.append(create('span', content.eyebrow, 'resume-eyebrow'));
  copy.append(create('h1', content.profile.name));
  copy.append(create('p', `${content.profile.title} — ${content.profile.tagline}`, 'lead'));

  hero.append(copy, profileMark(data, content));
  root.appendChild(hero);
};

const renderContactPanel = (content, contact) => {
  const labels = contactLabels[locale] || contactLabels.en;
  const phone = locale === 'fa' ? contact.phone.fa : contact.phone.international;
  const panel = create('section', '', 'resume-contact-panel');
  panel.setAttribute('aria-label', labels.panel);
  panel.append(
    contactItem(labels.location, content.profile.location),
    contactItem(labels.phone, phone),
    contactItem(labels.email, contact.email.display),
    contactItem(labels.linkedin, contact.linkedin.label, contact.linkedin.url)
  );
  root.appendChild(panel);
};

const render = (data) => {
  const content = data.locales[locale] || data.locales.en;
  const contact = data.contact;

  document.documentElement.dir = content.dir;
  document.title = `${content.profile.name} | ${content.profile.title}`;
  document.querySelector('meta[name="description"]').setAttribute('content', content.seo.description);

  renderHero(data, content);
  renderContactPanel(content, contact);

  const summary = section(content.sections.summary, 'summary-section');
  const summaryCard = create('div', '', 'card resume-summary-card');
  content.summary.forEach((paragraph) => summaryCard.appendChild(create('p', paragraph)));
  summary.appendChild(summaryCard);

  const competencies = section(content.sections.competencies, 'competency-section');
  const competencyGrid = create('div', '', 'resume-card-grid');
  content.competencies.forEach((group) => {
    const card = create('article', '', 'card resume-competency-card');
    card.append(create('h3', group.group), tags(group.items));
    competencyGrid.appendChild(card);
  });
  competencies.appendChild(competencyGrid);

  const experience = section(content.sections.experience, 'experience-section');
  const timeline = create('div', '', 'resume-timeline');
  content.experience.forEach((job) => {
    const item = create('article', '', 'resume-job');
    const period = create('div', job.period, 'period resume-period');
    const card = create('div', '', 'card resume-job-card');
    const head = create('div', '', 'resume-job-head');
    const titleWrap = create('div');
    titleWrap.append(create('h3', job.role), create('p', job.company, 'company'));
    head.append(logoBox(job.logo, job.company), titleWrap);
    card.append(head, list(job.description));
    if (job.achievements.length) {
      const achievements = create('div', '', 'achievements');
      achievements.append(create('strong', content.sections.achievements), list(job.achievements));
      card.appendChild(achievements);
    }
    item.append(period, card);
    timeline.appendChild(item);
  });
  experience.appendChild(timeline);

  // A career break is context, not a professional employer.
  if (content.careerBreak) experience.appendChild(create('p', content.careerBreak, 'resume-career-note'));

  // Product ownership groups: the iMoein collection and standalone Farvah Cafe.
  if (content.independentProjects?.length) {
    const wrapper = section(content.sections.independentProjects, 'independent-projects-section');
    const grid = create('div', '', 'resume-independent-grid');
    const imoein = content.independentProjects.filter((p) => !/farvah/i.test(p.title));
    const farvah = content.independentProjects.filter((p) => /farvah/i.test(p.title));

    const productGroup = (name, logo, subtitle, products) => {
      const card = create('article', '', 'card resume-product-group');
      const head = create('div', '', 'resume-product-head');
      const image = create('img');
      image.src = resolveAsset(logo);
      image.alt = '';
      image.width = 48;
      image.height = 48;
      image.decoding = 'async';
      const meta = create('div');
      meta.append(create('h3', name), create('small', subtitle));
      head.append(image, meta);
      card.appendChild(head);
      const entries = create('ul', '', 'resume-product-list');
      products.forEach((project) => {
        const item = create('li');
        if (project.url && /^https:\/\//.test(project.url)) {
          const link = create('a', project.title);
          link.href = project.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          item.appendChild(link);
        } else {
          item.appendChild(create('strong', project.title));
        }
        item.appendChild(create('span', project.description));
        entries.appendChild(item);
      });
      card.appendChild(entries);
      return card;
    };
    grid.appendChild(productGroup(
      'iMoein', 'assets/logo/imoein.webp',
      locale === 'fa' ? 'مجموعه محصولات مستقل' : 'Independent software products', imoein
    ));
    if (farvah.length) grid.appendChild(productGroup(
      'Farvah Cafe', 'assets/logo/farvah.webp',
      locale === 'fa' ? 'پلتفرم مستقل مدیریت کافه' : 'Standalone cafe platform', farvah
    ));
    wrapper.appendChild(grid);
  }

  // Consulting is a concise list with existing organization icons.
  if (content.consulting?.length) {
    const wrapper = section(content.sections.consulting, 'consulting-section');
    const grid = create('div', '', 'resume-consulting-list');
    content.consulting.forEach((item) => {
      const card = create('article', '', 'card resume-consulting-row');
      const logo = item.logo?.src;
      if (logo) {
        const image = create('img', '', 'resume-consulting-logo');
        image.src = resolveAsset(logo);
        image.alt = '';
        image.width = 48;
        image.height = 48;
        image.decoding = 'async';
        card.appendChild(image);
      }
      const info = create('div', '', 'resume-consulting-info');
      const role = create('div', '', 'resume-consulting-role');
      role.append(create('strong', item.company), create('span', item.role));
      info.append(role, create('p', item.description?.[0] || ''));
      card.append(info, create('small', item.period));
      grid.appendChild(card);
    });
    wrapper.appendChild(grid);
  }

  // Additional career activities stay separate from employer history and consulting.
  if (content.additionalExperience?.length) {
    const wrapper = section(content.sections.additionalExperience, 'additional-experience-section');
    const grid = create('div', '', 'resume-other-grid');
    content.additionalExperience.forEach((item) => {
      const card = create('article', '', 'card resume-other-card');
      const header = create('div', '', 'resume-other-header');
      if (item.logo?.src) {
        const logo = create('img', '', 'resume-other-logo');
        logo.src = resolveAsset(item.logo.src);
        logo.alt = `${item.company} logo`;
        logo.width = 48;
        logo.height = 48;
        logo.decoding = 'async';
        header.appendChild(logo);
      }
      const heading = create('div', '', 'resume-other-heading');
      heading.append(create('strong', item.company), create('h3', item.role));
      header.appendChild(heading);
      header.appendChild(create('small', item.period, 'resume-other-period'));
      card.appendChild(header);
      if (item.description?.length) card.appendChild(list(item.description));
      grid.appendChild(card);
    });
    wrapper.appendChild(grid);
  }

  const details = section('', 'resume-details');
  const detailsGrid = create('div', '', 'resume-details-grid');
  [
    [content.sections.technologies, tags(content.technologies)],
    [content.sections.education, list(content.education)],
    [content.sections.certificates, tags(content.certificates)],
    [content.sections.languages, tags(content.languages)]
  ].forEach(([title, body]) => {
    const card = create('article', '', 'card resume-detail-card');
    card.append(create('h2', title), body);
    detailsGrid.appendChild(card);
  });
  details.appendChild(detailsGrid);

  renderFooter(data, content);
};

fetch(dataUrl)
  .then((response) => {
    if (!response.ok) throw new Error('Resume data could not be loaded.');
    return response.json();
  })
  .then((data) => {
    render(data);
    window.siteReady?.();
  })
  .catch((error) => {
    root.textContent = error.message;
    window.siteReady?.();
  });
