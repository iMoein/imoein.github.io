# imoein.github.io
iMoein github page


## Search architecture

Public original pages: `/`, `/about.html`, `/portfolio.html`,
`/resume/moein-ghezelbash-fa.html`, and `/product-management.html`.
The homepage and professional profile describe Moein Ghezelbash (معین قزلباش)
and connect readers to the original management and technical product work.

Independently crawlable English pages: `/en/`, `/en/about.html`,
`/en/portfolio.html`, plus `/resume/moein-ghezelbash-en.html`.
Each primary language pair has a self-canonical and reciprocal hreflang.
Do not edit the rendered English files as their source of truth: run the
Content Studio script `scripts/render-static-english.py` from the sibling
Studio repository whenever the shared bilingual data or pages change.

Blog: `/blog/fa/` and `/blog/en/`. Archives for tags with only one published
article stay linked for people but are `noindex,follow` and are not submitted
through `blog/sitemap.xml`. They are generated from private content using
Studio; never place Markdown sources, notes or draft articles in this repo.

The initial search targets are branded full-name queries (FA/EN),
"مدیر ارشد محصول فنی" and "مدیر محصول". Useful expert content and relevant
internal links are intended to support discovery, not guarantee search rank.
Monitor verified results in Google Search Console after deployment.


## Responsive navigation and product-management guide

English prerendered pages include HTML navigation for fast first paint.
The shared site-navigation.js replaces rather than appends to this
prerendered header at runtime. Never reuse a prerendered locale switcher,
or duplicate navigation controls can appear.

The original product-management article is available at
/product-management.html (fa) and /en/product-management.html (en).
Both are complete standalone documents with reciprocal hreflang,
self-canonical, localized links and the shared site footer. The guide
uses product-management.css with both site-theme palettes.

The homepage product card is directly before the contact/conversation
section. It has distinct light and dark styling. Keep the Persian and
English home copy in home.js and the rendered initial HTML consistent.
