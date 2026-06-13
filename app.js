const $ = (selector) => document.querySelector(selector);

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

const renderContact = ({ location, email, phone, linkedin }) => {
  const contact = $("#contact");
  const entries = [
    { type: "span", text: location },
    { type: "a", text: email, href: `mailto:${email}` },
    { type: "a", text: phone, href: `tel:${phone}` },
    { type: "a", text: linkedin.label, href: linkedin.url }
  ];

  entries.forEach(({ type, text, href }) => {
    const element = document.createElement(type);
    element.textContent = text;
    if (href) {
      element.href = href;
      if (href.startsWith("http")) {
        element.target = "_blank";
        element.rel = "noreferrer";
      }
    }
    contact.appendChild(element);
  });
};

const renderResume = (data) => {
  document.title = `${data.profile.name} | ${data.profile.title}`;
  $("#name").textContent = data.profile.name;
  $("#role").textContent = data.profile.title;
  $("#tagline").textContent = data.profile.tagline;
  renderContact(data.profile);

  const summary = $("#summary");
  data.summary.forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    summary.appendChild(p);
  });

  const competencies = $("#competencies");
  data.competencies.forEach(({ group, items }) => {
    const card = document.createElement("article");
    card.className = "card competency";
    const heading = document.createElement("h3");
    heading.textContent = group;
    card.appendChild(heading);
    card.appendChild(createList(items, "tag-list"));
    competencies.appendChild(card);
  });

  const timeline = $("#experience");
  data.experience.forEach((job) => {
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
    body.append(role, company);
    body.appendChild(createList(job.description));

    if (job.achievements.length) {
      const achievements = document.createElement("div");
      achievements.className = "achievements";
      const achievementsTitle = document.createElement("strong");
      achievementsTitle.textContent = "Key Achievements";
      achievements.appendChild(achievementsTitle);
      achievements.appendChild(createList(job.achievements));
      body.appendChild(achievements);
    }

    item.append(period, body);
    timeline.appendChild(item);
  });

  $("#technologies").appendChild(createList(data.technologies, "tag-list"));
  $("#education").appendChild(createList(data.education));
  $("#languages").appendChild(createList(data.languages, "tag-list"));
  $("#year").textContent = new Date().getFullYear();
};

fetch("resume.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("Resume data could not be loaded.");
    }
    return response.json();
  })
  .then(renderResume)
  .catch((error) => {
    $("#app-error").textContent = error.message;
  });
