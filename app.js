const $ = (selector) => document.querySelector(selector);

const state = {
  data: null,
  locale: new URLSearchParams(window.location.search).get("lang") || localStorage.getItem("resume-locale") || "en"
};

const clear = (element) => {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
};

const createList = (items, className = "clean") => {
  const ul = document.createElement("ul");
  ul.className = className;
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    ul.appendChild(li);
  });
  return ul;
};

const createButton = (text, onClick, isActive = false) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.className = isActive ? "active" : "";
  button.addEventListener("click", onClick);
  return button;
};

const getEmailAddress = (contact) => `${contact.email.user}@${contact.email.domainParts.join(".")}`;

const renderLocaleSwitcher = () => {
  const switcher = $("#locale-switcher");
  clear(switcher);
  switcher.append(
    createButton("EN", () => setLocale("en"), state.locale === "en"),
    createButton("فا", () => setLocale("fa"), state.locale === "fa")
  );
};

const renderContact = (content, contact) => {
  const contactBar = $("#contact");
  clear(contactBar);
  contactBar.setAttribute("aria-label", content.navLabel);

  const emailAddress = getEmailAddress(contact);
  const phoneText = state.locale === "fa" ? contact.phone.fa : contact.phone.international;
  const entries = [
    { type: "span", text: content.profile.location },
    { type: "a", text: phoneText, href: `tel:${contact.phone.international}` },
    { type: "button", text: contact.email.display, action: (element) => {
      const link = document.createElement("a");
      link.href = `mailto:${emailAddress}`;
      link.textContent = emailAddress;
      element.textContent = emailAddress;
      element.replaceWith(link);
    } },
    { type: "a", text: contact.linkedin.label, href: contact.linkedin.url }
  ];

  entries.forEach(({ type, text, href, action }) => {
    const element = document.createElement(type);
    element.textContent = text;
    if (type === "button") {
      element.type = "button";
      element.className = "contact-button";
      element.setAttribute("aria-label", "Reveal email address");
      element.addEventListener("click", () => action(element), { once: true });
    }
    if (href) {
      element.href = href;
      if (href.startsWith("http")) {
        element.target = "_blank";
        element.rel = "noreferrer";
      }
    }
    contactBar.appendChild(element);
  });
};

const renderResumeLinks = (content, resumeFiles) => {
  const downloads = $("#downloads");
  clear(downloads);
  const label = document.createElement("span");
  label.textContent = content.downloadLabel;
  downloads.appendChild(label);

  const link = document.createElement("a");
  link.href = resumeFiles[state.locale];
  link.textContent = content.downloadLinks[state.locale];
  link.target = "_blank";
  downloads.appendChild(link);
};

const renderProfileImage = (data, content) => {
  const image = $("#profile-photo");
  const initials = $("#profile-initials");
  initials.textContent = content.profile.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  if (!data.profileImage) {
    image.hidden = true;
    initials.hidden = false;
    return;
  }

  image.src = data.profileImage;
  image.hidden = false;
  initials.hidden = true;
  image.onerror = () => {
    image.hidden = true;
    initials.hidden = false;
  };
};

const renderSideSection = (selector, items, className = "clean") => {
  const target = $(selector);
  clear(target);
  target.appendChild(createList(items, className));
};

const renderResume = () => {
  const { data } = state;
  const content = data.locales[state.locale] || data.locales[data.defaultLocale];
  document.documentElement.lang = content.lang;
  document.documentElement.dir = content.dir;
  document.body.className = `locale-${content.lang}`;
  document.title = `${content.profile.name} | ${content.profile.title}`;

  renderLocaleSwitcher();
  $("#eyebrow").textContent = content.eyebrow;
  $("#name").textContent = content.profile.name;
  $("#role").textContent = content.profile.title;
  $("#tagline").textContent = content.profile.tagline;
  renderProfileImage(data, content);
  renderContact(content, data.contact);
  renderResumeLinks(content, data.resumeFiles);

  $("#summary-title").textContent = content.sections.summary;
  $("#competencies-title").textContent = content.sections.competencies;
  $("#experience-title").textContent = content.sections.experience;
  $("#technologies-title").textContent = content.sections.technologies;
  $("#education-title").textContent = content.sections.education;
  $("#certificates-title").textContent = content.sections.certificates;
  $("#languages-title").textContent = content.sections.languages;

  const summary = $("#summary");
  clear(summary);
  content.summary.forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    summary.appendChild(p);
  });

  const competencies = $("#competencies");
  clear(competencies);
  content.competencies.forEach(({ group, items }) => {
    const card = document.createElement("article");
    card.className = "card competency";
    const heading = document.createElement("h3");
    heading.textContent = group;
    card.append(heading, createList(items, "tag-list"));
    competencies.appendChild(card);
  });

  const timeline = $("#experience");
  clear(timeline);
  content.experience.forEach((job) => {
    const item = document.createElement("article");
    item.className = "timeline-item";

    const period = document.createElement("div");
    period.className = "period";
    period.textContent = job.period;

    const body = document.createElement("div");
    body.className = "card job";
    const role = document.createElement("h3");
    role.textContent = job.role;
    const company = document.createElement("div");
    company.className = "company";
    company.textContent = job.company;
    body.append(role, company, createList(job.description));

    if (job.achievements.length) {
      const achievements = document.createElement("div");
      achievements.className = "achievements";
      const achievementsTitle = document.createElement("strong");
      achievementsTitle.textContent = content.sections.achievements;
      achievements.append(achievementsTitle, createList(job.achievements));
      body.appendChild(achievements);
    }

    item.append(period, body);
    timeline.appendChild(item);
  });

  renderSideSection("#technologies", content.technologies, "tag-list");
  renderSideSection("#education", content.education);
  renderSideSection("#certificates", content.certificates, "tag-list");
  renderSideSection("#languages", content.languages, "tag-list");
  $("#year").textContent = new Date().getFullYear();
  $("#footer-text").textContent = content.footer;
};

const setLocale = (locale) => {
  state.locale = locale;
  localStorage.setItem("resume-locale", locale);
  renderResume();
};

fetch("resume.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("Resume data could not be loaded.");
    }
    return response.json();
  })
  .then((data) => {
    state.data = data;
    if (!data.locales[state.locale]) {
      state.locale = data.defaultLocale;
    }
    renderResume();
  })
  .catch((error) => {
    $("#app-error").textContent = error.message;
  });
