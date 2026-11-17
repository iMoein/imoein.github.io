"""Audit static, followable internal HTML links and configured resume downloads.

Sitemaps, hreflang, canonical and JSON-LD are not navigation edges.
"""
from collections import defaultdict, deque, Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
from xml.etree import ElementTree as ET
import json

BASE = "https://imoein.com"
ROOTS = {"fa": "/", "en": "/en/"}

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = ""
        self.lang = ""
        self.robots = set()
        self.refresh = False
        self.links = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        rel = (a.get("rel") or "").lower().split()
        if tag == "html":
            self.lang = (a.get("lang") or "").lower().split("-")[0]
        if tag == "link" and "canonical" in rel:
            self.canonical = a.get("href") or ""
        if tag == "meta":
            if (a.get("name") or "").lower() in {"robots","googlebot"}:
                self.robots.update((a.get("content") or "").lower().replace(","," ").split())
            if (a.get("http-equiv") or "").lower() == "refresh":
                self.refresh = True
        if tag in {"a","area"} and a.get("href") and "nofollow" not in rel:
            self.links.append(a["href"])

def route(url):
    u = urlsplit(url)
    if u.scheme != "https" or u.netloc != "imoein.com":
        return None
    path = unquote(u.path or "/")
    if path.endswith("/index.html"):
        path = path[:-len("index.html")]
    return path

def audit(root):
    root = Path(root)
    pages = {}
    for file in sorted(root.rglob("*.html")):
        if file.is_symlink() or any(p.startswith(".") for p in file.relative_to(root).parts):
            continue
        doc = Page()
        doc.feed(file.read_text(encoding="utf-8"))
        current = route(doc.canonical)
        if not current or doc.refresh:
            continue
        expected = "/" + file.relative_to(root).as_posix()
        if expected.endswith("/index.html"):
            expected = expected[:-len("index.html")]
        if current != expected:
            continue
        pages[current] = doc
    edges, incoming = defaultdict(set), defaultdict(set)
    pdf_edges = defaultdict(set)
    for source, doc in pages.items():
        if doc.robots & {"nofollow","none"}:
            continue
        for href in doc.links:
            target = route(urljoin(doc.canonical, href))
            if target is None or target == source:
                continue
            if target in pages:
                edges[source].add(target)
                incoming[target].add(source)
            elif target.lower().endswith(".pdf"):
                pdf_edges[source].add(target)
    def walk(starts, lang=None):
        dist = {u:0 for u in starts if u in pages}
        queue = deque(dist)
        while queue:
            source = queue.popleft()
            for target in edges[source]:
                if target in dist or (lang and pages[target].lang != lang):
                    continue
                dist[target] = dist[source]+1
                queue.append(target)
        return dist
    indexable = {u for u,d in pages.items() if not d.robots & {"noindex","none"}}
    sitemap = set()
    for file in (root/"sitemap.xml",root/"blog/sitemap.xml"):
        if file.is_file():
            for node in ET.parse(file).getroot().findall("{*}url/{*}loc"):
                u = route(node.text or "")
                if u is not None:
                    sitemap.add(u)
    available = all(u in pages for u in ROOTS.values())
    dist = walk(ROOTS.values())
    by_language = {}
    same_language_missing = []
    resume_missing = []
    pdf_count = 0
    config = root/"resume/site-data.json"
    downloads = json.loads(config.read_text(encoding="utf-8")).get("resumeDownloads",{}) if config.is_file() else {}
    for lang, start in ROOTS.items():
        d = walk([start], lang)
        targets = {u for u in indexable if pages[u].lang == lang}
        missing = sorted(targets-d.keys())
        same_language_missing.extend(missing)
        by_language[lang] = {"pages":len(d),"indexable":len(targets),"reached":len(targets & d.keys()),
                            "depth":dict(sorted(Counter(d[u] for u in targets if u in d).items()))}
        if downloads.get(lang):
            pdf_count += 1
            target = route(urljoin(BASE+"/", downloads[lang]))
            if not target or not (root/target.lstrip("/")).is_file() or not any(target in pdf_edges[u] for u in d):
                resume_missing.append(lang)
    # The home pages are entry points, not orphans, even with no incoming edge.
    orphans = sorted(u for u in pages if u not in ROOTS.values() and not incoming[u])
    unreachable = sorted(set(pages)-dist.keys())
    return {
        "available":available,"canonical":len(pages),"indexable":len(indexable),
        "reached":len(dist),"indexable_reached":len(indexable & dist.keys()),
        "edges":sum(len(v) for v in edges.values()),"orphans":orphans,
        "unreachable":unreachable,"indexable_orphans":sorted(indexable & set(orphans)),
        "indexable_unreachable":sorted(indexable & set(unreachable)),
        "same_language_missing":sorted(set(same_language_missing)),
        "sitemap_unreachable":sorted(sitemap-dist.keys()),"languages":by_language,
        "depth":dict(sorted(Counter(dist[u] for u in indexable if u in dist).items())),
        "all_depth":dict(sorted(Counter(dist.values()).items())),
        "single_inbound":sorted(u for u in indexable if u not in ROOTS.values() and len(incoming[u])==1),
        "pdf_count":pdf_count,"pdf_missing":resume_missing,
    }
