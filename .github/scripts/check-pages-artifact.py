#!/usr/bin/env python3
"""Verify a GitHub Pages artifact covers every public sitemap URL.

This check executes after the conservative public-only copy stage and before
upload-pages-artifact. A deployment is rejected if an advertised URL 404s
because it was omitted from the allowlist.
"""
from __future__ import annotations

import sys
import json
import re
import unicodedata
from datetime import date, datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, unquote, urljoin, urlsplit
from xml.etree import ElementTree as ET

HOST = "imoein.com"
SITEMAPS = ("sitemap.xml", "blog/sitemap.xml")
REQUIRED = (
    "index.html",
    "home/index.html",
    "en/index.html",
    "en/about.html",
    "en/portfolio.html",
    "product-management.html",
    "en/product-management.html",
    "product-management.css",
)
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9",
      "x": "http://www.w3.org/1999/xhtml"}


def local_path(site: Path, url: str) -> Path:
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.netloc != HOST:
        raise ValueError(f"Unexpected sitemap origin: {url}")
    if parsed.query or parsed.fragment:
        raise ValueError(f"Noncanonical sitemap URL: {url}")
    resource = unquote(parsed.path).lstrip("/")
    if parsed.path.endswith("/") or not resource:
        resource += "index.html"
    target = (site / resource).resolve()
    if not target.is_relative_to(site.resolve()):
        raise ValueError(f"Unsafe sitemap path: {url}")
    return target



class AssetAndLinkParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.images = []
        self.resume_links = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "img":
            self.images.append(attributes)
        if tag == "a" and "resume/" in attributes.get("href", ""):
            self.resume_links.append(attributes["href"])


def validate_english_about_assets(site: Path) -> None:
    # A successful Pages deploy must not contain broken images or relative
    # resume links on a nested English page (a prior production incident).
    data = json.loads((site / "resume/site-data.json").read_text(encoding="utf-8"))
    for link in list(data["resumeFiles"].values()) + list(data["resumeDownloads"].values()):
        if not link.startswith("/resume/"):
            raise ValueError("Resume URL is not root-relative: " + link)
        if not (site / unquote(urlsplit(link).path.lstrip("/"))).is_file():
            raise ValueError("Resume destination is missing in Pages artifact: " + link)
    for entry in data["socialLinks"]:
        if entry.get("enabled") is not False:
            if not entry.get("iconSrc", "").startswith("/assets/"):
                raise ValueError("Relative social icon in site-data.json")
    if not data["profileImage"].startswith("/assets/"):
        raise ValueError("Relative profile image in site-data.json")

    page = site / "en/about.html"
    english_html = page.read_text(encoding="utf-8")
    persian_html = (site / "about.html").read_text(encoding="utf-8")
    if not all('/app.js?v=' in html for html in (english_html, persian_html)):
        raise ValueError("Unversioned About JS can serve stale cached assets")
    js = (site / "app.js").read_text(encoding="utf-8")
    if not re.search(r"""fetch\s*\(\s*['"]/resume/site-data\.json\?v=""", js):
        raise ValueError("Unversioned About JSON can be stale across releases")
    parser = AssetAndLinkParser()
    parser.feed(page.read_text(encoding="utf-8"))
    photo = [img for img in parser.images if img.get("id") == "profile-photo"]
    if len(photo) != 1 or photo[0].get("hidden") is not None:
        raise ValueError("English about portrait is missing or hidden")
    logos = 0
    icons = 0
    for img in parser.images:
        source = img.get("src", "")
        if not source:
            raise ValueError("English about page includes an image with no src")
        if source.startswith("https://") or source.startswith("data:"):
            continue
        if not source.startswith("/"):
            raise ValueError("English about page includes a relative image src: " + source)
        f = (site / unquote(urlsplit(source).path.lstrip("/"))).resolve()
        if not f.is_relative_to(site.resolve()) or not f.is_file():
            raise ValueError("Image is not in Pages artifact: " + source)
        if source.startswith("/assets/logo/"):
            logos += 1
        if source.startswith("/assets/social/"):
            icons += 1
    if logos < 10 or icons != 9:
        raise ValueError(f"Prerendered EN About images incomplete: logos={logos}, icons={icons}")
    if len(parser.resume_links) < 4:
        raise ValueError("Missing English about resume links")
    for href in parser.resume_links:
        if not href.startswith("/resume/"):
            raise ValueError("English about page has a broken relative resume URL: " + href)
        if not (site / unquote(urlsplit(href).path.lstrip("/"))).is_file():
            raise ValueError("English about resume file missing in artifact: " + href)



def validate_home_time_preview(site: Path) -> None:
    """Avoid deploying the generic logo in place of TIME's actual screenshot."""
    image = site / "assets/time-preview.webp"
    if not image.is_file() or image.stat().st_size < 1000:
        raise ValueError("TIME screenshot is not in the Pages artifact")
    data = json.loads((site / "resume/site-data.json").read_text(encoding="utf-8"))
    for lang in ("fa", "en"):
        entries = [p for p in data["locales"][lang]["independentProjects"]
                   if p.get("title") == "TIME"]
        if len(entries) != 1 or entries[0].get("previewImage") != "/assets/time-preview.webp":
            raise ValueError("TIME public preview URL is missing or inconsistent in site data")

    for filename in ("index.html", "en/index.html"):
        html = (site / filename).read_text(encoding="utf-8")
        if "/home.js?v=seo-lazy-20261117-r1" not in html:
            raise ValueError("Homepage TIME image fix may be masked by cached home.js")
    script = (site / "home.js").read_text(encoding="utf-8")
    if not re.search(r"""fetch\s*\(\s*(['"])/resume/site-data\.json\?v=time-preview-20261115-r1\1""", script):
        raise ValueError("Homepage data URL may return a stale TIME preview path")
    page = AssetAndLinkParser()
    page.feed((site / "en/index.html").read_text(encoding="utf-8"))
    screenshots = [img for img in page.images
                   if "landing-time-screenshot" in img.get("class", "").split()]
    if len(screenshots) != 1 or urlsplit(screenshots[0].get("src", "")).path != "/assets/time-preview.webp":
        raise ValueError("English homepage is publishing a fallback instead of TIME's screenshot")


class SitemapHeadParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals = []
        self.alternates = {}
        self.language = None
        self.alternates_outside_head = []
        self.robots = []
        self.refresh = False
        self.refresh_targets = []
        self.og_urls = []
        self.in_head = False
        self.canonicals_outside_head = []
        self.descriptions = []
        self.descriptions_outside_head = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.language = (a.get("lang") or "").lower()
        if tag == "head":
            self.in_head = True
        if tag == "link":
            rel = (a.get("rel") or "").lower().split()
            if "canonical" in rel:
                self.canonicals.append(a.get("href"))
                if not self.in_head:
                    self.canonicals_outside_head.append(a.get("href"))
            if "alternate" in rel and a.get("hreflang"):
                lang = a["hreflang"].lower()
                if lang in self.alternates:
                    raise ValueError("Duplicate HTML hreflang: " + lang)
                self.alternates[lang] = a.get("href")
                if not self.in_head:
                    self.alternates_outside_head.append(lang)
        if tag == "meta":
            if (a.get("name") or "").lower() == "description":
                self.descriptions.append(a.get("content") or "")
                if not self.in_head:
                    self.descriptions_outside_head.append(a.get("content") or "")
            if (a.get("name") or "").lower() in ("robots", "googlebot"):
                self.robots.extend((a.get("content") or "").lower().replace(",", " ").split())
            if (a.get("http-equiv") or "").lower() == "refresh":
                self.refresh = True
                self.refresh_targets.append(a.get("content") or "")
            if (a.get("property") or "").lower() == "og:url":
                self.og_urls.append(a.get("content"))

    def handle_endtag(self, tag):
        if tag == "head":
            self.in_head = False


def validate_canonical_contract(site: Path) -> None:
    """Check every public HTML file, including archives excluded from sitemaps."""
    documents = {}
    exceptions = 0
    for file in sorted(site.rglob("*.html")):
        relative = file.relative_to(site).as_posix()
        if any(part.startswith(".") for part in file.relative_to(site).parts):
            continue
        raw = file.read_text(encoding="utf-8")
        if re.fullmatch(r"google[0-9a-f]+\.html", relative) and raw.strip() == "google-site-verification: " + relative:
            exceptions += 1
            continue
        page = SitemapHeadParser()
        page.feed(raw)
        if page.canonicals_outside_head:
            raise ValueError("Canonical outside HTML head: " + relative)
        if relative in {"404.html", "blog/index.html"}:
            if page.canonicals or "noindex" not in page.robots:
                raise ValueError("Expected noindex without canonical: " + relative)
            if relative == "404.html" and page.refresh:
                raise ValueError("404 must not redirect: " + relative)
            exceptions += 1
            continue
        route = "/" + relative
        if route.endswith("/index.html"):
            route = route[:-len("index.html")]
        expected = f"https://{HOST}" + quote(route, safe="/")
        if len(page.canonicals) != 1 or not page.canonicals[0]:
            raise ValueError("Expected exactly one canonical: " + relative)
        canonical = page.canonicals[0]
        target = local_path(site, canonical)
        if not target.is_file():
            raise ValueError("Canonical target missing: " + relative + " -> " + canonical)
        if page.og_urls and page.og_urls != [canonical]:
            raise ValueError("Open Graph URL differs from canonical: " + relative)
        if page.refresh:
            if len(page.refresh_targets) != 1:
                raise ValueError("Ambiguous meta refresh: " + relative)
            match = re.fullmatch(r"0\s*;\s*url\s*=\s*(.+)", page.refresh_targets[0], re.I)
            if not match or urljoin(expected, match.group(1).strip()) != canonical:
                raise ValueError("Redirect target differs from canonical: " + relative)
            if canonical == expected:
                raise ValueError("Self redirect: " + relative)
        elif canonical != expected:
            raise ValueError("Non-self canonical on public content: " + relative)
        documents[expected] = page

    redirects = 0
    for expected, page in documents.items():
        if page.refresh:
            redirects += 1
            canonical = page.canonicals[0]
            target = documents.get(canonical)
            if target is None or target.refresh or target.canonicals != [canonical]:
                raise ValueError("Redirect does not resolve directly to canonical content: " + expected)
    print(f"Canonical contract validated: {len(documents) - redirects} self-canonical pages, "
          f"{redirects} direct legacy redirects, {exceptions} special files.")


def validate_sitemap_contract(site: Path) -> None:
    """Reject URLs that contradict the published indexability metadata."""
    rows = {}
    for filename in SITEMAPS:
        root = ET.parse(site / filename).getroot()
        if root.tag != f"{{{NS['s']}}}urlset":
            raise ValueError(f"Invalid sitemap root: {filename}")
        for item in root.findall("s:url", NS):
            urls = item.findall("s:loc", NS)
            if len(urls) != 1 or not urls[0].text:
                raise ValueError(f"Expected exactly one loc: {filename}")
            loc = urls[0].text
            if loc in rows:
                raise ValueError("Duplicate sitemap URL: " + loc)
            lastmods = item.findall("s:lastmod", NS)
            if len(lastmods) > 1:
                raise ValueError("Duplicate lastmod: " + loc)
            if lastmods:
                value = lastmods[0].text or ""
                try:
                    if len(value) == 10:
                        date.fromisoformat(value)
                    else:
                        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
                        if parsed.tzinfo is None:
                            raise ValueError("Missing timezone")
                except ValueError:
                    raise ValueError("Invalid lastmod: " + loc) from None
            alternatives = {}
            for item_alt in item.findall("x:link", NS):
                lang = (item_alt.get("hreflang") or "").lower()
                href = item_alt.get("href")
                if item_alt.get("rel") != "alternate" or not lang or not href or lang in alternatives:
                    raise ValueError("Invalid or duplicate sitemap hreflang: " + loc)
                alternatives[lang] = href
            page = SitemapHeadParser()
            page.feed(local_path(site, loc).read_text(encoding="utf-8"))
            if page.canonicals != [loc]:
                raise ValueError("Sitemap canonical mismatch: " + loc)
            if {"noindex", "none"}.intersection(page.robots) or page.refresh:
                raise ValueError("Non-indexable or redirect URL in sitemap: " + loc)
            if alternatives != page.alternates:
                raise ValueError("Sitemap/HTML hreflang mismatch: " + loc)
            if alternatives and loc not in alternatives.values():
                raise ValueError("Missing hreflang self-reference: " + loc)
            rows[loc] = alternatives
    for loc, alternatives in rows.items():
        for href in alternatives.values():
            if href not in rows or rows[href] != alternatives:
                raise ValueError("Missing reciprocal sitemap hreflang: " + loc + " -> " + href)
    print(f"Sitemap contract validated: {len(rows)} canonical, indexable URLs with consistent reciprocal hreflang.")


def validate_hreflang_contract(site: Path) -> None:
    """Check language identity and reciprocal alternates of public HTML."""
    pages = {}
    sitemap_urls = {
        loc.text for name in SITEMAPS
        for loc in ET.parse(site / name).getroot().findall("s:url/s:loc", NS)
    }
    for file in sorted(site.rglob("*.html")):
        relative = file.relative_to(site).as_posix()
        if any(part.startswith(".") for part in file.relative_to(site).parts):
            continue
        page = SitemapHeadParser()
        page.feed(file.read_text(encoding="utf-8"))
        route = "/" + relative
        if route.endswith("/index.html"):
            route = route[:-len("index.html")]
        route = f"https://{HOST}" + quote(route, safe="/")
        pages[route] = page
        if page.alternates_outside_head:
            raise ValueError("Hreflang outside HTML head: " + relative)
    primary = (
        ("/", "/en/"),
        ("/about.html", "/en/about.html"),
        ("/portfolio.html", "/en/portfolio.html"),
        ("/product-management.html", "/en/product-management.html"),
        ("/resume/moein-ghezelbash-fa.html", "/resume/moein-ghezelbash-en.html"),
    )
    for fa_path, en_path in primary:
        fa, en = f"https://{HOST}" + fa_path, f"https://{HOST}" + en_path
        for url in (fa, en):
            if url not in pages or pages[url].alternates.get("fa") != fa or pages[url].alternates.get("en") != en:
                raise ValueError("Missing primary bilingual pair: " + url)
    count, links = 0, 0
    for url, page in pages.items():
        alt = page.alternates
        if not alt:
            continue
        count += 1
        links += len(alt)
        if set(alt) - {"fa", "en", "x-default"} or not {"fa", "en"} <= set(alt):
            raise ValueError("Invalid bilingual hreflang set: " + url)
        if alt["fa"] == alt["en"] or page.language not in ("fa", "en") or alt.get(page.language) != url:
            raise ValueError("Hreflang self-reference or language mismatch: " + url)
        for lang, target_url in alt.items():
            target = pages.get(target_url)
            if target is None or target_url not in sitemap_urls:
                raise ValueError("Hreflang target missing or not public: " + str(target_url))
            if target.canonicals != [target_url] or target.refresh or {"noindex", "none"}.intersection(target.robots):
                raise ValueError("Hreflang target is not indexable canonical content: " + target_url)
            if lang != "x-default" and target.language != lang:
                raise ValueError("Hreflang target language mismatch: " + target_url)
            if target.alternates != alt:
                raise ValueError("Nonreciprocal HTML hreflang: " + url + " -> " + target_url)
    print(f"Hreflang contract validated: {count} bilingual pages, {links} reciprocal references.")


def validate_noindex_contract(site: Path) -> None:
    """Ensure only intentionally excluded public HTML pages use noindex."""
    sitemap_urls = {
        loc.text for name in SITEMAPS
        for loc in ET.parse(site / name).getroot().findall("s:url/s:loc", NS)
    }
    languages = {}
    tag_counts = {}
    for lang in ("fa", "en"):
        data = json.loads((site / "blog" / lang / "index.json").read_text(encoding="utf-8"))
        posts = data["posts"]
        if data["total"] != len(posts) or len({p["url"] for p in posts}) != len(posts):
            raise ValueError("Invalid public blog index: " + lang)
        languages[lang] = posts
        for post in posts:
            for tag in set(post["tagUrls"]):
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
    counts = {"indexable": 0, "noindex": 0, "legacy": 0, "thin_tags": 0, "empty": 0, "special": 0}
    for file in sorted(site.rglob("*.html")):
        rel = file.relative_to(site).as_posix()
        if any(part.startswith(".") for part in file.relative_to(site).parts):
            continue
        raw = file.read_text(encoding="utf-8")
        if re.fullmatch(r"google[0-9a-f]+\.html", rel) and raw.strip() == "google-site-verification: " + rel:
            continue
        page = SitemapHeadParser()
        page.feed(raw)
        flags = set(page.robots)
        blocked = bool(flags & {"noindex", "none"})
        if blocked and ("index" in flags or "nofollow" in flags or "none" in flags):
            raise ValueError("Conflicting robots directives or nofollow: " + rel)
        route = "/" + rel
        if route.endswith("/index.html"):
            route = route[:-len("index.html")]
        route = quote(route, safe="/")
        expected = False
        if rel in {"404.html", "blog/index.html"}:
            expected = True
            counts["special"] += 1
        elif page.refresh:
            # Keep the existing archive alias policy. The /home/ alias is
            # separately canonicalized and does not need a noindex directive.
            expected = rel.startswith("blog/")
            counts["legacy"] += int(expected)
        else:
            match = re.fullmatch(r"/blog/(fa|en)/tag/[^/]+/(?:page/[0-9]+/)?", route)
            if match:
                base = re.sub(r"page/[0-9]+/$", "", route)
                if base not in tag_counts:
                    raise ValueError("Tag archive missing from public blog index: " + rel)
                expected = tag_counts[base] < 2
                counts["thin_tags"] += int(expected)
            else:
                match = re.fullmatch(r"/blog/(fa|en)/(categories/|tags/)?", route)
                if match:
                    posts = languages[match.group(1)]
                    group = match.group(2)
                    expected = not posts or (
                        group == "tags/" and not any(p["tagUrls"] for p in posts)
                    ) or (
                        group == "categories/" and not any(p["categories"] for p in posts)
                    )
                    counts["empty"] += int(expected)
        if blocked != expected:
            raise ValueError(f"Unexpected robots indexability: {rel}; expected noindex={expected}")
        if blocked and f"https://{HOST}{route}" in sitemap_urls:
            raise ValueError("Noindex page included in sitemap: " + rel)
        if not blocked and not page.refresh and f"https://{HOST}{route}" not in sitemap_urls:
            raise ValueError("Indexable HTML missing from sitemap: " + rel)
        counts["noindex" if blocked else "indexable"] += 1
    print(f"Noindex contract validated: {counts['noindex']} intentional exclusions "
          f"({counts['thin_tags']} thin-tag pages, {counts['legacy']} legacy redirects, "
          f"{counts['empty']} empty archives, {counts['special']} system pages).")


class InternalLinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.anchors = set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.anchors.add(a["id"])
        if tag == "a" and a.get("name"):
            self.anchors.add(a["name"])
        if tag in ("a", "area") and a.get("href"):
            self.links.append(a["href"])


# This exact project URL is published by its own GitHub Pages repository,
# not the main website artifact. Do not exempt arbitrary missing paths.
INDEPENDENT_PROJECT_LINKS = {"https://imoein.com/nevis-sanj/"}


def validate_internal_links(site: Path) -> None:
    """Reject broken navigation links, downloads, and HTML anchor targets."""
    site = site.resolve()
    pages = {}
    redirects = set()
    for file in sorted(site.rglob("*.html")):
        if any(part.startswith(".") for part in file.relative_to(site).parts):
            continue
        page = InternalLinkParser()
        raw = file.read_text(encoding="utf-8")
        page.feed(raw)
        pages[file.resolve()] = page
        meta = SitemapHeadParser()
        meta.feed(raw)
        if meta.refresh or file.relative_to(site).as_posix() == "blog/index.html":
            redirects.add(file.resolve())

    errors = []
    checked = 0
    independent = 0
    def check(href, base, source):
        nonlocal checked, independent
        if not href or href == "#":
            return
        url = urlsplit(urljoin(base, href))
        if url.scheme not in ("http", "https") or url.netloc not in (HOST, "www." + HOST):
            return
        checked += 1
        if href in INDEPENDENT_PROJECT_LINKS:
            independent += 1
            return
        target = (site / unquote(url.path).lstrip("/")).resolve()
        if not target.is_relative_to(site) or any(
            part.startswith(".") for part in target.relative_to(site).parts
        ):
            errors.append(f"{source}: unsafe destination {href}")
            return
        if target.is_dir():
            if url.path and not url.path.endswith("/"):
                errors.append(f"{source}: unnecessary directory redirect {href}")
            target = target / "index.html"
        if url.scheme != "https" or url.netloc != HOST:
            errors.append(f"{source}: noncanonical origin redirects {href}")
        if target in redirects:
            errors.append(f"{source}: links to a redirect rather than final page {href}")
        if target == site / "404.html":
            errors.append(f"{source}: links to error page {href}")
        if not target.is_file():
            errors.append(f"{source}: missing destination {href}")
            return
        fragment = unquote(url.fragment).split(":~:text=", 1)[0]
        if fragment and target.suffix.lower() == ".html":
            page = pages.get(target)
            if page is None or fragment not in page.anchors:
                errors.append(f"{source}: missing anchor {href}")

    for file, page in pages.items():
        route = "/" + file.relative_to(site).as_posix()
        if route.endswith("/index.html"):
            route = route[:-len("index.html")]
        for href in page.links:
            check(href, "https://" + HOST + quote(route, safe="/"), file.relative_to(site))

    # Public JSON drives the dynamically rendered home, portfolio, resume,
    # and navigation links. Inspect root-relative and same-host URL values.
    def walk(value, key=""):
        if isinstance(value, dict):
            for name, child in value.items():
                yield from walk(child, key + "." + name)
        elif isinstance(value, list):
            for index, child in enumerate(value):
                yield from walk(child, f"{key}[{index}]")
        elif isinstance(value, str) and (
            value.startswith("/") or value.startswith("https://" + HOST + "/")
            or value.startswith("http://" + HOST + "/")
            or value.startswith("https://www." + HOST + "/")
            or value.startswith("http://www." + HOST + "/")
        ):
            yield key, value

    for name in ("portfolio.json", "resume/site-data.json"):
        file = site / name
        if not file.is_file():
            continue
        for key, href in walk(json.loads(file.read_text(encoding="utf-8"))):
            check(href, "https://" + HOST + "/", name + key)

    if errors:
        raise ValueError("Broken internal links:\n  " + "\n  ".join(errors))
    print(f"Internal links validated: {checked} references, {len(pages)} HTML files; "
          f"{independent} separately hosted project references.")


ARTICLE_SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
RESERVED_ARTICLE_SLUGS = {"page", "tag", "tags", "category", "categories"}


def validate_url_structure(site: Path) -> None:
    """Preserve the published route convention, excluding compatibility aliases."""
    post_urls = set()
    for lang in ("fa", "en"):
        for post in json.loads((site / "blog" / lang / "index.json").read_text(encoding="utf-8"))["posts"]:
            url = post["url"]
            match = re.fullmatch(r"/blog/" + lang + r"/([^/]+)/", url)
            if not match or not ARTICLE_SLUG.fullmatch(match[1]) or len(match[1]) > 90 or match[1] in RESERVED_ARTICLE_SLUGS:
                raise ValueError("Invalid article route: " + url)
            if url in post_urls:
                raise ValueError("Duplicate article route: " + url)
            post_urls.add(url)
    seen_posts = set()
    count = 0
    for file in site.rglob("*.html"):
        if any(part.startswith(".") for part in file.relative_to(site).parts):
            continue
        page = SitemapHeadParser()
        page.feed(file.read_text(encoding="utf-8"))
        if page.refresh or not page.canonicals:
            continue
        url = page.canonicals[0]
        parts = urlsplit(url)
        route = unquote(parts.path, errors="strict")
        if (parts.scheme != "https" or parts.netloc != HOST or parts.query or parts.fragment
                or route != unicodedata.normalize("NFC", route)
                or quote(route, safe="/") != parts.path):
            raise ValueError("Nonstandard canonical URL: " + url)
        if route.startswith("/blog/"):
            match = re.fullmatch(r"/blog/(fa|en)/(.*)", route)
            if not match:
                raise ValueError("Invalid blog language route: " + url)
            tail = match[2]
            if tail in ("", "tags/", "categories/"):
                pass
            elif re.fullmatch(r"page/(?:[2-9]|[1-9][0-9]+)/", tail):
                pass
            elif (term := re.fullmatch(r"(?:tag|category)/([^/]+)/(?:page/(?:[2-9]|[1-9][0-9]+)/)?", tail)):
                slug = term[1]
                if (not re.fullmatch(r"[^\W_]+(?:-[^\W_]+)*", slug)
                        or slug != slug.casefold() or len(slug) > 120 or len(slug.encode("utf-8")) > 255):
                    raise ValueError("Invalid taxonomy route: " + url)
            elif parts.path in post_urls:
                seen_posts.add(parts.path)
            else:
                raise ValueError("Invalid or unregistered blog route: " + url)
        elif not re.fullmatch(r"/(?:[a-z0-9]+(?:-[a-z0-9]+)*/)*(?:[a-z0-9]+(?:-[a-z0-9]+)*\.html)?", route):
            raise ValueError("Invalid public page route: " + url)
        count += 1
    if seen_posts != post_urls:
        raise ValueError("Article index differs from canonical article routes")
    print(f"URL structure validated: {count} canonical routes, {len(seen_posts)} article routes.")


class PageTitleParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_head = False
        self.in_title = False
        self.titles = []
        self.outside_head = False

    def handle_starttag(self, tag, attrs):
        if tag == "head":
            self.in_head = True
        if tag == "title":
            self.in_title = True
            self.titles.append("")
            if not self.in_head:
                self.outside_head = True

    def handle_endtag(self, tag):
        if tag == "head":
            self.in_head = False
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.titles[-1] += data


def validate_page_titles(site: Path) -> None:
    """Require distinct descriptive title elements for canonical content."""
    indexed_titles = {}
    checked = 0
    long_titles = 0
    for file in sorted(site.rglob("*.html")):
        if any(part.startswith(".") for part in file.relative_to(site).parts):
            continue
        raw = file.read_text(encoding="utf-8")
        meta = SitemapHeadParser()
        meta.feed(raw)
        if meta.refresh or not meta.canonicals:
            continue
        doc = PageTitleParser()
        doc.feed(raw)
        if len(doc.titles) != 1 or doc.outside_head or not doc.titles[0].strip():
            raise ValueError("Expected exactly one nonempty title in HTML head: " + str(file))
        title = " ".join(doc.titles[0].split())
        checked += 1
        if "noindex" in meta.robots or "none" in meta.robots:
            continue
        key = unicodedata.normalize("NFC", title).casefold()
        if key in indexed_titles:
            raise ValueError(f"Duplicate indexable page title: {indexed_titles[key]} and {file}")
        indexed_titles[key] = file
        if len(title) > 60:
            long_titles += 1
            print(f"Title length advisory ({len(title)} characters): {file.relative_to(site)}")
    print(f"Page titles validated: {checked} canonical pages, {len(indexed_titles)} distinct indexable titles; {long_titles} length advisories.")


def validate_meta_descriptions(site: Path) -> None:
    """Require one nonempty description per canonical page; length is advisory."""
    indexed = {}
    checked = 0
    advisories = 0
    for file in sorted(site.rglob("*.html")):
        if any(part.startswith(".") for part in file.relative_to(site).parts):
            continue
        meta = SitemapHeadParser()
        meta.feed(file.read_text(encoding="utf-8"))
        if meta.refresh or not meta.canonicals:
            continue
        if len(meta.descriptions) != 1 or meta.descriptions_outside_head or not meta.descriptions[0].strip():
            raise ValueError("Expected exactly one nonempty meta description in HTML head: " + str(file))
        checked += 1
        if "noindex" in meta.robots or "none" in meta.robots:
            continue
        desc = " ".join(meta.descriptions[0].split())
        key = unicodedata.normalize("NFC", desc).casefold()
        if key in indexed:
            raise ValueError(f"Duplicate indexable meta description: {indexed[key]} and {file}")
        indexed[key] = file
        if not 80 <= len(desc) <= 165:
            advisories += 1
            print(f"Description length advisory ({len(desc)} characters): {file.relative_to(site)}")
    print(f"Meta descriptions validated: {checked} canonical pages, {len(indexed)} distinct indexable descriptions; {advisories} length advisories.")


class HeadingParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.headings = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            if self.current is not None:
                raise ValueError("Nested heading elements")
            self.current = [int(tag[1]), ""]
            self.headings.append(self.current)

    def handle_endtag(self, tag):
        if self.current is not None and tag == f"h{self.current[0]}":
            self.current = None

    def handle_data(self, data):
        if self.current is not None:
            self.current[1] += data


def validate_heading_contract(site: Path) -> None:
    """Site policy: a single page H1 and a logical, nonempty heading outline."""
    checked = 0
    heading_count = 0
    for file in sorted(site.rglob("*.html")):
        if any(part.startswith(".") for part in file.relative_to(site).parts):
            continue
        raw = file.read_text(encoding="utf-8")
        meta = SitemapHeadParser()
        meta.feed(raw)
        if meta.refresh or not meta.canonicals:
            continue
        parser = HeadingParser()
        parser.feed(raw)
        if parser.current is not None:
            raise ValueError(f"Unclosed heading: {file}")
        headings = parser.headings
        if sum(level == 1 for level, _ in headings) != 1 or headings[0][0] != 1:
            raise ValueError(f"Expected one leading H1: {file}")
        previous = 0
        for level, text in headings:
            if not text.strip():
                raise ValueError(f"Empty H{level}: {file}")
            if level > previous + 1:
                raise ValueError(f"Skipped H{previous} to H{level}: {file}")
            previous = level
        checked += 1
        heading_count += len(headings)
    print(f"Heading contract validated: {checked} canonical pages, {heading_count} headings.")


def validate_image_alt_contract(site: Path) -> None:
    """Every image needs an alt attribute; decorative images may use alt="". """
    images = described = decorative = pages = 0
    for file in sorted(site.rglob("*.html")):
        if any(part.startswith(".") for part in file.relative_to(site).parts):
            continue
        parser = AssetAndLinkParser()
        parser.feed(file.read_text(encoding="utf-8"))
        pages += 1
        for attrs in parser.images:
            images += 1
            if "alt" not in attrs or attrs["alt"] is None:
                raise ValueError(f"Missing image alt: {file}: {attrs.get('src', '')}")
            alt = attrs["alt"]
            if alt.strip():
                described += 1
            elif alt == "":
                decorative += 1
            else:
                raise ValueError(f"Whitespace-only image alt: {file}")
    # Article covers are meaningful images, and the JSON feed drives JS cards.
    for lang in ("fa", "en"):
        posts = json.loads((site / "blog" / lang / "index.json").read_text(encoding="utf-8"))["posts"]
        for post in posts:
            if not post.get("cover"):
                continue
            alt = str(post.get("coverAlt") or "").strip()
            if not alt or " ".join(alt.split()).casefold() == " ".join(post["title"].split()).casefold():
                raise ValueError("Article cover needs a descriptive alt: " + post["url"])
    print(f"Image alt contract validated: {images} images in {pages} HTML files; {described} described, {decorative} empty alt.")


class ArticleRelatedParser(HTMLParser):
    """Collect links inside the article body and related / next-read controls."""
    def __init__(self):
        super().__init__()
        self.in_article = False
        self.in_footer = False
        self.body_links = []
        self.related = []
        self.next_read = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        classes = a.get("class", "").split()
        if tag == "article" and "blog-article-content" in classes:
            self.in_article = True
        if self.in_article and tag == "footer":
            self.in_footer = True
        if tag != "a" or not a.get("href"):
            return
        if self.in_article and not self.in_footer:
            self.body_links.append(a["href"])
        if "blog-sidebar-article" in classes:
            self.related.append(a["href"])
        if "blog-end-next" in classes:
            self.next_read.append(a["href"])

    def handle_endtag(self, tag):
        if tag == "article" and self.in_article:
            self.in_article = False
            self.in_footer = False


def validate_article_related_links(site: Path) -> None:
    """Related posts must be distinct, published, same-language article URLs."""
    posts = {}
    for lang in ("fa", "en"):
        posts[lang] = {p["url"] for p in json.loads((site / "blog" / lang / "index.json").read_text(encoding="utf-8"))["posts"]}
    incoming = set()
    body_edges = 0
    total = 0
    for lang, urls in posts.items():
        for url in sorted(urls):
            doc = ArticleRelatedParser()
            doc.feed((site / url.lstrip("/") / "index.html").read_text(encoding="utf-8"))
            if len(doc.related) != len(set(doc.related)) or any(href == url or href not in urls for href in doc.related):
                raise ValueError("Invalid related article links: " + url)
            if len(doc.related) > 3:
                raise ValueError("Too many sidebar related links: " + url)
            expected_next = doc.related[0] if doc.related else f"/blog/{lang}/"
            if doc.next_read != [expected_next]:
                raise ValueError("Next-read link does not match related articles: " + url)
            body = set()
            for href in doc.body_links:
                parsed = urlsplit(urljoin("https://" + HOST + url, href))
                if parsed.netloc == HOST and parsed.path in urls and parsed.path != url:
                    body.add(parsed.path)
            incoming.update(body)
            body_edges += len(body)
            # Advisory only: valuable new content need not contain forced links.
            if not body and len(urls) > 1:
                print("Contextual link advisory: " + url)
            total += 1
    print(f"Article related links validated: {total} articles, {body_edges} contextual links, {len(incoming)} article targets.")


class StructuredDataParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.active = False
        self.blocks = []
        self.lang = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.lang = a.get("lang", "")
        if tag == "script" and a.get("type") == "application/ld+json":
            self.active = True
            self.blocks.append("")

    def handle_endtag(self, tag):
        if tag == "script":
            self.active = False

    def handle_data(self, data):
        if self.active:
            self.blocks[-1] += data


def validate_structured_data(site: Path) -> None:
    """Local Schema contract; not a substitute for Google Rich Results Test."""
    origin = "https://" + HOST
    person_id = origin + "/#person"
    website_id = origin + "/#website"
    primary_types = {"WebPage", "ProfilePage", "CollectionPage", "Article", "BlogPosting"}
    count = blocks = article_count = profiles = lists = 0
    for file in sorted(site.rglob("*.html")):
        if any(part.startswith(".") for part in file.relative_to(site).parts):
            continue
        raw = file.read_text(encoding="utf-8")
        meta = SitemapHeadParser()
        meta.feed(raw)
        if meta.refresh or not meta.canonicals:
            continue
        canonical = meta.canonicals[0]
        doc = StructuredDataParser()
        doc.feed(raw)
        nodes = []
        for text in doc.blocks:
            try:
                node = json.loads(text)
            except ValueError as e:
                raise ValueError(f"Invalid JSON-LD: {file}: {e}") from e
            if not isinstance(node, dict) or node.get("@context") != "https://schema.org" or not node.get("@type"):
                raise ValueError(f"Invalid schema context or type: {file}")
            nodes.append(node)
        main = [n for n in nodes if n["@type"] in primary_types]
        if len(main) != 1:
            raise ValueError(f"Expected one primary schema: {file}")
        root = main[0]
        kind = root["@type"]
        lang = doc.lang.split("-")[0]
        if root.get("url") != canonical or str(root.get("inLanguage", "")).split("-")[0] != lang:
            raise ValueError(f"Schema URL/language mismatch: {file}")
        if not str(root.get("@id", "")).startswith(canonical + "#"):
            raise ValueError(f"Schema primary ID mismatch: {file}")
        if root.get("description") != meta.descriptions[0]:
            raise ValueError(f"Schema description mismatch: {file}")
        parent = root.get("isPartOf", {})
        if kind == "BlogPosting":
            if parent.get("@id") != origin + f"/blog/{lang}/#blog":
                raise ValueError(f"Article blog ID mismatch: {file}")
            parent = parent.get("isPartOf", {})
        if parent.get("@id") != website_id:
            raise ValueError(f"Schema website ID mismatch: {file}")
        if kind in {"Article", "BlogPosting"}:
            heading = HeadingParser()
            heading.feed(raw)
            if " ".join(root.get("headline", "").split()) != " ".join(heading.headings[0][1].split()):
                raise ValueError(f"Article schema headline mismatch: {file}")
            if root.get("mainEntityOfPage", {}).get("@id") != canonical:
                raise ValueError(f"Article page identity mismatch: {file}")
            for key in ("author", "publisher"):
                entity = root.get(key, {})
                if entity.get("@id") != person_id or not entity.get("name"):
                    raise ValueError(f"Article {key} mismatch: {file}")
            if root["author"].get("url") != origin + ("/en/about.html" if lang == "en" else "/about.html"):
                raise ValueError(f"Article author profile mismatch: {file}")
            published = date.fromisoformat(root["datePublished"])
            if root.get("dateModified") and date.fromisoformat(root["dateModified"]) < published:
                raise ValueError(f"Invalid article dates: {file}")
            if kind == "BlogPosting":
                image = urlsplit(root.get("image", ""))
                if image.scheme != "https" or not image.netloc:
                    raise ValueError(f"Invalid article image: {file}")
                if image.netloc == HOST and not (site / unquote(image.path.lstrip("/"))).is_file():
                    raise ValueError(f"Missing local schema image: {file}")
            article_count += 1
        elif kind == "ProfilePage":
            entity = root.get("mainEntity", {})
            if entity.get("@type") != "Person" or entity.get("@id") != person_id or not entity.get("name"):
                raise ValueError(f"Invalid profile main entity: {file}")
            profiles += 1
        elif kind == "CollectionPage":
            entity = root.get("mainEntity", {})
            items = entity.get("itemListElement", [])
            if entity.get("@type") != "ItemList" or entity.get("numberOfItems") != len(items):
                raise ValueError(f"Invalid collection ItemList: {file}")
            if [item.get("position") for item in items] != list(range(1, len(items)+1)):
                raise ValueError(f"Invalid ItemList positions: {file}")
            for item in items:
                if item.get("@type") != "ListItem" or not item.get("item", {}).get("name"):
                    raise ValueError(f"Invalid ListItem: {file}")
                dest = item["item"].get("url")
                if dest and not local_path(site, dest).is_file():
                    raise ValueError(f"Missing schema item destination: {file}")
            lists += 1
        else:
            if root.get("about", {}).get("@id") != person_id:
                raise ValueError(f"WebPage person ID mismatch: {file}")
        count += 1
        blocks += len(nodes)
    print(f"Structured data validated: {count} pages, {blocks} JSON-LD blocks; {article_count} articles, {profiles} profiles, {lists} collections.")


class BreadcrumbParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.trails = []
        self.trail = None
        self.active = None
        self.active_tag = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "nav" and set(a.get("class", "").split()) & {"blog-breadcrumbs", "product-guide-breadcrumb", "site-breadcrumbs"}:
            self.trail = {"label": a.get("aria-label", ""), "items": []}
            self.trails.append(self.trail)
        if self.trail is None:
            return
        if tag == "a" or a.get("aria-current") == "page":
            self.active = {"href": a.get("href"), "current": a.get("aria-current") == "page", "name": ""}
            self.active_tag = tag
            self.trail["items"].append(self.active)

    def handle_endtag(self, tag):
        if self.active is not None and tag == self.active_tag:
            self.active = None
            self.active_tag = None
        if tag == "nav":
            self.trail = None

    def handle_data(self, data):
        if self.active is not None:
            self.active["name"] += data


def validate_breadcrumb_contract(site: Path) -> None:
    """Check real parent routes and equality of visible and JSON-LD breadcrumbs."""
    origin = "https://" + HOST
    home_urls = {origin + "/", origin + "/en/"}
    pages = {}
    for file in sorted(site.rglob("*.html")):
        if any(part.startswith(".") for part in file.relative_to(site).parts):
            continue
        raw = file.read_text(encoding="utf-8")
        meta = SitemapHeadParser()
        meta.feed(raw)
        if meta.refresh or not meta.canonicals:
            continue
        sd = StructuredDataParser()
        sd.feed(raw)
        pages[unquote(meta.canonicals[0])] = (file, raw, sd)
    checked = links = 0
    for canonical, (file, raw, sd) in pages.items():
        doc = BreadcrumbParser()
        doc.feed(raw)
        nodes = [json.loads(block) for block in sd.blocks]
        schemas = [node for node in nodes if node.get("@type") == "BreadcrumbList"]
        if canonical in home_urls:
            if doc.trails or schemas:
                raise ValueError(f"Homepage should not have breadcrumbs: {file}")
            continue
        if len(doc.trails) != 1 or len(schemas) != 1:
            raise ValueError(f"Expected one visible and structured breadcrumb trail: {file}")
        trail = doc.trails[0]
        schema = schemas[0]
        items = schema.get("itemListElement", [])
        visible = trail["items"]
        lang = sd.lang.split("-")[0]
        home = origin + ("/en/" if lang == "en" else "/")
        if trail["label"] != ("Breadcrumb" if lang == "en" else "مسیر راهنما"):
            raise ValueError(f"Missing localized breadcrumb label: {file}")
        if unquote(schema.get("@id", "")) != canonical + "#breadcrumbs":
            raise ValueError(f"Invalid breadcrumb identity: {file}")
        if len(items) < 2 or len(items) != len(visible):
            raise ValueError(f"Breadcrumb length mismatch: {file}")
        if [item.get("position") for item in items] != list(range(1, len(items)+1)):
            raise ValueError(f"Invalid breadcrumb positions: {file}")
        if [entry["current"] for entry in visible] != [False]*(len(visible)-1)+[True]:
            raise ValueError(f"Invalid breadcrumb current page: {file}")
        urls = []
        for i, (item, entry) in enumerate(zip(items, visible)):
            dest = unquote(item.get("item", ""))
            if item.get("@type") != "ListItem" or not item.get("name", "").strip():
                raise ValueError(f"Invalid breadcrumb item: {file}")
            if " ".join(item["name"].split()) != " ".join(entry["name"].split()):
                raise ValueError(f"Breadcrumb visible label mismatch: {file}")
            if dest not in pages:
                raise ValueError(f"Breadcrumb destination is not canonical: {file}: {dest}")
            if pages[dest][2].lang.split("-")[0] != lang:
                raise ValueError(f"Breadcrumb language mismatch: {file}: {dest}")
            if i < len(items)-1:
                if not entry["href"] or unquote(urljoin(canonical, entry["href"])) != dest:
                    raise ValueError(f"Breadcrumb visible URL mismatch: {file}")
                links += 1
            elif entry["href"] is not None:
                raise ValueError(f"Current breadcrumb must not be a link: {file}")
            urls.append(dest)
        if items[0]["name"] != ("Moein Ghezelbash" if lang == "en" else "معین قزلباش"):
            raise ValueError(f"Invalid breadcrumb root label: {file}")
        if urls[0] != home or urls[-1] != canonical or len(set(urls)) != len(urls):
            raise ValueError(f"Invalid breadcrumb root, destination or duplicate: {file}")
        checked += 1
    print(f"Breadcrumb contract validated: {checked} non-home canonical pages, {links} parent links.")


class OpenGraphParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_head = False
        self.values = {}

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "head":
            self.in_head = True
        key = a.get("property", "")
        if tag == "meta" and key.startswith(("og:", "article:")):
            if not self.in_head:
                raise ValueError("Open Graph must be in the HTML head")
            self.values.setdefault(key, []).append(a.get("content", ""))

    def handle_endtag(self, tag):
        if tag == "head":
            self.in_head = False


def validate_open_graph(site: Path) -> None:
    """Validate static sharing metadata independently of JavaScript."""
    origin = "https://" + HOST
    checked = articles = 0
    images = set()
    for file in sorted(site.rglob("*.html")):
        if any(part.startswith(".") for part in file.relative_to(site).parts):
            continue
        raw = file.read_text(encoding="utf-8")
        meta = SitemapHeadParser()
        meta.feed(raw)
        if meta.refresh or not meta.canonicals:
            continue
        doc = OpenGraphParser()
        doc.feed(raw)
        title = PageTitleParser()
        title.feed(raw)
        def value(key, required=True):
            vals = doc.values.get(key, [])
            if not vals and not required:
                return ""
            if len(vals) != 1 or not vals[0].strip():
                raise ValueError(f"Missing, empty or duplicate {key}: {file}")
            return vals[0]
        lang = meta.language.split("-")[0]
        locale = "fa_IR" if lang == "fa" else "en_GB"
        other = "en" if lang == "fa" else "fa"
        for key, expected in (
            ("og:title", title.titles[0].strip()),
            ("og:description", meta.descriptions[0]),
            ("og:url", meta.canonicals[0]),
            ("og:site_name", "iMoein"),
            ("og:locale", locale),
            ("og:locale:alternate", ("en_GB" if lang == "fa" else "fa_IR") if other in meta.alternates else ""),
        ):
            if value(key, bool(expected)) != expected:
                raise ValueError(f"Open Graph {key} mismatch: {file}")
        kind = value("og:type")
        if kind not in {"website", "profile", "article"}:
            raise ValueError(f"Unexpected og:type: {file}")
        url = value("og:image")
        parsed = urlsplit(url)
        if parsed.scheme != "https" or not parsed.netloc or value("og:image:secure_url") != url:
            raise ValueError(f"Invalid Open Graph image URL: {file}")
        local = parsed.netloc == HOST
        if local and not local_path(site, url).is_file():
            raise ValueError(f"Missing Open Graph image: {file}")
        # Remote metadata cannot always be verified; never require invented dimensions.
        width = value("og:image:width", local)
        height = value("og:image:height", local)
        mime = value("og:image:type", local)
        alt = value("og:image:alt", False)
        if not alt:
            print(f"Open Graph image alt advisory: {file}")
        if bool(width) != bool(height) or any(not x.isdecimal() or int(x) <= 0 for x in (width, height) if x):
            raise ValueError(f"Invalid Open Graph image dimensions: {file}")
        if mime and not mime.startswith("image/"):
            raise ValueError(f"Invalid Open Graph image type: {file}")
        if kind == "article":
            author = origin + ("/about.html" if lang == "fa" else "/en/about.html")
            if value("article:author") != author:
                raise ValueError(f"Open Graph article author mismatch: {file}")
            date.fromisoformat(value("article:published_time")[:10])
            modified = value("article:modified_time", False)
            if modified and date.fromisoformat(modified[:10]) < date.fromisoformat(value("article:published_time")[:10]):
                raise ValueError(f"Invalid article modified date: {file}")
            articles += 1
        images.add(url)
        checked += 1
    print(f"Open Graph validated: {checked} canonical pages, {articles} articles, {len(images)} unique image URLs.")


class TwitterCardParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_head = False
        self.values = {}

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "head":
            self.in_head = True
        if tag != "meta":
            return
        key = a.get("name", "") or a.get("property", "")
        if key.startswith("twitter:"):
            if not self.in_head or a.get("name") != key:
                raise ValueError("Twitter Cards must use name attributes in the HTML head")
            self.values.setdefault(key, []).append(a.get("content", ""))

    def handle_endtag(self, tag):
        if tag == "head":
            self.in_head = False


def validate_twitter_cards(site: Path) -> None:
    """Require explicit cards and consistent attribution, without guessing image aspects."""
    config = json.loads((site / "resume/site-data.json").read_text(encoding="utf-8"))
    handles = set()
    for row in config.get("socialLinks", []):
        if row.get("enabled", True) is False or str(row.get("label", "")).casefold() not in {"x", "twitter"}:
            continue
        u = urlsplit(row.get("url", ""))
        name = u.path.strip("/")
        if u.scheme == "https" and u.netloc.lower() in {"x.com", "www.x.com", "twitter.com", "www.twitter.com"} and re.fullmatch(r"[A-Za-z0-9_]{1,15}", name):
            handles.add("@" + name)
    if len(handles) > 1:
        raise ValueError("Ambiguous X profile in site settings")
    account = next(iter(handles), "")
    checked = authors = wide = long = 0
    for file in sorted(site.rglob("*.html")):
        if any(part.startswith(".") for part in file.relative_to(site).parts):
            continue
        raw = file.read_text(encoding="utf-8")
        meta = SitemapHeadParser()
        meta.feed(raw)
        if meta.refresh or not meta.canonicals:
            continue
        og, tw = OpenGraphParser(), TwitterCardParser()
        og.feed(raw)
        tw.feed(raw)
        expected = {"twitter:card": "summary_large_image"}
        for key in ("title", "description", "url", "image", "image:alt"):
            value = og.values.get("og:" + key, [""])[0]
            if value:
                expected["twitter:" + key] = value
        if account:
            expected["twitter:site"] = account
            if og.values.get("og:type") == ["article"]:
                expected["twitter:creator"] = account
                authors += 1
        for key in ("card", "title", "description", "url", "image", "image:alt", "site", "creator"):
            k = "twitter:" + key
            if tw.values.get(k, []) != ([expected[k]] if k in expected else []):
                raise ValueError(f"Twitter Card mismatch or duplicate {k}: {file}")
        image = urlsplit(expected["twitter:image"])
        if image.scheme != "https" or not image.netloc:
            raise ValueError(f"Twitter Card image must use HTTPS: {file}")
        if image.netloc == HOST:
            path = local_path(site, expected["twitter:image"])
            if not path.is_file():
                raise ValueError(f"Missing Twitter Card image: {file}")
            if path.stat().st_size >= 5 * 1024 * 1024:
                raise ValueError(f"Twitter Card image exceeds 5 MiB: {file}")
            if path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
                raise ValueError(f"Unsupported Twitter Card image format: {file}")
        w = og.values.get("og:image:width", [""])[0]
        h = og.values.get("og:image:height", [""])[0]
        if w and h:
            if not (300 <= int(w) <= 4096 and 157 <= int(h) <= 4096):
                print(f"Twitter Card image dimension advisory: {file}")
            if int(w)/int(h) > 2.1 or int(w)/int(h) < 1.8:
                wide += 1
        for key, limit in (("title", 70), ("description", 200), ("image:alt", 420)):
            if len(expected.get("twitter:" + key, "")) > limit:
                long += 1
        checked += 1
    print(f"Twitter Cards validated: {checked} canonical pages, {authors} author tags, {wide} aspect-ratio advisories, {long} length advisories.")


class ArticleBodyFingerprint(ArticleRelatedParser):
    """Collect editorial text, not navigation and generated taxonomy."""
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        if self.in_article and not self.in_footer:
            self.parts.append(data)

    def tokens(self):
        value = unicodedata.normalize("NFKC", " ".join(self.parts)).casefold()
        value = value.replace("\u200c", " ").replace("ي", "ی").replace("ك", "ک")
        return tuple(re.findall(r"\w+", value))


def validate_duplicate_content(site: Path) -> None:
    """Detect substantial duplicate articles. Shared archive membership is advisory."""
    from itertools import combinations
    articles = []
    archives = {}
    for lang in ("fa", "en"):
        index = site / "blog" / lang / "index.json"
        for post in json.loads(index.read_text(encoding="utf-8"))["posts"]:
            path = site / post["url"].lstrip("/") / "index.html"
            parser = ArticleBodyFingerprint()
            parser.feed(path.read_text(encoding="utf-8"))
            tokens = parser.tokens()
            if not tokens:
                raise ValueError("Missing article body: " + post["url"])
            if len(tokens) >= 80:
                shingles = set(zip(*(tokens[i:] for i in range(5))))
                articles.append((lang, post["url"], tokens, shingles))
    checked = near = 0
    maximum = 0.0
    for a,b in combinations(articles,2):
        if a[0] != b[0]:
            continue
        checked += 1
        if a[2] == b[2]:
            raise ValueError("Duplicate published article body: " + a[1] + " / " + b[1])
        score = len(a[3]&b[3])/len(a[3]|b[3])
        maximum = max(maximum,score)
        if score >= .80:
            near += 1
            print(f"Duplicate content advisory ({score:.0%}): {a[1]} / {b[1]}")
    for file in sorted((site/"blog").rglob("*.html")):
        raw = file.read_text(encoding="utf-8")
        meta = SitemapHeadParser()
        meta.feed(raw)
        if meta.refresh or not meta.canonicals:
            continue
        # Existing one-article terms are intentionally excluded from search.
        if re.search(r'<meta\b[^>]*\bname="robots"[^>]*\bcontent="[^"]*noindex',raw,re.I) or re.search(r'<meta\b[^>]*\bcontent="[^"]*noindex[^"]*"[^>]*\bname="robots"',raw,re.I):
            continue
        sd = StructuredDataParser()
        sd.feed(raw)
        for block in sd.blocks:
            node = json.loads(block)
            if node.get("@type") != "CollectionPage":
                continue
            items = node.get("mainEntity",{}).get("itemListElement",[])
            if not items or not all(x.get("item",{}).get("@type")=="BlogPosting" for x in items):
                continue
            members = tuple(sorted(x["item"]["url"] for x in items))
            archives.setdefault((meta.language,members),[]).append(meta.canonicals[0])
    overlaps = [v for v in archives.values() if len(v)>1]
    for group in overlaps:
        print("Shared article membership advisory: " + " / ".join(group))
    print(f"Duplicate content audit: {len(articles)} substantive articles, {checked} same-language comparisons, 0 exact duplicates, {near} near-duplicate advisories, max similarity {maximum:.2%}, {len(overlaps)} shared indexable archive groups.")


def validate_site_reachability(site: Path) -> None:
    import runpy
    audit = runpy.run_path(str(Path(__file__).with_name("site_reachability.py")))["audit"]
    report = audit(site)
    if not report["available"]:
        raise ValueError("Missing canonical language entry points")
    failures = {k: report[k] for k in ("indexable_orphans","indexable_unreachable",
                "same_language_missing","sitemap_unreachable","pdf_missing") if report[k]}
    if failures:
        raise ValueError("Internal reachability failure: " + json.dumps(failures, ensure_ascii=False))
    for key in ("orphans","unreachable"):
        if report[key]:
            print(f"Nonindexable reachability advisory ({key}): {report[key]}")
    print(f"Reachability validated: {report['reached']}/{report['canonical']} canonical pages, "
          f"{report['indexable_reached']}/{report['indexable']} indexable pages, "
          f"{report['edges']} unique directed edges, {report['pdf_count']} language-matched PDF downloads; "
          f"indexable click depth {report['depth']}, {len(report['single_inbound'])} single-inbound pages.")


def audit_search_intent(site: Path) -> None:
    # Advice only: a local focus collision cannot establish a search ranking conflict.
    from site_search_intent import audit
    report = audit(site)
    for candidate in report["candidates"]:
        print("Search intent advisory: " + json.dumps(candidate, ensure_ascii=False))
    print(f"Search intent screen: {report['pages']} indexable pages, {report['articles']} articles, "
          f"{len(report['candidates'])} local candidate groups; ranking data not measured.")


def validate_responsive_covers(site: Path) -> None:
    """Check generated cover variants and their actual public artifact references."""
    class CoverParser(HTMLParser):
        def __init__(self):
            super().__init__()
            self.images = []
        def handle_starttag(self, tag, attrs):
            if tag == "img":
                a = dict(attrs)
                if a.get("src","").startswith("/assets/blog/media/") and a.get("srcset"):
                    self.images.append(a)
    candidates = set()
    def check(src, srcset, sizes, width, height):
        if not sizes or not width or not height or int(width) <= 0 or int(height) <= 0:
            raise ValueError(f"Missing responsive cover sizes or dimensions: {src}")
        widths=[]
        for entry in srcset.split(","):
            values=entry.split()
            if len(values)!=2 or not re.fullmatch(r"[1-9][0-9]*w",values[1]):
                raise ValueError(f"Invalid cover srcset: {src}")
            url,desc=values
            w=int(desc[:-1])
            expected=src if w==int(width) else src[:-5]+f".w{w}.webp"
            if url!=expected or (w!=int(width) and w not in {480,840}):
                raise ValueError(f"Unexpected responsive cover variant: {url}")
            file=site/url.lstrip("/")
            if not file.is_file():
                raise ValueError(f"Responsive cover missing: {url}")
            with file.open("rb") as stream:
                head=stream.read(12)
            if head[:4]!=b"RIFF" or head[8:12]!=b"WEBP":
                raise ValueError(f"Invalid WebP file: {url}")
            widths.append(w)
            candidates.add(url)
        if widths!=sorted(set(widths)) or widths[-1]!=int(width):
            raise ValueError(f"Invalid responsive cover width sequence: {src}")
    images=records=0
    for file in (site/"blog").rglob("*.html"):
        doc=CoverParser()
        doc.feed(file.read_text(encoding="utf-8"))
        for a in doc.images:
            check(a["src"],a["srcset"],a.get("sizes"),a.get("width"),a.get("height"))
            images+=1
    def walk(obj):
        nonlocal records
        if isinstance(obj,list):
            for x in obj:walk(x)
        if isinstance(obj,dict):
            if obj.get("coverSrcset"):
                check(obj["cover"],obj["coverSrcset"],obj.get("coverSizes"),
                      obj.get("coverWidth"),obj.get("coverHeight"))
                if not obj.get("coverMiniSizes"):
                    raise ValueError("Missing miniature cover sizes")
                records+=1
            for x in obj.values():walk(x)
    for file in (site/"blog").rglob("*.json"):
        walk(json.loads(file.read_text(encoding="utf-8")))
    print(f"Responsive cover contract: {images} HTML images, {records} JSON entries, {len(candidates)} distinct files.")


def validate_image_loading(site: Path) -> None:
    class LoadingParser(HTMLParser):
        def __init__(self):
            super().__init__()
            self.images=[]
            self.stack=[]
        def handle_starttag(self, tag, attrs):
            a=dict(attrs)
            if tag=="img":
                classes=set().union(*(c for _,c in self.stack))
                self.images.append((a,classes))
            if tag not in {"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}:
                self.stack.append((tag,set((a.get("class") or "").split())))
        def handle_endtag(self, tag):
            for i in range(len(self.stack)-1,-1,-1):
                if self.stack[i][0]==tag:
                    del self.stack[i:]
                    break
    from collections import Counter
    counts=Counter()
    for file in sorted(site.rglob("*.html")):
        if any(x.startswith(".") for x in file.relative_to(site).parts):
            continue
        parser=LoadingParser()
        parser.feed(file.read_text(encoding="utf-8"))
        for image,classes in parser.images:
            mode=image.get("loading","default")
            counts[mode]+=1
            src=image.get("src","")
            priority=image.get("fetchpriority")
            if mode not in {"default","eager","lazy"}:
                raise ValueError(f"Invalid image loading mode: {file}: {src}")
            expected=None
            if priority=="high" or "blog-featured-image" in classes:
                expected="eager"
            elif "blog-cover" in classes:
                expected="eager" if "is-featured" in classes else "lazy"
            elif classes & {"brand-logo","landing-contact","site-footer-brand","blog-end-author-photo","landing-story-media","landing-mini-cover","landing-time-browser"} or "blog-inline-image" in (image.get("class") or "").split():
                expected="lazy"
            if expected and mode!=expected:
                raise ValueError(f"Expected loading={expected}: {file}: {src}")
    print(f"Image loading contract: {sum(counts.values())} images, {counts['lazy']} lazy, {counts['eager']} eager, {counts['default']} default.")


def validate_font_loading(site: Path) -> None:
    import hashlib
    class FontParser(HTMLParser):
        def __init__(self):
            super().__init__()
            self.lang=""
            self.canonical=False
            self.refresh=False
            self.links=[]
        def handle_starttag(self,tag,attrs):
            a=dict(attrs)
            if tag=="html":self.lang=a.get("lang","")
            if tag=="meta" and a.get("http-equiv","").lower()=="refresh":self.refresh=True
            if tag=="link":
                self.links.append(a)
                if a.get("rel")=="canonical":self.canonical=True
    base=site/"assets/fonts"
    css=(base/"google-fonts.css").read_text(encoding="utf-8")
    manifest=json.loads((base/"sources.json").read_text(encoding="utf-8"))
    for url,name,size,digest in manifest:
        if Path(name).name!=name: raise ValueError("Invalid font file name")
        data=(base/name).read_bytes()
        if len(data)!=size or hashlib.sha256(data).hexdigest()!=digest:
            raise ValueError("Font integrity mismatch: "+name)
        if name.endswith(".woff2") and data[:4]!=b"wOF2":
            raise ValueError("Invalid WOFF2: "+name)
    urls=set(re.findall(r"url\((/assets/fonts/[^)]+\.woff2)\)",css))
    if urls!={"/assets/fonts/"+row[1] for row in manifest if row[1].endswith(".woff2")}:
        raise ValueError("Font stylesheet and source manifest differ")
    if re.search(r"url\(\s*https?://",css) or "font-display: swap;" not in css:
        raise ValueError("Unexpected remote or blocking font source")
    latin=re.search(r"/\* latin \*/\s*@font-face\s*\{\s*font-family: 'Inter';[^}]*?url\(([^)]+)\)",css,re.S)[1]
    fa="/assets/IRANSansXFaNum-Regular.ttf"
    counts={"fa":0,"en":0,"local":0}
    for file in sorted(site.rglob("*.html")):
        if any(x.startswith(".") for x in file.relative_to(site).parts):continue
        parser=FontParser();parser.feed(file.read_text(encoding="utf-8"))
        if any("https://fonts.googleapis.com" in a.get("href","") or "https://fonts.gstatic.com" in a.get("href","") for a in parser.links):
            raise ValueError("Remote font dependency: "+str(file))
        if not parser.canonical or parser.refresh:continue
        local=[a for a in parser.links if a.get("href","").split("?")[0]=="/assets/fonts/google-fonts.css" and a.get("rel")=="stylesheet"]
        expected=fa if parser.lang=="fa" else latin if local else None
        pre=[a for a in parser.links if a.get("as")=="font" and a.get("rel")=="preload"]
        if expected:
            if len(pre)!=1 or pre[0].get("href")!=expected or "crossorigin" not in pre[0] or pre[0].get("type")!=("font/ttf" if expected==fa else "font/woff2") or not (site/expected.lstrip("/")).is_file():
                raise ValueError("Invalid font preload: "+str(file))
            counts[parser.lang]+=1
        elif pre:
            raise ValueError("Unexpected font preload: "+str(file))
        if local:
            if len(local)!=1:raise ValueError("Duplicate font stylesheet: "+str(file))
            counts["local"]+=1
    print(f"Font loading validated: {counts['fa']} Persian preloads, {counts['en']} English preloads, {counts['local']} self-hosted stylesheet references, {len(urls)} WOFF2 assets.")


def validate_accessibility_structure(site: Path) -> None:
    class Parser(HTMLParser):
        def __init__(self):
            super().__init__()
            self.lang=""
            self.canonical=False
            self.refresh=False
            self.main=[]
            self.skips=[]
            self.ids=[]
        def handle_starttag(self,tag,attrs):
            a=dict(attrs)
            if tag=="html":self.lang=a.get("lang","")
            if tag=="link" and a.get("rel")=="canonical":self.canonical=True
            if tag=="meta" and a.get("http-equiv","").lower()=="refresh":self.refresh=True
            if a.get("id"):self.ids.append(a["id"])
            if tag=="main":self.main.append(a)
            if tag=="a" and set(a.get("class","").split()) & {"site-skip-link","landing-skip","product-guide-skip"}:
                self.skips.append(a)
    count=0
    for p in sorted(site.rglob("*.html")):
        if any(x.startswith(".") for x in p.relative_to(site).parts):continue
        parser=Parser();parser.feed(p.read_text(encoding="utf-8"))
        if not parser.canonical or parser.refresh:continue
        if parser.lang not in {"fa","en"} or len(parser.main)!=1:
            raise ValueError(f"Invalid accessible main structure: {p}")
        main=parser.main[0];ident=main.get("id")
        if not ident or parser.ids.count(ident)!=1 or main.get("tabindex")!="-1":
            raise ValueError(f"Main focus target missing or ambiguous: {p}")
        if len(parser.skips)!=1 or parser.skips[0].get("href")!="#"+ident:
            raise ValueError(f"Missing valid skip link: {p}")
        count+=1
    print(f"Accessibility structure validated: {count} canonical pages with skip link and focusable main.")


def validate_robots_contract(site: Path) -> None:
    """Public site policy: allow every crawler to access all public URLs."""
    robots = site / "robots.txt"
    if not robots.is_file():
        raise ValueError("Missing robots.txt")
    data = robots.read_bytes()
    if data.startswith(b"\xef\xbb\xbf") or len(data) > 500 * 1024:
        raise ValueError("robots.txt must be plain UTF-8 without BOM and under 500 KiB")
    rules = {}
    for line in data.decode("utf-8").splitlines():
        line = line.split("#", 1)[0].strip()
        if not line:
            continue
        if ":" not in line:
            raise ValueError("Invalid robots.txt directive")
        key, value = (part.strip() for part in line.split(":", 1))
        rules.setdefault(key.lower(), []).append(value)
    expected = {
        "user-agent": ["*"],
        "allow": ["/"],
        "sitemap": [f"https://{HOST}/{name}" for name in SITEMAPS],
    }
    if rules.keys() != expected.keys() or any(
        sorted(rules[key]) != sorted(values) for key, values in expected.items()
    ):
        raise ValueError("Unexpected robots.txt policy; all public paths including PDF resumes must be crawlable")
    for name in SITEMAPS:
        if not (site / name).is_file():
            raise ValueError("Missing advertised sitemap: " + name)
    # Match URL casing exactly even on case-insensitive development filesystems.
    resume_dir = site / "resume"
    names = {p.name for p in resume_dir.iterdir() if p.is_file()}
    for name in ("MOEIN GHEZELBASH.pdf", "معین قزلباش.pdf"):
        if name not in names:
            raise ValueError("Missing exact-case public resume PDF: " + name)
    print("Robots contract validated: all public paths, including PDF resumes, are crawlable.")


def verify(site: Path) -> None:
    missing = [str(site / path) for path in REQUIRED
               if not (site / path).is_file()]
    listed = []
    alternates = []
    for sitemap in SITEMAPS:
        sitemap_file = site / sitemap
        if not sitemap_file.is_file():
            missing.append(str(sitemap_file))
            continue
        root = ET.parse(sitemap_file).getroot()
        for item in root.findall("s:url", NS):
            loc = item.findtext("s:loc", namespaces=NS)
            if not loc:
                raise ValueError(f"Empty loc in {sitemap}")
            listed.append(loc)
            if not local_path(site, loc).is_file():
                missing.append(loc)
            for alternate in item.findall("x:link", NS):
                if alternate.attrib.get("rel") != "alternate":
                    raise ValueError(f"Unsupported alternate link in {sitemap}")
                href = alternate.attrib.get("href")
                if not href:
                    raise ValueError(f"Missing alternate href in {sitemap}")
                alternates.append(href)
                if not local_path(site, href).is_file():
                    missing.append(f"hreflang: {href}")
    if len(listed) != len(set(listed)):
        raise ValueError("Duplicate sitemap URLs found")
    if not listed:
        raise ValueError("No sitemap URLs found")
    if missing:
        raise ValueError(
            "Missing files in Pages publish artifact:\n  " +
            "\n  ".join(sorted(set(missing)))
        )
    # The old address is a redirect only: never advertise it in a sitemap.
    if any(urlsplit(url).path.rstrip("/") in ("/home", "/home/index.html") for url in listed + alternates):
        raise ValueError("Legacy homepage redirect must not be in a sitemap")
    class RedirectParser(HTMLParser):
        def __init__(self):
            super().__init__()
            self.refresh = []
            self.canonical = []
        def handle_starttag(self, tag, attrs):
            a = dict(attrs)
            if tag == "meta" and a.get("http-equiv", "").lower() == "refresh":
                self.refresh.append(a.get("content"))
            if tag == "link" and a.get("rel") == "canonical":
                self.canonical.append(a.get("href"))
    redirect = RedirectParser()
    redirect.feed((site / "home/index.html").read_text(encoding="utf-8"))
    if redirect.refresh != ["0; url=/"] or redirect.canonical != ["https://imoein.com/"]:
        raise ValueError("Legacy homepage redirect target is missing or incorrect")
    validate_canonical_contract(site)
    validate_sitemap_contract(site)
    validate_noindex_contract(site)
    validate_hreflang_contract(site)
    validate_internal_links(site)
    validate_article_related_links(site)
    validate_url_structure(site)
    validate_page_titles(site)
    validate_meta_descriptions(site)
    validate_heading_contract(site)
    validate_image_alt_contract(site)
    validate_responsive_covers(site)
    validate_image_loading(site)
    validate_font_loading(site)
    validate_accessibility_structure(site)
    validate_structured_data(site)
    validate_breadcrumb_contract(site)
    validate_open_graph(site)
    validate_twitter_cards(site)
    validate_duplicate_content(site)
    validate_site_reachability(site)
    audit_search_intent(site)
    validate_robots_contract(site)
    validate_english_about_assets(site)
    validate_home_time_preview(site)
    print(f"Pages artifact validated: {len(listed)} public sitemap URLs, "
          f"{len(alternates)} hreflang links, {len(REQUIRED)} required files.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: check-pages-artifact.py SITE_DIRECTORY")
    verify(Path(sys.argv[1]))
