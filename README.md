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


### Editorial product-management guide (FA/EN)

The product-management landing pages serve two intentions: a useful
explanation of Product Manager / Technical Product Manager roles and an
evidence-based introduction to Moein's own product work. Both language
versions have original content, relevant public articles and case studies,
explicit authorship and no fabricated metrics.

The source of truth for BOTH HTML versions is the companion Studio script
../imoein-blog-studio/scripts/build-product-guide.py.
Run the script after editing either translation and commit the regenerated
product-management.html and en/product-management.html together.
The Studio site-release preparation also regenerates the pair before staging.
Styling lives in product-management.css with light and dark schemes.
Footer and navigation remain site-global.


### Product guide UI parity

Both product guide URLs contain a static localized header for the first paint.
The site navigation script replaces that header with interactive controls after
loading; it should not be allowed to leave the first render blank.
The Latin overline is direction-isolated within its local heading alignment,
timeline outcomes use logical inline padding for RTL/LTR parity, project
insights stretch across the card, KPI rows fill the measure panel, and FAQs
take the full content width. Test light and dark mode at 390, 820, 980 and
1440px before further visual edits.


### Theme switch cold load (November 2026)

The shared site-theme.js controls effective appearance and persists the
chosen mode (auto/light/dark). On prerendered headers it now synchronizes
the initially displayed day/night and Auto controls with the saved mode.
The prerendered buttons also work before site-navigation.js hydrates the
header; once hydrated, an ephemeral property prevents double toggles.
Back/forward-cache restores re-read the saved preference.
Versioned theme/navigation script tags on core pages and resumes prevent
previous browser caches from obscuring these changes.

The two side-by-side secondary product cases share the same four CSS
subgrid rows from 701px upward, keeping Core challenge and Product question
aligned even when titles or paragraphs wrap differently. At mobile sizes
each case retains a standalone flexible layout.
