const $ = (selector) => document.querySelector(selector);

const state = {
  data: null,
  locale: new URLSearchParams(window.location.search).get("lang") || localStorage.getItem("site-locale") || "fa"
};

const clear = (element) => {
  while (element.firstChild) element.removeChild(element.firstChild);
};

const setText = (selector, value) => {
  const element = $(selector);
  if (element) element.textContent = value;
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

const setMetaContent = (selector, value) => {
  const element = $(selector);
  if (element) element.setAttribute("content", value);
};

const setLinkHref = (selector, value) => {
  const element = $(selector);
  if (element) element.setAttribute("href", value);
};

const renderLocaleSwitcher = () => {
  const switcher = $("#locale-switcher");
  clear(switcher);
  switcher.append(
    createButton("فا", () => setLocale("fa"), state.locale === "fa"),
    createButton("EN", () => setLocale("en"), state.locale === "en")
  );
};

const renderProfileImage = (data, content) => {
  const image = $("#profile-photo");
  const initials = $("#profile-initials");
  const candidates = data.profileImageCandidates || [data.profileImage].filter(Boolean);
  initials.textContent = content.heroName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  if (!candidates.length) {
    image.hidden = true;
    initials.hidden = false;
    return;
  }

  let candidateIndex = 0;
  const tryNextImage = () => {
    if (candidateIndex >= candidates.length) {
      image.hidden = true;
      initials.hidden = false;
      return;
    }
    image.src = candidates[candidateIndex];
    candidateIndex += 1;
  };

  image.hidden = false;
  initials.hidden = true;
  image.onerror = tryNextImage;
  tryNextImage();
};

const renderStructuredData = (content, data) => {
  const schema = $("#person-schema");
  if (!schema) return;

  const sameAs = data.socialLinks
    .filter((item) => item.enabled !== false)
    .map((item) => item.url);
  const knowsAbout = content.expertise
    .flatMap((item) => (typeof item === "string" ? [item] : [item.title, item.body]))
    .filter(Boolean);

  schema.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": "https://imoein.com/#person",
    name: data.locales.en.profile.name,
    alternateName: [
      data.locales.fa.profile.name,
      "معین قزلباش",
      "Moein Ghezelbash"
    ],
    jobTitle: [data.locales.en.profile.title, data.locales.fa.profile.title].filter(Boolean),
    description: content.seo.description,
    url: "https://imoein.com/",
    image: "https://imoein.com/assets/profile.jpg",
    email: data.contact?.email?.display,
    telephone: data.contact?.phone?.international,
    address: {
      "@type": "PostalAddress",
      addressLocality: data.locales.en.profile.location,
      addressCountry: "IR"
    },
    sameAs,
    knowsAbout,
    alumniOf: data.locales.en.education?.map((item) => item.school || item.title).filter(Boolean),
    worksFor: content.brands?.map((name) => ({ "@type": "Organization", name }))
  });
};

const renderSeo = (content, data) => {
  const title = content.heroTitle ? `${content.heroName} | ${content.heroTitle}` : `${content.heroName} | ${content.sections.about}`;
  const description = content.seo.description;
  const keywords = content.seo.keywords?.join(", ") || "";
  const url = `https://imoein.com/${state.locale === "en" ? "?lang=en" : ""}`;

  document.title = title;
  setMetaContent("#meta-description", description);
  setMetaContent("#og-title", title);
  setMetaContent("#og-description", description);
  setMetaContent("#og-url", url);
  setMetaContent("#og-locale", state.locale === "fa" ? "fa_IR" : "en_US");
  setMetaContent("#twitter-title", title);
  setMetaContent("#twitter-description", description);
  setMetaContent("#meta-keywords", keywords);
  setMetaContent("#meta-author", data.locales.en.profile.name);
  setLinkHref("#canonical-url", url);
  renderStructuredData(content, data);
};

const renderParagraphs = (selector, paragraphs) => {
  const target = $(selector);
  clear(target);
  paragraphs.forEach((text) => {
    const p = document.createElement("p");
    p.textContent = text;
    target.appendChild(p);
  });
};

const renderHeroSubtitles = (subtitles = []) => {
  const target = $("#hero-subtitles");
  clear(target);
  subtitles.forEach((text) => {
    const line = document.createElement("span");
    line.textContent = text;
    target.appendChild(line);
  });
};

const renderAbout = (content) => {
  const target = $("#intro");
  clear(target);
  const blocks = content.aboutBlocks || [{ title: content.sections.about, paragraphs: content.intro }];
  blocks.forEach((block, index) => {
    if (block.title && index > 0) {
      const heading = document.createElement("h3");
      heading.textContent = block.title;
      target.appendChild(heading);
    }
    block.paragraphs.forEach((text) => {
      const p = document.createElement("p");
      p.textContent = text;
      target.appendChild(p);
    });
    if (block.items?.length) {
      target.appendChild(createList(block.items, "about-list"));
    }
  });
};

const renderSocialLinks = (links) => {
  const target = $("#social-links");
  clear(target);
  links.filter((item) => item.enabled !== false).forEach(({ label, url, icon, iconSrc }) => {
    const link = document.createElement("a");
    link.href = url;
    const mark = document.createElement("span");
    mark.className = "social-icon";
    if (iconSrc) {
      const image = document.createElement("img");
      image.src = iconSrc;
      image.alt = "";
      image.onerror = () => {
        image.remove();
        mark.textContent = icon || label.slice(0, 2);
      };
      mark.appendChild(image);
    } else {
      mark.textContent = icon || label.slice(0, 2);
    }
    const text = document.createElement("span");
    text.textContent = label;
    link.append(mark, text);
    target.appendChild(link);
  });
};

const renderProjectCard = (content) => {
  const projectCard = content.projectCard;
  setText("#projects-card-title", content.sections.projects);
  setText("#projects-card-description", projectCard?.description || "");
  const link = $("#projects-card-link");
  if (link && projectCard) {
    link.href = projectCard.href;
    link.textContent = projectCard.linkLabel;
  }
};

const renderResumeLinks = (content, resumeFiles, resumeDownloads) => {
  const downloads = $("#downloads");
  clear(downloads);
  ["fa", "en"].forEach((locale) => {
    const link = document.createElement("a");
    link.className = "resume-link view-link";
    link.href = resumeFiles[locale];
    link.textContent = content.resumeLinks[locale];
    downloads.appendChild(link);
  });
  ["fa", "en"].forEach((locale) => {
    const link = document.createElement("a");
    link.className = "resume-link download-link";
    link.href = resumeDownloads[locale];
    link.textContent = content.resumeDownloadLinks[locale];
    link.download = "";
    downloads.appendChild(link);
  });
};

const renderFooter = (data, content) => {
  const nav = $("#footer-nav");
  const copy = $("#footer-copy");
  const links = data.footerNavigation?.[state.locale] || data.footerNavigation?.[data.defaultLocale] || [];

  if (nav) {
    clear(nav);
    links.forEach((item) => {
      const link = document.createElement("a");
      link.href = item.href;
      link.textContent = item.label;
      nav.appendChild(link);
    });
  }

  if (copy) {
    copy.textContent = `© ${new Date().getFullYear()} ${data.copyright || content.heroName}.`;
  }
};

const companyInitials = (company) => company
  .split(/\s+|&|-/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join("")
  .toUpperCase();

const renderCompanyLogo = (logo, company) => {
  const box = document.createElement("span");
  box.className = "brand-logo";
  const fallback = document.createElement("span");
  fallback.textContent = logo?.text || companyInitials(company);
  const candidates = logo?.candidates?.length ? logo.candidates : [logo?.src].filter(Boolean);

  if (!candidates.length) {
    box.appendChild(fallback);
    return box;
  }

  const image = document.createElement("img");
  image.alt = `${company} logo`;
  let candidateIndex = 0;
  const tryNextLogo = () => {
    if (candidateIndex >= candidates.length) {
      image.remove();
      if (!box.contains(fallback)) box.appendChild(fallback);
      return;
    }
    image.src = candidates[candidateIndex];
    candidateIndex += 1;
  };
  image.onerror = tryNextLogo;
  box.appendChild(image);
  tryNextLogo();
  return box;
};

const renderCards = (selector, items, className = "card") => {
  const target = $(selector);
  clear(target);
  items.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = className;
    if (typeof item === "string") {
      if (className.includes("action-card")) {
        const badge = document.createElement("span");
        badge.className = "card-badge";
        badge.textContent = String(index + 1).padStart(2, "0");
        const text = document.createElement("p");
        text.textContent = item;
        card.append(badge, text);
      } else {
        card.textContent = item;
      }
    } else {
      const title = document.createElement("h3");
      title.textContent = item.title;
      const body = document.createElement("p");
      body.textContent = item.body;
      card.append(title, body);
    }
    target.appendChild(card);
  });
};

const renderExperienceSummary = (content, data) => {
  const target = $("#experience-summary");
  clear(target);
  const companies = new Map();
  data.locales[state.locale].experience.forEach((job) => {
    if (!companies.has(job.company)) {
      companies.set(job.company, job.logo);
    }
  });

  const brandList = document.createElement("div");
  brandList.className = "brand-logo-list";
  companies.forEach((logo, company) => {
    const item = document.createElement("article");
    item.className = "brand-logo-item";
    item.append(renderCompanyLogo(logo, company), document.createTextNode(company));
    brandList.appendChild(item);
  });
  target.appendChild(brandList);

  const roles = document.createElement("p");
  roles.textContent = content.roles;
  target.appendChild(roles);
};

const renderHome = () => {
  const { data } = state;
  const content = data.home[state.locale] || data.home.fa;
  document.documentElement.lang = content.lang;
  document.documentElement.dir = content.dir;
  document.body.className = `locale-${content.lang}`;

  renderSeo(content, data);
  renderLocaleSwitcher();
  renderProfileImage(data, content);

  setText("#eyebrow", content.eyebrow);
  setText("#home-name", content.heroName);
  renderHeroSubtitles(content.heroSubtitles);
  setText("#about-title", content.sections.about);
  setText("#social-title", content.sections.social);
  setText("#resume-title", content.sections.resume);
  setText("#projects-card-title", content.sections.projects);
  setText("#what-title", content.sections.whatIDo);
  setText("#expertise-title", content.sections.expertise);
  setText("#experience-title", content.sections.experience);
  setText("#philosophy-title", content.sections.philosophy);
  setText("#current-title", content.sections.current);

  renderAbout(content);
  renderSocialLinks(data.socialLinks);
  renderResumeLinks(content, data.resumeFiles, data.resumeDownloads);
  renderProjectCard(content);
  renderCards("#what-i-do", content.whatIDo, "card action-card");
  renderCards("#expertise", content.expertise, "card expertise-card");
  renderExperienceSummary(content, data);
  renderCards("#current-focus", content.current, "focus-pill");
  renderParagraphs("#philosophy", content.philosophy);
  renderFooter(data, content);
};

const setLocale = (locale) => {
  state.locale = locale;
  localStorage.setItem("site-locale", locale);
  renderHome();
};

fetch("resume/site-data.json")
  .then((response) => {
    if (!response.ok) throw new Error("Site data could not be loaded.");
    return response.json();
  })
  .then((data) => {
    state.data = data;
    if (!data.home[state.locale]) state.locale = "fa";
    renderHome();
  })
  .catch((error) => {
    setText("#app-error", error.message);
  });
