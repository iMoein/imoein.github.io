/* Continuous, accessible brand timeline derived from the public bilingual CV. */
(() => {
  let observer;
  let layoutObserver;
  let resizeListener;
  const logoPath = value =>
    typeof value === 'string' && /^assets\/logo\/[\w.-]+\.(webp|png|jpeg|jpg)$/.test(value)
      ? '/' + value : null;
  const createCards = (records, hidden) => {
    const fragment = document.createDocumentFragment();
    records.forEach(record => {
      const card = document.createElement('li');
      card.className = 'landing-marquee-item';
      if (hidden) card.setAttribute('aria-hidden', 'true');
      const image = document.createElement('img');
      image.src = record.src;
      image.alt = '';
      image.width = 64;
      image.height = 44;
      // The scrolling track can start off-screen; eager images prevent blank logos.
      image.loading = 'eager';
      image.fetchPriority = 'low';
      image.decoding = 'async';
      const text = document.createElement('span');
      text.className = 'landing-marquee-item-info';
      const name = document.createElement('strong');
      name.textContent = record.name;
      text.append(name);
      if (record.role) {
        const role = document.createElement('small');
        role.textContent = record.role;
        text.append(role);
      }
      card.append(image, text);
      fragment.appendChild(card);
    });
    return fragment;
  };
  window.renderHomeCollaborations = (data, lang) => {
    const section = document.getElementById('landing-collaborations');
    const track = document.getElementById('landing-marquee-track');
    const localeData = data?.locales?.[lang];
    if (!section || !track || !localeData) return;
    const records = [];
    const seen = new Set();
    // One source of truth: every collaboration comes from site-data.json.
    // A new company or independent project with a logo appears on next page load.
    // Different entries may legitimately share a logo, so dedupe by name + logo.
    const add = item => {
      const name = (item.company || item.title || item.name || '').trim();
      const rawLogo = typeof item.logo === 'string' ? item.logo : item.logo?.src;
      const src = logoPath(rawLogo);
      if (!src || !name) return;
      const key = name.toLocaleLowerCase() + '|' + src;
      if (seen.has(key)) return;
      seen.add(key);
      // Only job titles explicitly recorded in the bilingual resume may appear.
      // Independent projects without a role show the project name only.
      const role = typeof item.role === 'string' ? item.role.trim() : '';
      records.push({name, src, role});
    };
    const sections = ['experience', 'consulting', 'additionalExperience', 'independentProjects'];
    sections.forEach(sectionName => {
      const entries = localeData[sectionName];
      if (Array.isArray(entries)) entries.forEach(add);
    });
    if (!records.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    if (layoutObserver) layoutObserver.disconnect();
    if (resizeListener) window.removeEventListener('resize', resizeListener);
    // One flat grid: the repeat starts exactly one card-gap after the last
    // original. This removes the separate UL/Flex boundary that overlapped
    // on iOS in Persian. The duplicate is hidden from assistive technology.
    track.replaceChildren(createCards(records, false), createCards(records, true));
    track.style.setProperty('--marquee-duration', Math.max(30, records.length * 4.6) + 's');

    // Explicit track width and grid column widths avoid WebKit max-content,
    // RTL flex measurement and fractional seam inconsistencies.
    // Any added resume/company record automatically expands both dimensions.
    const syncCycleWidth = () => {
      const card = track.firstElementChild;
      if (!card) return;
      const style = getComputedStyle(track);
      const cardWidth = parseFloat(style.gridAutoColumns) || card.getBoundingClientRect().width;
      const gap = parseFloat(style.columnGap) || 0;
      const distance = records.length * (cardWidth + gap);
      const totalWidth = 2 * records.length * cardWidth + (2 * records.length - 1) * gap;
      if (!Number.isFinite(distance) || distance <= 0) return;
      const width = distance + 'px';
      if (track.style.getPropertyValue('--marquee-cycle-width') === width) return;
      track.style.setProperty('--marquee-cycle-width', width);
      track.style.setProperty('--marquee-total-width', totalWidth + 'px');
      track.style.setProperty('--marquee-offset', -distance + 'px');
    };
    syncCycleWidth();
    resizeListener = syncCycleWidth;
    window.addEventListener('resize', resizeListener, {passive:true});
    if ('ResizeObserver' in window) {
      layoutObserver = new ResizeObserver(syncCycleWidth);
      layoutObserver.observe(section);
    }
    if (observer) observer.disconnect();
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        section.classList.toggle('is-in-view', entries.some(entry => entry.isIntersecting));
      }, {rootMargin:'80px'});
      observer.observe(section);
    } else {
      section.classList.add('is-in-view');
    }
  };
})();
