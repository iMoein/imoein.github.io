/* Static, scalable blog: 10 cards per SEO-friendly HTML page.
 * Search/filter lazily loads a compact JSON index (not article bodies).
 */
(() => {
  const lang = document.documentElement.lang === 'en' ? 'en' : 'fa';
  const locale = lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-GB';
  const formatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  });
  const numbers = new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-GB');
  const words = lang === 'fa'
    ? { count: 'مقاله', previous: 'قبلی', next: 'بعدی', error: 'فهرست جست‌وجو بارگذاری نشد. دوباره تلاش کنید.' }
    : { count: 'articles', previous: 'Previous', next: 'Next', error: 'Search index could not be loaded. Please try again.' };

  const displayDate = (node, iso) => {
    const dt = new Date(iso + 'T12:00:00Z');
    node.textContent = Number.isNaN(dt.getTime()) ? iso : formatter.format(dt);
  };
  document.querySelectorAll('.blog-date[data-iso]').forEach(node => displayDate(node, node.dataset.iso));

  // Preserve real <table> markup and accessible column headers. Never shrink
  // a wide data table into unreadable mobile columns: scroll its own frame.
  const enhanceArticleTables = () => {
    const tables = document.querySelectorAll('.blog-article-content table');
    tables.forEach((table, index) => {
      if (table.closest('.blog-table-frame')) return;
      const columns = Math.max(0, ...[...table.rows].map(row =>
        [...row.cells].reduce((sum, cell) => sum + cell.colSpan, 0)));
      if (!columns) return;
      const frame = document.createElement('div');
      frame.className = 'blog-table-frame';
      frame.classList.add(columns === 2 ? 'is-two-column' : columns > 2 ? 'is-wide' : 'is-single-column');
      const viewport = document.createElement('div');
      viewport.className = 'blog-table-viewport';
      const hint = document.createElement('p');
      hint.className = 'blog-table-hint';
      hint.hidden = true;
      const label = lang === 'fa' ? 'جدول داده‌ها؛ پیمایش افقی' : 'Data table; horizontally scrollable';
      hint.textContent = lang === 'fa'
        ? 'برای مشاهده ستون‌های بیشتر، جدول را به چپ یا راست بکشید.'
        : 'Swipe left or right to see more columns.';
      hint.id = `blog-table-hint-${index + 1}`;
      frame.style.setProperty('--blog-table-min-width', (150 + (columns - 1) * 190) + 'px');
      table.before(frame);
      frame.append(hint, viewport);
      viewport.append(table);
      // Only offer a keyboard scroll target/landmark when it is actually needed.
      const update = () => {
        const scrollable = viewport.scrollWidth > viewport.clientWidth + 2;
        frame.classList.toggle('is-scrollable', scrollable);
        hint.hidden = !scrollable;
        if (scrollable) {
          viewport.tabIndex = 0;
          viewport.setAttribute('role', 'region');
          viewport.setAttribute('aria-label', label);
          viewport.setAttribute('aria-describedby', hint.id);
        } else {
          viewport.removeAttribute('tabindex');
          viewport.removeAttribute('role');
          viewport.removeAttribute('aria-label');
          viewport.removeAttribute('aria-describedby');
        }
      };
      update();
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(update);
        observer.observe(viewport);
      } else window.addEventListener('resize', update, {passive:true});
    });
  };
  enhanceArticleTables();

  const normalize = (value) => String(value || '')
    .normalize('NFKC')
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\u200B-\u200D_–—-]/g, ' ')
    .replace(/\s+/g, ' ').trim()
    .toLocaleLowerCase(lang === 'fa' ? 'fa-IR' : 'en-GB');

  // Accessible, fully styled single-select menu. The original native select
  // remains in the markup as a no-JavaScript fallback and form source.
  const enhanceCategorySelect = (select) => {
    if (!select || select.options.length === 0) return () => {};
    const host = select.closest('.blog-category-control');
    if (!host) return () => {};
    const options = [...select.options];
    const custom = document.createElement('div');
    custom.className = 'blog-category-dropdown';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'blog-category-dropdown-trigger';
    trigger.id = 'blog-category-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'blog-category-options');
    trigger.setAttribute('aria-labelledby', 'blog-category-label blog-category-trigger');
    const caption = document.createElement('span');
    caption.className = 'blog-category-dropdown-value';
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.setAttribute('class', 'blog-category-dropdown-arrow');
    arrow.setAttribute('viewBox', '0 0 24 24');
    arrow.setAttribute('width', '18');
    arrow.setAttribute('height', '18');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.innerHTML = '<path d="m6 9 6 6 6-6" />';
    trigger.append(caption, arrow);

    const menu = document.createElement('div');
    menu.id = 'blog-category-options';
    menu.className = 'blog-category-dropdown-menu';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-labelledby', 'blog-category-label');
    menu.setAttribute('aria-hidden', 'true');
    const nodes = options.map((item, index) => {
      const node = document.createElement('div');
      node.className = 'blog-category-dropdown-option';
      node.id = 'blog-category-option-' + index;
      node.setAttribute('role', 'option');
      node.setAttribute('aria-selected', 'false');
      node.dataset.value = item.value;
      const label = document.createElement('span');
      label.className = 'blog-category-dropdown-option-label';
      label.textContent = item.textContent;
      const check = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      check.setAttribute('viewBox', '0 0 24 24');
      check.setAttribute('aria-hidden', 'true');
      check.setAttribute('class', 'blog-category-dropdown-check');
      check.innerHTML = '<path d="m5 12 4 4L19 6"/>';
      node.append(label, check);
      node.addEventListener('pointermove', () => {
        if (open) setActive(index);
      });
      node.addEventListener('click', () => selectOption(index));
      menu.append(node);
      return node;
    });
    custom.append(trigger, menu);
    host.append(custom);
    host.classList.add('is-enhanced');
    let open = false;
    let active = Math.max(0, select.selectedIndex);
    let typeBuffer = '';
    let lastType = 0;

    const sync = () => {
      const selected = Math.max(0, select.selectedIndex);
      caption.textContent = options[selected]?.textContent || options[0].textContent;
      nodes.forEach((node, index) => {
        const chosen = index === selected;
        node.classList.toggle('is-selected', chosen);
        node.setAttribute('aria-selected', String(chosen));
      });
    };
    const setActive = (index) => {
      active = (index + nodes.length) % nodes.length;
      nodes.forEach((node, i) => node.classList.toggle('is-focused', i === active));
      trigger.setAttribute('aria-activedescendant', nodes[active].id);
      // Scroll only the menu, never the entire document when navigating.
      const itemTop = nodes[active].offsetTop;
      const itemBottom = itemTop + nodes[active].offsetHeight;
      if (itemTop < menu.scrollTop) menu.scrollTop = itemTop;
      else if (itemBottom > menu.scrollTop + menu.clientHeight) {
        menu.scrollTop = itemBottom - menu.clientHeight;
      }
    };
    const closeMenu = (restoreFocus = false) => {
      if (!open) return;
      open = false;
      custom.classList.remove('is-open', 'opens-up');
      host.classList.remove('dropdown-open');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      menu.setAttribute('aria-hidden', 'true');
      if (restoreFocus) trigger.focus({ preventScroll: true });
    };
    const openMenu = () => {
      if (open) return;
      open = true;
      const triggerRect = trigger.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const roomBelow = viewportHeight - triggerRect.bottom;
      const roomAbove = triggerRect.top;
      const openUp = roomBelow < 290 && roomAbove > roomBelow;
      custom.classList.toggle('opens-up', openUp);
      custom.classList.add('is-open');
      host.classList.add('dropdown-open');
      trigger.setAttribute('aria-expanded', 'true');
      menu.setAttribute('aria-hidden', 'false');
      setActive(Math.max(0, select.selectedIndex));
    };
    const selectOption = (index) => {
      select.value = options[index].value;
      sync();
      closeMenu(true);
      select.dispatchEvent(new Event('change', { bubbles: true }));
    };
    trigger.addEventListener('click', () => open ? closeMenu() : openMenu());
    trigger.addEventListener('keydown', (event) => {
      const key = event.key;
      if (key === 'Escape') {
        if (open) { event.preventDefault(); closeMenu(true); }
        return;
      }
      if (key === 'Tab') { closeMenu(); return; }
      if (['ArrowDown','ArrowUp','Home','End'].includes(key)) {
        event.preventDefault();
        if (!open) openMenu();
        if (key === 'Home') setActive(0);
        else if (key === 'End') setActive(nodes.length - 1);
        else setActive(active + (key === 'ArrowDown' ? 1 : -1));
        return;
      }
      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        if (!open) openMenu(); else selectOption(active);
        return;
      }
      if (key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        const now = Date.now();
        typeBuffer = now - lastType < 700 ? typeBuffer + key : key;
        lastType = now;
        const target = options.findIndex(option =>
          normalize(option.textContent).startsWith(normalize(typeBuffer)));
        if (target >= 0) {
          event.preventDefault();
          if (!open) openMenu();
          setActive(target);
        }
      }
    });
    document.addEventListener('pointerdown', event => {
      if (open && !custom.contains(event.target)) closeMenu();
    });
    window.addEventListener('scroll', event => {
      if (open && !menu.contains(event.target)) closeMenu();
    }, { passive: true, capture: true });
    window.addEventListener('resize', () => closeMenu(), { passive: true });
    select.addEventListener('change', sync);
    sync();
    return sync;
  };

  const grid = document.getElementById('blog-articles');
  const search = document.getElementById('blog-search');
  if (grid && search) {
    const baseUrl = grid.dataset.baseUrl || '/blog/' + lang + '/';
    const isArchive = grid.dataset.archive === 'true';
    const form = document.getElementById('blog-search-form');
    const clear = document.getElementById('blog-search-clear');
    const categorySelect = document.getElementById('blog-category-select');
    const pagination = document.getElementById('blog-pagination');
    const counter = document.getElementById('blog-result-count');
    const empty = document.getElementById('blog-empty');
    const pageSize = 10;
    let indexPromise;
    let generation = 0;
    let state = {
      q: new URLSearchParams(location.search).get('q') || '',
      category: new URLSearchParams(location.search).get('category') || '',
      page: Number(new URLSearchParams(location.search).get('page')) ||
        Number(grid.dataset.currentPage) || 1
    };
    search.value = state.q;
    if (categorySelect) categorySelect.value = state.category;
    const syncCategoryControl = enhanceCategorySelect(categorySelect);

    // Only fetched when the visitor searches or filters; cache for subsequent
    // typing and paging. This stays small even if each article is 2,000 words.
    const fetchIndex = () => {
      if (!indexPromise) {
        indexPromise = fetch(grid.dataset.indexUrl, { cache: 'force-cache' })
          .then(resp => {
            if (!resp.ok) throw new Error('Unable to load blog index');
            return resp.json();
          })
          .then(data => {
            if (!Array.isArray(data.posts) || data.language !== lang) throw new Error('Invalid blog index');
            return data.posts.map(post => ({
              ...post,
              searchable: normalize(post.search || [post.title, post.summary, post.category, ...(post.tags || [])].join(' '))
            }));
          })
          .catch(err => { indexPromise = null; throw err; });
      }
      return indexPromise;
    };
    const text = (name, className, value) => {
      const node = document.createElement(name);
      if (className) node.className = className;
      if (value != null) node.textContent = value;
      return node;
    };
    const articleCard = (post, showFeatured = false) => {
      const article = text('article', 'blog-list-card' + (showFeatured ? ' is-featured' : ''));
      if (post.cover) {
        const cover = text('a', 'blog-cover' + (post.coverFit === 'contain' ? ' is-contained' : ''));
        cover.href = post.url;
        cover.setAttribute('aria-label', post.title);
        const img = document.createElement('img');
        img.src = post.cover; img.alt = post.coverAlt || '';
        img.loading = 'lazy'; img.decoding = 'async';
        cover.append(img);
        article.append(cover);
      } else {
        const cover = text('div', 'blog-cover blog-cover-placeholder');
        cover.setAttribute('aria-hidden', 'true');
        cover.append(text('span', 'blog-cover-placeholder-shape'));
        article.append(cover);
      }
      const top = text('div', 'blog-list-card-top');
      const labels = text('div', 'blog-card-labels');
      const categoryLink = text('a', 'blog-category-tag', post.category);
      categoryLink.href = post.categoryUrl || baseUrl;
      labels.append(categoryLink);
      if (showFeatured) {
        const mark = text('span', 'blog-featured-mark');
        const star = text('span', '', '✦');
        star.setAttribute('aria-hidden', 'true');
        mark.append(star, document.createTextNode(' ' + (lang === 'fa' ? 'منتخب' : 'Featured')));
        labels.append(mark);
      }
      top.append(labels);
      top.append(text('span', 'blog-readtime', numbers.format(post.minutes) + ' ' + (lang === 'fa' ? 'دقیقه مطالعه' : 'min read')));
      article.append(top);
      const heading = text('h3');
      const titleLink = text('a', '', post.title);
      titleLink.href = post.url;
      heading.append(titleLink);
      article.append(heading);
      article.append(text('p', 'blog-card-summary', post.summary));
      const tags = text('div', 'blog-card-tags');
      (post.tags || []).slice(0, 3).forEach((tag, i) => {
        const link = text('a', '', tag);
        link.href = (post.tagUrls || [])[i] || baseUrl;
        tags.append(link);
      });
      article.append(tags);
      const bottom = text('div', 'blog-card-bottom');
      const date = text('time', 'blog-date');
      date.dateTime = post.date;
      displayDate(date, post.date);
      const readLink = text('a', 'blog-read-link', lang === 'fa' ? 'مطالعه مقاله ' : 'Read article ');
      readLink.href = post.url;
      readLink.append(text('span', '', '↗'));
      readLink.lastChild.setAttribute('aria-hidden', 'true');
      bottom.append(date, readLink);
      article.append(bottom);
      return article;
    };

    const uriForPage = page => page === 1 ? baseUrl : baseUrl + 'page/' + page + '/';
    const pageTokens = (current, total) => {
      const chosen = [...new Set([1, total, current - 1, current, current + 1].filter(p => p >= 1 && p <= total))].sort((a,b)=>a-b);
      const result = [];
      for (const page of chosen) {
        if (result.length && page - result[result.length - 1] > 1) result.push('…');
        result.push(page);
      }
      return result;
    };
    const serializeUrl = () => {
      const params = new URLSearchParams();
      if (state.q.trim()) params.set('q', state.q.trim());
      if (state.category) params.set('category', state.category);
      if (state.page > 1) params.set('page', String(state.page));
      return baseUrl + (params.toString() ? '?' + params : '');
    };
    const storeUrl = (push = false) => {
      history[push ? 'pushState' : 'replaceState'](null, '', serializeUrl());
    };
    const renderNav = (count, filtered) => {
      if (!pagination) return;
      pagination.replaceChildren();
      const pages = Math.max(1, Math.ceil(count / pageSize));
      if (pages < 2) return;
      const add = (label, page, current = false, disabled = false) => {
        const node = text(filtered ? 'button' : 'a', 'blog-page-button' +
          (current ? ' is-current' : '') + (disabled ? ' is-disabled' : ''), label);
        if (filtered) {
          node.type = 'button';
          node.disabled = disabled;
          if (!disabled) node.addEventListener('click', () => changePage(page));
        } else {
          if (!disabled) node.href = uriForPage(page);
          else node.setAttribute('aria-disabled', 'true');
        }
        if (current) node.setAttribute('aria-current', 'page');
        pagination.append(node);
      };
      add(words.previous, state.page - 1, false, state.page === 1);
      for (const item of pageTokens(state.page, pages)) {
        if (item === '…') pagination.append(text('span', 'blog-page-ellipsis', '…'));
        else add(numbers.format(item), item, item === state.page);
      }
      add(words.next, state.page + 1, false, state.page === pages);
    };
    const render = async (updateUrl = true) => {
      const current = ++generation;
      const filtering = Boolean(state.q.trim() || state.category);
      if (clear) clear.hidden = !state.q;
      if (categorySelect) categorySelect.value = state.category;
      syncCategoryControl();
      if (counter) counter.setAttribute('aria-busy', 'true');
      try {
        const all = await fetchIndex();
        if (generation !== current) return;
        const terms = normalize(state.q).split(' ').filter(Boolean);
        const results = all.filter(post =>
          (!state.category || (post.categories || [post.category]).includes(state.category)) &&
          terms.every(term => post.searchable.includes(term))
        );
        // The lead card is editorial, OUTSIDE the 10 regular-page slots.
        // In search/filters and all taxonomy archives it is just a normal card.
        const featured = !filtering && !isArchive ? results.find(post => post.featured) : null;
        const ordinary = featured ? results.filter(post => post !== featured) : results;
        const pages = Math.max(1, Math.ceil(ordinary.length / pageSize));
        state.page = Math.max(1, Math.min(state.page, pages));
        const slice = ordinary.slice((state.page - 1) * pageSize, state.page * pageSize);
        const cards = slice.map(post => articleCard(post));
        if (featured && state.page === 1) cards.unshift(articleCard(featured, true));
        grid.replaceChildren(...cards);
        if (empty) empty.hidden = results.length !== 0;
        if (counter) counter.textContent = numbers.format(results.length) + ' ' + words.count;
        renderNav(ordinary.length, filtering);
        if (updateUrl) storeUrl();
      } catch (error) {
        if (generation === current && counter) {
          counter.textContent = words.error;
        }
      } finally {
        if (generation === current && counter) counter.removeAttribute('aria-busy');
      }
    };
    const changePage = page => {
      state.page = page;
      storeUrl(true);
      render(false);
      document.getElementById('blog-latest')?.scrollIntoView({ block: 'start' });
    };
    let debounce;
    const searchChanged = () => {
      state.q = search.value.trim();
      state.page = 1;
      if (clear) clear.hidden = !state.q;
      clearTimeout(debounce);
      debounce = setTimeout(() => { storeUrl(); render(false); }, 85);
    };
    search.addEventListener('input', searchChanged);
    search.addEventListener('search', searchChanged);
    search.addEventListener('compositionend', searchChanged);
    form?.addEventListener('submit', event => {
      event.preventDefault(); clearTimeout(debounce);
      state.q = search.value.trim(); state.page = 1;
      storeUrl(); render(false); search.blur();
    });
    clear?.addEventListener('click', () => {
      clearTimeout(debounce); search.value = ''; state.q = ''; state.page = 1;
      storeUrl(); render(false); search.focus();
    });
    categorySelect?.addEventListener('change', () => {
      clearTimeout(debounce);
      state.category = categorySelect.value;
      state.page = 1;
      storeUrl(); render(false);
    });
    window.addEventListener('popstate', () => {
      clearTimeout(debounce);
      const params = new URLSearchParams(location.search);
      state = { q: params.get('q') || '', category: params.get('category') || '',
        page: Number(params.get('page')) || Number(grid.dataset.currentPage) || 1 };
      search.value = state.q;
      if (categorySelect) categorySelect.value = state.category;
      syncCategoryControl();
      render(false);
    });
    if (state.q || state.category || new URLSearchParams(location.search).has('page')) render(false);
    // Initial markup already contains 10 SEO-friendly cards and server-rendered links.
  }

  // Two-stage sticky sidebar: keep "In this article" pinned first, then
  // smoothly reveal the other articles on the page's own scroll. There is no
  // nested scrollbar and no abrupt jump between the two sticky positions.
  const articleSidebar = document.querySelector('.blog-sidebar');
  if (articleSidebar) {
    const toc = articleSidebar.querySelector('.blog-toc');
    const viewQuery = window.matchMedia('(max-width: 760px)');
    let queued = false;

    const syncSidebar = () => {
      queued = false;
      if (viewQuery.matches) {
        articleSidebar.style.removeProperty('--blog-sidebar-sticky-top');
        return;
      }
      const viewport = window.visualViewport?.height || window.innerHeight;
      const sidebarHeight = articleSidebar.getBoundingClientRect().height;
      const topGap = 20;
      const bottomGap = 20;
      const lowestTop = Math.min(topGap, viewport - sidebarHeight - bottomGap);

      // While the main table of contents is being read, it stays at 20px.
      // After a comfortable scroll distance, the full sidebar moves upward
      // with the document until the recommendations' bottom stays in view.
      const layout = articleSidebar.parentElement;
      const naturalTop = layout.getBoundingClientRect().top + window.scrollY;
      const tocHeight = toc?.getBoundingClientRect().height || 0;
      const holdDistance = Math.max(160, Math.min(450, tocHeight * .65));
      const releaseAt = naturalTop - topGap + holdDistance;
      const progress = Math.max(0, window.scrollY - releaseAt);
      const stickyTop = Math.max(lowestTop, topGap - progress);
      articleSidebar.style.setProperty('--blog-sidebar-sticky-top', stickyTop + 'px');
    };

    const requestSync = () => {
      if (!queued) {
        queued = true;
        window.requestAnimationFrame(syncSidebar);
      }
    };
    window.addEventListener('scroll', requestSync, { passive: true });
    window.addEventListener('resize', requestSync, { passive: true });
    window.visualViewport?.addEventListener('resize', requestSync, { passive: true });
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(requestSync);
      observer.observe(articleSidebar);
      observer.observe(articleSidebar.parentElement);
    }
    syncSidebar();
  }

  // Use the platform's own share sheet (iOS, Android and supporting desktop
  // browsers). If no native share target is available, offer a copyable URL.
  const shareNative = document.getElementById('blog-share-native');
  const shareCopy = document.getElementById('blog-share-copy-link');
  const shareStatus = document.getElementById('blog-share-status');
  const shareUrlInput = document.getElementById('blog-share-url');
  if (shareNative && shareCopy && shareStatus && shareUrlInput) {
    const articleUrl = shareUrlInput.value || document.querySelector('link[rel="canonical"]')?.href || location.href.split(/[?#]/)[0];
    const articleTitle = document.querySelector('.blog-post-header h1')?.textContent.trim() || document.title;
    const shareData = { title: articleTitle, url: articleUrl };
    const nativeSupported = typeof navigator.share === 'function'
      && (typeof navigator.canShare !== 'function' || navigator.canShare(shareData));
    shareNative.hidden = !nativeSupported;
    shareNative.addEventListener('click', async () => {
      if (!nativeSupported) return;
      shareStatus.textContent = '';
      try {
        // Must be invoked directly from the user's gesture, before any await.
        await navigator.share(shareData);
      } catch (error) {
        // Closing the native sheet is a normal cancel, not a failed publish.
        if (error?.name !== 'AbortError') {
          shareStatus.textContent = lang === 'fa'
            ? 'پنجره اشتراک‌گذاری باز نشد. می‌توانید لینک را کپی کنید.'
            : 'Sharing is unavailable. You can copy the link instead.';
        }
      }
    });
    shareCopy.addEventListener('click', async () => {
      shareStatus.textContent = '';
      let copied = false;
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(articleUrl);
          copied = true;
        } catch (_) { /* Fall through to the legacy or manual copy. */ }
      }
      if (!copied) {
        shareUrlInput.hidden = false;
        shareUrlInput.focus({ preventScroll: true });
        shareUrlInput.select();
        try { copied = typeof document.execCommand === 'function' && document.execCommand('copy'); }
        catch (_) { /* Keep the selectable URL visible for manual copying. */ }
        if (copied) shareUrlInput.hidden = true;
      }
      shareStatus.textContent = copied
        ? (lang === 'fa' ? 'لینک مقاله کپی شد.' : 'Article link copied.')
        : (lang === 'fa' ? 'لینک را از کادر زیر انتخاب و کپی کنید.' : 'Select and copy the link below.');
    });
  }
  // Fenced code is an accessible, real HTML code block even without JS.
  // JS adds only localized labels and copying via a direct user gesture.
  const codeControls = document.querySelectorAll('.blog-code-view .blog-code-copy');
  if (codeControls.length) {
    const copyLabel = lang === 'fa' ? 'کپی کد' : 'Copy code';
    const copiedLabel = lang === 'fa' ? 'کپی شد' : 'Copied';
    codeControls.forEach(button => {
      const viewer = button.closest('.blog-code-view');
      const pre = viewer?.querySelector('pre');
      const expand = viewer?.querySelector('.blog-code-expand');
      if (expand && pre) {
        const isTall = () => pre.scrollHeight > pre.clientHeight + 12;
        const fullLabel = lang === 'fa' ? 'نمایش تمام کد' : 'Show full code';
        const compactLabel = lang === 'fa' ? 'جمع‌کردن کد' : 'Collapse code';
        // A truncated block remains keyboard-scrollable even without JS.
        expand.hidden = !isTall();
        expand.addEventListener('click', () => {
          const opened = viewer.classList.toggle('expanded');
          expand.setAttribute('aria-expanded', String(opened));
          expand.textContent = opened ? compactLabel : fullLabel;
          expand.setAttribute('aria-label', expand.textContent);
        });
      }
      button.textContent = copyLabel;
      button.title = copyLabel;
      button.setAttribute('aria-label', copyLabel);
      button.addEventListener('click', async () => {
        const code = button.closest('.blog-code-view')?.querySelector('pre code');
        if (!code) return;
        try {
          await navigator.clipboard.writeText(code.textContent);
          button.textContent = copiedLabel;
          button.dataset.copied = 'true';
          button.setAttribute('aria-label', copiedLabel);
          window.setTimeout(() => {
            button.textContent = copyLabel;
            button.setAttribute('aria-label', copyLabel);
            delete button.dataset.copied;
          }, 1800);
        } catch {
          button.textContent = lang === 'fa' ? 'کپی ممکن نیست' : 'Copy unavailable';
          button.setAttribute('aria-label', button.textContent);
        }
      });
    });
  }

  const actions = document.getElementById('blog-floating-actions');
  const toTop = document.getElementById('blog-scroll-top');
  if (actions && toTop) {
    let queued = false;
    const sync = () => {
      queued = false;
      actions.dataset.visible = String(window.scrollY > 260);
    };
    window.addEventListener('scroll', () => {
      if (!queued) {
        queued = true;
        window.requestAnimationFrame(sync);
      }
    }, { passive: true });
    toTop.addEventListener('click', () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
    });
    sync();
  }
  // The initial static article/listing DOM is now enhanced. The shared loader
  // waits for the asynchronous navigation, font layout and visible images.
  window.siteReady?.();
})();
