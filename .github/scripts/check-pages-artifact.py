#!/usr/bin/env python3
"""Verify a GitHub Pages artifact covers every public sitemap URL.

This check executes after the conservative public-only copy stage and before
upload-pages-artifact. A deployment is rejected if an advertised URL 404s
because it was omitted from the allowlist.
"""
from __future__ import annotations

import sys
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
    print(f"Pages artifact validated: {len(listed)} public sitemap URLs, "
          f"{len(alternates)} hreflang links, {len(REQUIRED)} required files.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: check-pages-artifact.py SITE_DIRECTORY")
    verify(Path(sys.argv[1]))
