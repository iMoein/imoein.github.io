/* iMoein: independent Cloudflare Web Analytics and opt-in GA4.
 * Cloudflare: anonymous cookieless site metrics; respect legacy opt-outs.
 * GA4: no Google tag or analytics cookies until the visitor explicitly agrees.
 * A compact bilingual consent choice is always revisitable from the footer.
 * GTM is not installed: use only the existing direct GA4 implementation.
 */
(() => {
  'use strict';
  const host = location.hostname.toLowerCase();
  if (location.protocol !== 'https:' || !/^(?:www\.)?imoein\.com$/.test(host)) return;
  if (document.querySelector('meta[name="robots"][content*="noindex"]')) return;
  if (window.__imoeinAnalyticsInitialized) return;
  window.__imoeinAnalyticsInitialized = true;

  const CONSENT_KEY = 'imoein-ga4-consent-v2';
  const LEGACY_KEY = 'imoein-analytics-consent-v1';
  const getStoredConsent = key => {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  };
  let consent = getStoredConsent(CONSENT_KEY);
  if (consent !== 'granted' && consent !== 'denied') {
    consent = getStoredConsent(LEGACY_KEY) === 'declined' ? 'denied' : 'unset';
  }
  let legacyOptOut = getStoredConsent(LEGACY_KEY) === 'declined';

  // Cloudflare Web Analytics: existing, verified site token for imoein.com.
  // Independent of GA4 consent-mode reporting. Does not set cookies or add a
  // visitor-facing prompt. Automatically excluded for local/staging/noindex.
  // If the Cloudflare zone is ever switched to automatic beacon injection,
  // avoid injecting the same script a second time.
  function startCloudflareWebAnalytics() {
    if ([...document.scripts].some(script =>
      script.hasAttribute('data-cf-beacon') ||
      /static\.cloudflareinsights\.com\/beacon\.min\.js/.test(script.src))) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.dataset.cfBeacon = JSON.stringify({token: '0e9545ebc3c345f58a738098695d40bf'});
    document.head.append(script);
  }
  if (!legacyOptOut) startCloudflareWebAnalytics();

  const currentLanguage = () => document.documentElement.lang === 'en' ? 'en' : 'fa';
  const validId = value => /^G-[A-Z0-9]{6,16}$/.test(value || '');
  let measurementId = '';
  let started = false;
  let bootInFlight = null;

  function track(eventName, params = {}) {
    if (!started || consent !== 'granted' || typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params);
  }

  function clearLegacyAnalyticsCookies() {
    // Only remove the site's own legacy GA identifiers after withdrawal.
    const names = document.cookie.split(';').map(raw => raw.trim().split('=')[0])
      .filter(name => /^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name));
    for (const name of names) {
      for (const domain of ['', '; domain=' + location.hostname,
                             '; domain=.imoein.com']) {
        document.cookie = name + '=; Max-Age=0; path=/' + domain + '; SameSite=Lax';
      }
    }
  }

  function startAnalytics() {
    if (started || consent !== 'granted' || !validId(measurementId)) return;
    if ([...document.scripts].some(s => /googletagmanager\.com\/(?:gtm\.js|gtag\/js)/.test(s.src))) {
      console.warn('iMoein: existing Google tag detected; skipping duplicate GA4 initialization.');
      return;
    }
    started = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    // Google consent-mode v2: establish denied defaults synchronously
    // *before* loading the Google tag, then grant only analytics storage on
    // explicit opt-in. All advertising permissions remain denied.
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('set', 'ads_data_redaction', true);
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
    if (consent !== 'granted') return;
    if (started) return;
    if (bootInFlight) return bootInFlight;
    bootInFlight = (async () => {
      try {
        const response = await fetch('/resume/site-data.json', {cache:'no-cache'});
        if (!response.ok) return;
        const data = await response.json();
        const settings = data.analytics;
        if (!settings || settings.enabled !== true || !validId(settings.measurementId)) return;
        measurementId = settings.measurementId;
        if (consent !== 'granted') return;
        startAnalytics();
      } catch (_) {
        // Analytics must never interfere with public content or rendering.
      } finally {
        bootInFlight = null;
      }
    })();
    return bootInFlight;
  }

  const copy = {
    fa: {
      title: 'آمار بازدید با Google Analytics',
      description: 'Cloudflare بازدیدها را بدون کوکی ثبت می‌کند. با موافقت شما، Google Analytics هم آمار کامل‌تری از استفاده سایت جمع‌آوری می‌کند.',
      accept: 'موافقم', reject: 'فعلاً نه', settings: 'تنظیمات حریم خصوصی',
      settingsTitle: 'تنظیمات آمار بازدید',
      settingsDescription: 'Cloudflare برای آمار بدون کوکی فعال است. اندازه‌گیری با Google Analytics اختیاری است و می‌توانی هر زمان نظرت را تغییر بدهی.',
      close: 'بستن', granted: 'Google Analytics فعال است', denied: 'Google Analytics غیرفعال است',
      save: 'تغییر تصمیم', label: 'انتخاب استفاده از Google Analytics'
    },
    en: {
      title: 'Google Analytics measurement',
      description: 'Cloudflare measures visits without cookies. With your permission, Google Analytics can collect more complete site usage statistics.',
      accept: 'Allow analytics', reject: 'Not now', settings: 'Privacy settings',
      settingsTitle: 'Analytics privacy settings',
      settingsDescription: 'Cloudflare provides cookieless metrics. Google Analytics is optional and you can change your choice at any time.',
      close: 'Close', granted: 'Google Analytics is on', denied: 'Google Analytics is off',
      save: 'Change choice', label: 'Choose whether to allow Google Analytics'
    }
  };
  let notice = null;
  let settingsButton = null;
  let settingsOpen = false;

  function renderPrivacyUI() {
    const words = copy[currentLanguage()];
    if (settingsButton) settingsButton.textContent = words.settings;
    if (!notice) return;
    const heading = notice.querySelector('[data-privacy-title]');
    const description = notice.querySelector('[data-privacy-description]');
    const state = notice.querySelector('[data-privacy-state]');
    heading.textContent = settingsOpen ? words.settingsTitle : words.title;
    description.textContent = settingsOpen ? words.settingsDescription : words.description;
    state.textContent = settingsOpen && consent !== 'unset'
      ? (consent === 'granted' ? words.granted : words.denied) : '';
    notice.querySelector('[data-privacy-accept]').textContent = words.accept;
    notice.querySelector('[data-privacy-reject]').textContent = words.reject;
    notice.querySelector('[data-privacy-close]').textContent = words.close;
    notice.setAttribute('aria-label', words.label);
    notice.querySelector('[data-privacy-close]').hidden = !settingsOpen;
  }

  function showPrivacyChoice(revisit = false) {
    if (!notice) return;
    settingsOpen = revisit;
    renderPrivacyUI();
    notice.hidden = false;
  }

  function saveConsent(choice) {
    const wasStarted = started;
    consent = choice;
    try {
      localStorage.setItem(CONSENT_KEY, choice);
      // An old opt-out from all analytics remains in effect if the user
      // still declines. Only explicit acceptance lifts that prior opt-out.
      if (choice === 'granted') localStorage.removeItem(LEGACY_KEY);
    } catch (_) {
      // Browsers with disabled storage can still opt in for this page.
    }
    const hadLegacyOptOut = legacyOptOut;
    legacyOptOut = hadLegacyOptOut && choice !== 'granted';
    if (hadLegacyOptOut && !legacyOptOut) startCloudflareWebAnalytics();
    notice.hidden = true;
    settingsOpen = false;
    if (choice === 'granted') {
      if (wasStarted && typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          analytics_storage: 'granted', ad_storage: 'denied',
          ad_user_data: 'denied', ad_personalization: 'denied'
        });
      } else boot();
    } else {
      if (wasStarted && typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          analytics_storage: 'denied', ad_storage: 'denied',
          ad_user_data: 'denied', ad_personalization: 'denied'
        });
        clearLegacyAnalyticsCookies();
        // Remove the loaded Google tag for the remainder of this visit, too.
        // A page reload prevents any background GA requests after withdrawal.
        location.reload();
      } else clearLegacyAnalyticsCookies();
    }
  }

  function mountPrivacyUI() {
    const footerNav = document.querySelector('.site-unified-footer .site-footer-nav');
    if (!footerNav || document.getElementById('imoein-privacy-settings')) return;
    settingsButton = document.createElement('button');
    settingsButton.type = 'button';
    settingsButton.id = 'imoein-privacy-settings';
    settingsButton.className = 'site-privacy-settings';
    settingsButton.addEventListener('click', () => showPrivacyChoice(true));
    footerNav.append(settingsButton);

    notice = document.createElement('aside');
    notice.id = 'imoein-privacy-choice';
    notice.className = 'site-privacy-choice';
    notice.setAttribute('role', 'region');
    notice.setAttribute('aria-live', 'polite');
    notice.hidden = true;
    const title = document.createElement('strong');
    title.dataset.privacyTitle = '';
    const description = document.createElement('p');
    description.dataset.privacyDescription = '';
    const state = document.createElement('p');
    state.dataset.privacyState = '';
    state.className = 'site-privacy-state';
    const actions = document.createElement('div');
    actions.className = 'site-privacy-actions';
    const accept = document.createElement('button');
    accept.type = 'button';
    accept.dataset.privacyAccept = '';
    accept.className = 'site-privacy-accept';
    accept.addEventListener('click', () => saveConsent('granted'));
    const reject = document.createElement('button');
    reject.type = 'button';
    reject.dataset.privacyReject = '';
    reject.className = 'site-privacy-reject';
    reject.addEventListener('click', () => saveConsent('denied'));
    const close = document.createElement('button');
    close.type = 'button';
    close.dataset.privacyClose = '';
    close.className = 'site-privacy-close';
    close.addEventListener('click', () => { notice.hidden = true; });
    actions.append(accept, reject, close);
    notice.append(title, description, state, actions);
    document.body.append(notice);
    renderPrivacyUI();
    if (consent === 'unset') showPrivacyChoice(false);
    new MutationObserver(renderPrivacyUI).observe(document.documentElement,
      {attributes: true, attributeFilter: ['lang']});
  }

  function init() {
    document.addEventListener('click', onClick, {capture: true});
    // Footer layout is already present in the HTML on public pages.
    mountPrivacyUI();
    if (consent === 'granted') boot();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
