# SEO 50 stage 29 — Cloudflare cache runbook
Scope: imoein.com and www.imoein.com only; do not change redirects or subdomains.

Observed 2026-11-17: 30 GET responses across 15 URLs, HTML and JSON DYNAMIC with max-age=600, static CSS/JS/image/font returning HIT on repeat with max-age=14400, robots.txt REVALIDATED with max-age=14400, sitemap DYNAMIC, nonexistent HTML 404 DYNAMIC. See stage29-cache.json. These headers are sampled, not a guarantee for every CDN PoP. No dashboard rules were changed.

Recommended settings, pending authenticated dashboard review:
- Keep Standard cache key (all query strings honored). Never Ignore Query String for versioned CSS/JS.
- Keep current static cache policy (4-hour browser TTL observed), honor origin where practical. Do not mark query-versioned mutable filenames immutable or apply one-year TTL.
- Do not enable global Cache Everything. Keep HTML, JSON, sitemap and missing HTML pages uncached at edge.
- If necessary, add exact-host cache bypass rule for robots and sitemap: (http.host in {"imoein.com" "www.imoein.com"} and http.request.uri.path in {"/robots.txt" "/sitemap.xml"}). Cache eligibility: Bypass cache. Use Browser TTL Respect origin if available, not a long override. Bypass affects edge; reference origin TTL may still allow browser caching. Check existing rules/priority first. Do not affect redirects.
- If an existing broad Cache Everything rule conflicts, constrain it to the appropriate static asset paths rather than expanding it.
- Keep compression active and do not stack CDN JS rewriting/optimization (Rocket Loader) on the reviewed script order without functional tests.
- After publishing, purge only changed mutable URLs where needed, including robots/sitemap and old unversioned asset URLs. Do not purge everything or use an API token from unreviewed files.
- Repeat GET requests and verify HTTP status, Cache-Control, CF-Cache-Status, Age, Content-Encoding, ETag/Last-Modified. Versioned assets should reach HIT for warmed cache keys; HTML/JSON should remain DYNAMIC or BYPASS. 404 must remain 404. Repeat the exact versioned URL from deployed HTML, compare against artifact (account for transfer compression). Recheck after deployment and in more than one region.
- Versioning is not an immutable-storage guarantee: old HTML may reference an old query on a mutable file path, and GitHub Pages can retain old responses temporarily. Keep TTL bounded; verify real deployment and release transitions.
- Browser cache no-cache requests revalidate mutable JSON; they do not by themselves purge an upstream cached response.
- Documentation: https://developers.cloudflare.com/cache/how-to/cache-rules/settings/ ; https://developers.cloudflare.com/cache/concepts/default-cache-behavior/ ; https://developers.cloudflare.com/cache/how-to/cache-keys/
