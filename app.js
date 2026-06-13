const $ = (selector) => document.querySelector(selector);

const state = {
  data: null,
  locale: new URLSearchParams(window.location.search).get("lang") || localStorage.getItem("site-locale") || "fa"
};

const clear = (element) => {
  while (element.firstChild) element.removeChild(element.firstChild);
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

const renderSeo = (content) => {
  const title = content.heroTitle ? `${content.heroName} | ${content.heroTitle}` : `${content.heroName} | ${content.sections.about}`;
  const description = content.seo.description;
  const url = `https://imoein.com/${state.locale === "en" ? "?lang=en" : ""}`;

  document.title = title;
  setMetaContent("#meta-description", description);
  setMetaContent("#og-title", title);
  setMetaContent("#og-description", description);
  setMetaContent("#og-url", url);
  setMetaContent("#og-locale", state.locale === "fa" ? "fa_IR" : "en_US");
  setMetaContent("#twitter-title", title);
  setMetaContent("#twitter-description", description);
  setLinkHref("#canonical-url", url);
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
    link.target = "_blank";
    link.rel = "noreferrer";
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

const renderResumeLinks = (content, resumeFiles, resumeDownloads) => {
  const downloads = $("#downloads");
  clear(downloads);
  ["fa", "en"].forEach((locale) => {
    const link = document.createElement("a");
    link.className = "resume-link view-link";
    link.href = resumeFiles[locale];
    link.textContent = content.resumeLinks[locale];
    link.target = "_blank";
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

  renderSeo(content);
  renderLocaleSwitcher();
  renderProfileImage(data, content);

  $("#eyebrow").textContent = content.eyebrow;
  $("#home-name").textContent = content.heroName;
  renderHeroSubtitles(content.heroSubtitles);
  $("#about-title").textContent = content.sections.about;
  $("#social-title").textContent = content.sections.social;
  $("#resume-title").textContent = content.sections.resume;
  $("#what-title").textContent = content.sections.whatIDo;
  $("#expertise-title").textContent = content.sections.expertise;
  $("#experience-title").textContent = content.sections.experience;
  $("#philosophy-title").textContent = content.sections.philosophy;
  $("#current-title").textContent = content.sections.current;

  renderAbout(content);
  renderSocialLinks(data.socialLinks);
  renderResumeLinks(content, data.resumeFiles, data.resumeDownloads);
  renderCards("#what-i-do", content.whatIDo, "card action-card");
  renderCards("#expertise", content.expertise, "card expertise-card");
  renderExperienceSummary(content, data);
  renderCards("#current-focus", content.current, "focus-pill");
  renderParagraphs("#philosophy", content.philosophy);
  $("#year").textContent = new Date().getFullYear();
};

const setLocale = (locale) => {
  state.locale = locale;
  localStorage.setItem("site-locale", locale);
  renderHome();
};

fetch("resume.json")
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
    $("#app-error").textContent = error.message;
  });
