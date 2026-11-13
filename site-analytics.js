/* iMoein: single GA4 integration with explicit, reversible analytics consent.
 * No analytics library, cookie, or event is sent from local/staging previews.
 * GTM is NOT installed here; configure either GA4 direct OR GTM, never both.
 */
(() => {
  'use strict';
  const host = location.hostname.toLowerCase();
  if (location.protocol !== 'https:' || !/^(?:www\.)?imoein\.com$/.test(host)) return;
  if (document.querySelector('meta[name="robots"][content*="noindex"]')) return;
  if (window.__imoeinAnalyticsInitialized) return;
  window.__imoeinAnalyticsInitialized = true;

  const KEY = 'imoein-analytics-consent-v1';
  const COPY = {
    fa: {
      title: 'حریم خصوصی و آمار بازدید',
      message: 'با اجازه شما، بازدید صفحات و تعامل‌های کلی سایت را با Google Analytics اندازه‌گیری می‌کنیم. بدون تأیید شما هیچ کد ردیابی گوگل بارگذاری نمی‌شود.',
      accept: 'موافقت می‌کنم', reject: 'فعلاً نه', preferences: 'تنظیمات حریم خصوصی',
      dialog: 'تنظیمات رضایت برای آنالیتیکس'
    },
    en: {
      title: 'Privacy and analytics',
      message: 'With your permission, we use Google Analytics to measure page visits and general site interactions. No Google tracking code loads unless you agree.',
      accept: 'Accept analytics', reject: 'No thanks', preferences: 'Privacy settings',
      dialog: 'Analytics consent preferences'
    }
  };
  const currentLanguage = () => document.documentElement.lang === 'en' ? 'en' : 'fa';
  const validId = value => /^G-[A-Z0-9]{6,16}$/.test(value || '');
  const readChoice = () => {
    try { return localStorage.getItem(KEY); } catch (_) { return null; }
  };
  const saveChoice = value => {
    try { localStorage.setItem(KEY, value); } catch (_) { /* session-only choice */ }
  };
  let measurementId = '';
  let started = false;
  let consent = readChoice();
  let banner = null;
  let preferences = null;
  let modalOpen = false;

  function track(eventName, params = {}) {
    if (!started || consent !== 'accepted' || typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params);
  }

  function startAnalytics() {
    if (started || !validId(measurementId) || consent !== 'accepted') return;
    if ([...document.scripts].some(s => /googletagmanager\.com\/(?:gtm\.js|gtag\/js)/.test(s.src))) {
      console.warn('iMoein: existing Google tag detected; skipping duplicate GA4 initialization.');
      return;
    }
    started = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    script.dataset.imoeinAnalytics = 'ga4';
    document.head.append(script);
    if (document.querySelector('meta[property="article:published_time"]')) {
      track('article_view', {
        content_language: currentLanguage(),
        page_path: location.pathname
      });
    }
  }

  function ensureBanner() {
    if (banner) return banner;
    banner = document.createElement('section');
    banner.id = 'site-analytics-consent';
    banner.className = 'site-analytics-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    const heading = document.createElement('strong');
    heading.id = 'site-analytics-title';
    const message = document.createElement('p');
    const actions = document.createElement('div');
    actions.className = 'site-analytics-consent-actions';
    const reject = document.createElement('button');
    reject.type = 'button';
    reject.className = 'site-analytics-reject';
    const accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'site-analytics-accept';
    actions.append(reject, accept);
    banner.append(heading, message, actions);
    banner._copyNodes = { heading, message, reject, accept };
    reject.addEventListener('click', () => choose('declined'));
    accept.addEventListener('click', () => choose('accepted'));
    document.body.append(banner);
    translate();
    return banner;
  }

  function translate() {
    const words = COPY[currentLanguage()];
    if (preferences) preferences.textContent = words.preferences;
    if (!banner) return;
    const nodes = banner._copyNodes;
    nodes.heading.textContent = words.title;
    nodes.message.textContent = words.message;
    nodes.reject.textContent = words.reject;
    nodes.accept.textContent = words.accept;
    banner.setAttribute('aria-label', words.dialog);
    banner.dir = currentLanguage() === 'fa' ? 'rtl' : 'ltr';
  }

  function showBanner() {
    modalOpen = true;
    ensureBanner().hidden = false;
    translate();
  }

  function clearAnalyticsCookies() {
    // Best-effort removal of Google Analytics first-party identifiers when
    // consent is withdrawn. We never touch non-analytics application cookies.
    const names = document.cookie.split(';').map(raw => raw.trim().split('=')[0])
      .filter(name => /^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name));
    for (const name of names) {
      for (const domain of ['', '; domain=' + location.hostname,
                             '; domain=.imoein.com']) {
        document.cookie = name + '=; Max-Age=0; path=/' + domain + '; SameSite=Lax';
      }
    }
  }

  function choose(next) {
    if (next !== 'accepted' && next !== 'declined') return;
    const wasActive = started;
    consent = next;
    saveChoice(next);
    modalOpen = false;
    if (banner) banner.hidden = true;
    if (next === 'accepted') startAnalytics();
    else if (wasActive) {
      clearAnalyticsCookies();
      // Basic consent mode: stop loading the tag entirely after withdrawal.
      // Reload immediately so no background Google script remains active.
      location.reload();
    }
  }

  function installPreferences() {
    const footerNav = document.querySelector('footer.site-unified-footer .site-footer-nav');
    if (!footerNav || footerNav.querySelector('#site-analytics-preferences')) return;
    preferences = document.createElement('button');
    preferences.id = 'site-analytics-preferences';
    preferences.className = 'site-analytics-preferences';
    preferences.type = 'button';
    preferences.addEventListener('click', () => { showBanner(); });
    footerNav.append(preferences);
    translate();
  }

  function onClick(event) {
    const target = event.target && event.target.closest?.('a[href]');
    if (!target) return;
    const href = target.getAttribute('href') || '';
    let url;
    try { url = new URL(href, location.href); } catch (_) { return; }
    let contactType = '';
    if (url.protocol === 'mailto:') contactType = 'email';
    else if (url.protocol === 'tel:') contactType = 'phone';
    else if (/^(?:www\.)?wa\.me$/.test(url.hostname)) contactType = 'whatsapp';
    else if (url.hostname === 't.me') contactType =
      target.id === 'contact-telegram-channel' ? 'telegram_channel' : 'telegram_chat';

    if (contactType) {
      track('contact_click', { contact_type: contactType, content_language: currentLanguage() });
    } else if (/\.(?:pdf|docx?)(?:\?|$)/i.test(url.pathname + url.search)
               && /resume|cv|رزومه/i.test(url.pathname + target.textContent)) {
      track('resume_download', { content_language: currentLanguage() });
    } else if (target.closest('.landing-project-card, .portfolio-project, .project-card')) {
      track('project_click', { content_language: currentLanguage() });
    }
  }

  async function boot() {
    try {
      const response = await fetch('/resume/site-data.json', {cache:'no-cache'});
      if (!response.ok) return;
      const data = await response.json();
      const settings = data.analytics;
      if (!settings || settings.enabled !== true || !validId(settings.measurementId)) return;
      measurementId = settings.measurementId;
      installPreferences();
      if (consent === 'accepted') startAnalytics();
      else if (consent !== 'declined') showBanner();
      document.addEventListener('click', onClick, {capture:true});
      new MutationObserver(() => { translate(); }).observe(document.documentElement,
        {attributes:true, attributeFilter:['lang']});
    } catch (_) {
      // Analytics must never interfere with public content or page rendering.
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
