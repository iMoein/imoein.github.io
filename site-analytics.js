/* iMoein: cookie-free GA4 consent mode, with no visitor-facing banner.
 * Google receives cookieless measurement pings with analytics_storage denied.
 * No Google requests are sent from local/staging or for prior opt-outs.
 * GTM is NOT installed here; configure either GA4 direct OR GTM, never both.
 */
(() => {
  'use strict';
  const host = location.hostname.toLowerCase();
  if (location.protocol !== 'https:' || !/^(?:www\.)?imoein\.com$/.test(host)) return;
  if (document.querySelector('meta[name="robots"][content*="noindex"]')) return;
  if (window.__imoeinAnalyticsInitialized) return;
  window.__imoeinAnalyticsInitialized = true;

  // Respect visitors who explicitly declined analytics before the banner was removed.
  const previouslyDeclined = (() => {
    try { return localStorage.getItem('imoein-analytics-consent-v1') === 'declined'; }
    catch (_) { return false; }
  })();
  if (previouslyDeclined) return;

  const currentLanguage = () => document.documentElement.lang === 'en' ? 'en' : 'fa';
  const validId = value => /^G-[A-Z0-9]{6,16}$/.test(value || '');
  let measurementId = '';
  let started = false;

  function track(eventName, params = {}) {
    if (!started || typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params);
  }

  function clearLegacyAnalyticsCookies() {
    // Older versions used GA4 cookies after explicit acceptance. Clear only
    // those identifiers now that this site uses a cookieless GA4 configuration.
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
    if (started || !validId(measurementId)) return;
    if ([...document.scripts].some(s => /googletagmanager\.com\/(?:gtm\.js|gtag\/js)/.test(s.src))) {
      console.warn('iMoein: existing Google tag detected; skipping duplicate GA4 initialization.');
      return;
    }
    clearLegacyAnalyticsCookies();
    started = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    // Keep analytics and advertising storage denied on every visit. This
    // allows Google consent-mode cookieless pings, not cookie-based tracking.
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
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
    try {
      const response = await fetch('/resume/site-data.json', {cache:'no-cache'});
      if (!response.ok) return;
      const data = await response.json();
      const settings = data.analytics;
      if (!settings || settings.enabled !== true || !validId(settings.measurementId)) return;
      measurementId = settings.measurementId;
      startAnalytics();
      document.addEventListener('click', onClick, {capture:true});
    } catch (_) {
      // Analytics must never interfere with public content or page rendering.
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
