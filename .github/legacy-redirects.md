# Legacy homepage redirect (SEO 03)

## Reviewed mapping

- Source: `/home`, `/home/`, `/home/index.html` (static fallback alias).
- Target: `https://imoein.com/`.
- Intended production status: HTTP 301, one hop.
- Preserve query string: no. Old queries are not used by the destination.
- Do not redirect any other route. Removed Telegram articles, WordPress tags,
  comments, attachments, feeds and other missing paths remain HTTP 404.
- This mapping is a reviewed assumption based on the legacy homepage path.
  Reconfirm if there is evidence that /home formerly contained different content.

## Cloudflare (not yet applied)

Create a Single Redirect under the imoein.com zone. Choose Custom filter
expression, then paste:

```text
(http.host in {"imoein.com" "www.imoein.com"} and http.request.uri.path in {"/home" "/home/" "/home/index.html"})
```

Static destination: `https://imoein.com/`; status: 301; preserve query
string: off. Review existing rules and ensure this rule is not shadowed
by a broader redirect. Apply only when production changes are approved.
GitHub Pages serves the static HTML fallback with HTTP 200 (instant meta
refresh, not an HTTP 301); Cloudflare is required for the actual edge 301.

## Post-release verification

```sh
curl -sS -D - -o /dev/null https://imoein.com/home/
curl -sS -L -o /dev/null -w '%{http_code} %{num_redirects} %{url_effective}\n' https://imoein.com/home/
curl -sS -o /dev/null -w '%{http_code}\n' https://imoein.com/articles/deactivate-telegram-account/
```

Expect 301 with Location https://imoein.com/, then HTTP 200 in one hop.
The removed article must return 404. Also test /home and /home/index.html.
Do not submit old paths in the sitemap; request indexing only for relevant
canonical destinations.

## SEO 10 — canonical host and HTTPS (not yet applied)

Observed on 2026-11-17: HTTP www first redirects to HTTPS www, then to
HTTPS apex. The HTTPS apex itself responds directly. Preserve path and
query for normal content, and never redirect arbitrary 404s to the homepage.

Proposed ordered Single Redirects rules (review existing rule ownership first):
1. Exact legacy homepage rule above, covering both hosts.
2. Canonical host/protocol normalization with custom expression:

```text
(http.host in {"imoein.com" "www.imoein.com"} and (http.host eq "www.imoein.com" or not ssl))
```

Dynamic destination: `concat("https://imoein.com", http.request.uri.path)`.
Status 301; preserve query string ON. Do not include other subdomains.
Put the exact homepage rule before the general rule. Verify with the Rules
simulator and real requests; zone-level Always Use HTTPS, existing Page Rules,
or other redirect mechanisms may intercept HTTP first. Do not disable a
zone-wide setting unless equivalent HTTPS protection for every affected host
has been verified; leave it in place if unsafe to change. Canonical
slash-terminated content links need no HTTP redirects.

Official references:
- https://developers.cloudflare.com/rules/url-forwarding/
- https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/

After production approval, use:
`python3 .github/scripts/check-live-redirects.py`
Expected: canonical pages have zero hops, HTTP/www variants and exact legacy
home paths at most one hop, unrelated deleted paths remain 404. This is an
explicit post-release test, not a pre-deploy CI network dependency.
