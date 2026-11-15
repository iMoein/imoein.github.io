#!/usr/bin/env python3
"""Verify a GitHub Pages artifact covers every public sitemap URL.

This check executes after the conservative public-only copy stage and before
upload-pages-artifact. A deployment is rejected if an advertised URL 404s
because it was omitted from the allowlist.
"""
from __future__ import annotations

import sys
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree as ET

HOST = "imoein.com"
SITEMAPS = ("sitemap.xml", "blog/sitemap.xml")
REQUIRED = (
    "index.html",
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
    if 'fetch("/resume/site-data.json?v=' not in js:
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
    validate_english_about_assets(site)
    print(f"Pages artifact validated: {len(listed)} public sitemap URLs, "
          f"{len(alternates)} hreflang links, {len(REQUIRED)} required files.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: check-pages-artifact.py SITE_DIRECTORY")
    verify(Path(sys.argv[1]))
