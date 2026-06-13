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

const render = (data) => {
  const content = data.locales[locale] || data.locales.en;
  const contact = data.contact;
  const phone = locale === 'fa' ? contact.phone.fa : contact.phone.international;

  document.documentElement.dir = content.dir;
  document.title = `${content.profile.name} | ${content.profile.title}`;
  document.querySelector('meta[name="description"]').setAttribute('content', content.seo.description);

  root.appendChild(create('h1', content.profile.name));
  root.appendChild(create('p', `${content.profile.title} — ${content.profile.tagline}`, 'lead'));

  const contactBar = create('div', '', 'contact');
  [content.profile.location, phone, contact.email.display].forEach((item) => contactBar.appendChild(create('span', item)));
  const linkedin = create('a', contact.linkedin.label);
  linkedin.href = contact.linkedin.url;
  contactBar.appendChild(linkedin);
  root.appendChild(contactBar);

  const addSection = (title, body) => {
    root.appendChild(create('h2', title));
    root.appendChild(body);
  };

  const summary = create('section', '', 'card');
  content.summary.forEach((paragraph) => summary.appendChild(create('p', paragraph)));
  addSection(content.sections.summary, summary);

  const competencies = create('section', '', 'grid');
  content.competencies.forEach((group) => {
    const card = create('article', '', 'card');
    card.append(create('h3', group.group), tags(group.items));
    competencies.appendChild(card);
  });
  addSection(content.sections.competencies, competencies);

  const experience = create('section');
  content.experience.forEach((job) => {
    const item = create('article', '', 'job');
    item.appendChild(create('div', job.period, 'period'));
    const card = create('div', '', 'card');
    card.append(create('h3', job.role), create('p', job.company, 'company'), list(job.description));
    if (job.achievements.length) {
      const achievements = create('div', '', 'achievements');
      achievements.append(create('strong', content.sections.achievements), list(job.achievements));
      card.appendChild(achievements);
    }
    item.appendChild(card);
    experience.appendChild(item);
  });
  addSection(content.sections.experience, experience);

  addSection(content.sections.technologies, tags(content.technologies));
  addSection(content.sections.education, list(content.education));
  addSection(content.sections.certificates, tags(content.certificates));
  addSection(content.sections.languages, tags(content.languages));
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
