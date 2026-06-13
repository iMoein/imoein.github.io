const root = document.querySelector('#resume-root');
const locale = document.documentElement.lang || 'en';
const dataUrl = '../resume.json';

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

const logoBox = (logo, company) => {
  const box = create('div', '', 'company-logo');
  const fallback = create('span', logo?.text || company.slice(0, 2));
  if (logo?.src) {
    const img = document.createElement('img');
    img.src = `../${logo.src}`;
    img.alt = `${company} logo`;
    img.onerror = () => {
      img.remove();
      box.appendChild(fallback);
    };
    box.appendChild(img);
  } else {
    box.appendChild(fallback);
  }
  return box;
};

const section = (title, className = '') => {
  const wrapper = create('section', '', `resume-section ${className}`.trim());
  wrapper.appendChild(create('h2', title, 'resume-section-title'));
  root.appendChild(wrapper);
  return wrapper;
};

const renderHero = (content, contact) => {
  const phone = locale === 'fa' ? contact.phone.fa : contact.phone.international;
  const hero = create('header', '', 'resume-hero');
  const copy = create('div', '', 'resume-hero-copy');
  copy.append(create('span', content.eyebrow, 'resume-eyebrow'));
  copy.append(create('h1', content.profile.name));
  copy.append(create('p', `${content.profile.title} — ${content.profile.tagline}`, 'lead'));

  const contactBar = create('div', '', 'contact resume-contact');
  [content.profile.location, phone, contact.email.display].forEach((item) => contactBar.appendChild(create('span', item)));
  const linkedin = create('a', contact.linkedin.label);
  linkedin.href = contact.linkedin.url;
  contactBar.appendChild(linkedin);
  copy.appendChild(contactBar);

  const mark = create('div', '', 'resume-mark');
  mark.appendChild(create('span', content.profile.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('')));
  hero.append(copy, mark);
  root.appendChild(hero);
};

const render = (data) => {
  const content = data.locales[locale] || data.locales.en;
  const contact = data.contact;

  document.documentElement.dir = content.dir;
  document.title = `${content.profile.name} | ${content.profile.title}`;
  document.querySelector('meta[name="description"]').setAttribute('content', content.seo.description);

  renderHero(content, contact);

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
};

fetch(dataUrl)
  .then((response) => {
    if (!response.ok) throw new Error('Resume data could not be loaded.');
    return response.json();
  })
  .then(render)
  .catch((error) => {
    root.textContent = error.message;
  });
