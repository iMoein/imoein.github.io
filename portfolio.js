const $ = (selector) => document.querySelector(selector);

const state = {
  data: null,
  locale: new URLSearchParams(window.location.search).get("lang") || localStorage.getItem("site-locale") || "fa"
};

const clear = (element) => {
  if (!element) return;
  while (element.firstChild) element.removeChild(element.firstChild);
};

const setText = (selector, value) => {
  const element = $(selector);
  if (element) element.textContent = value;
};

const setMetaContent = (selector, value) => {
  const element = $(selector);
  if (element) element.setAttribute("content", value);
};

const setLinkHref = (selector, value) => {
  const element = $(selector);
  if (element) element.setAttribute("href", value);
};

const createButton = (text, onClick, isActive = false) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.className = isActive ? "active" : "";
  button.addEventListener("click", onClick);
  return button;
};

const renderLocaleSwitcher = () => {
  const switcher = $("#locale-switcher");
  switcher.dataset.locale = state.locale;
  // Keep the animated thumb alive so its transform can transition.
  switcher.querySelectorAll("button").forEach((button) => button.remove());
  const english = createButton("EN", () => setLocale("en"), state.locale === "en");
  const persian = createButton("فا", () => setLocale("fa"), state.locale === "fa");
  [english, persian].forEach((button, index) => {
    const lang = index === 0 ? "en" : "fa";
    button.dataset.lang = lang;
    button.lang = lang;
    button.setAttribute("aria-pressed", String(state.locale === lang));
    button.setAttribute("aria-label", lang === "fa" ? "نمایش فارسی" : "Show English");
  });
  switcher.append(english, persian);
};

const renderSeo = (content) => {
  const title = `${content.title} | Moein Ghezelbash`;
  const url = `https://imoein.com/portfolio.html${state.locale === "en" ? "?lang=en" : ""}`;
  const keywords = content.seo.keywords?.join(", ") || "";

  document.title = title;
  setMetaContent("#meta-description", content.seo.description);
  setMetaContent("#meta-keywords", keywords);
  setMetaContent("#og-title", title);
  setMetaContent("#og-description", content.seo.description);
  setMetaContent("#og-url", url);
  setMetaContent("#og-locale", state.locale === "fa" ? "fa_IR" : "en_US");
  setMetaContent("#twitter-title", title);
  setMetaContent("#twitter-description", content.seo.description);
  setLinkHref("#canonical-url", url);
};

const renderSchema = (content) => {
  const schema = $("#portfolio-schema");
  if (!schema) return;

  schema.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `https://imoein.com/portfolio.html${state.locale === "en" ? "?lang=en" : ""}#portfolio`,
    name: content.title,
    description: content.seo.description,
    url: `https://imoein.com/portfolio.html${state.locale === "en" ? "?lang=en" : ""}`,
    inLanguage: content.lang,
    author: {
      "@type": "Person",
      "@id": "https://imoein.com/#person",
      name: "Moein Ghezelbash",
      alternateName: "معین قزلباش"
    },
    about: content.seo.keywords,
    mainEntity: content.projects.map((project) => ({
      "@type": "CreativeWork",
      name: project.title,
      description: project.description,
      creator: { "@id": "https://imoein.com/#person" },
      keywords: content.seo.keywords.join(", ")
    }))
  });
};

const renderIntro = (content) => {
  const target = $("#portfolio-intro");
  clear(target);
  content.intro.forEach((text) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    target.appendChild(paragraph);
  });
};

const renderProjects = (content) => {
  const target = $("#portfolio-projects");
  clear(target);
  content.projects.forEach((project, index) => {
    const article = document.createElement("article");
    article.className = "card portfolio-card";

    const number = document.createElement("span");
    number.className = "portfolio-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const title = document.createElement("h3");
    title.textContent = project.title;

    const description = document.createElement("p");
    description.className = "portfolio-card-description";
    description.textContent = project.description;

    if (project.subtitle) {
      const subtitle = document.createElement("p");
      subtitle.className = "portfolio-card-subtitle";
      subtitle.textContent = project.subtitle;
      article.append(number, title, subtitle, description);
    } else {
      article.append(number, title, description);
    }
    target.appendChild(article);
  });
};

const renderNotice = (content) => {
  const target = $("#confidentiality-notice");
  clear(target);
  const paragraph = document.createElement("p");
  paragraph.textContent = content.notice;
  target.appendChild(paragraph);
};

const renderFooter = (content) => {
  const nav = $("#footer-nav");
  if (!nav) return; // Common footer owns the links on all pages.
  clear(nav);
  [
    { label: content.nav.home, href: `/${state.locale === "en" ? "?lang=en" : ""}` },
    { label: content.nav.resumeFa, href: "/resume/moein-ghezelbash-fa.html" },
    { label: content.nav.resumeEn, href: "/resume/moein-ghezelbash-en.html" }
  ].forEach((item) => {
    const link = document.createElement("a");
    link.href = item.href;
    link.textContent = item.label;
    nav.appendChild(link);
  });
  setText("#footer-copy", `© ${new Date().getFullYear()} Moein Ghezelbash.`);
};

const renderPortfolio = () => {
  const content = state.data.locales[state.locale] || state.data.locales[state.data.defaultLocale];
  document.documentElement.lang = content.lang;
  document.documentElement.dir = content.dir;
  document.body.className = `locale-${content.lang}`;

  renderSeo(content);
  renderSchema(content);
  renderLocaleSwitcher();
  setText("#eyebrow", content.eyebrow);
  setText("#portfolio-title", content.title);
  const subtitle = $("#portfolio-subtitle");
  if (subtitle) {
    subtitle.textContent = content.subtitle || "";
    subtitle.hidden = !content.subtitle;
  }
  setText("#projects-title", content.sections.projects);
  setText("#notice-title", content.sections.notice);
  renderIntro(content);
  renderProjects(content);
  renderNotice(content);
  renderFooter(content);
};

const setLocale = (locale) => {
  if (locale === state.locale) return;
  state.locale = locale;
  localStorage.setItem("site-locale", locale);
  // Keep the selected language shareable and persistent after reload.
  // No full navigation: the pill and content can animate in place.
  const address = new URL(window.location.href);
  if (locale === "en") address.searchParams.set("lang", "en");
  else address.searchParams.delete("lang");
  window.history.replaceState(window.history.state, "", address.pathname + address.search + address.hash);
  renderPortfolio();
};

fetch("portfolio.json")
  .then((response) => {
    if (!response.ok) throw new Error("Portfolio data could not be loaded.");
    return response.json();
  })
  .then((data) => {
    state.data = data;
    if (!data.locales[state.locale]) state.locale = data.defaultLocale || "fa";
    renderPortfolio();
    window.siteReady?.();
  })
  .catch((error) => {
    setText("#app-error", error.message);
    window.siteReady?.();
  });
