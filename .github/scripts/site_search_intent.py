"""Local search-intent screen: not a measurement of Google rankings."""
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import re
import unicodedata
from site_reachability import Page, route

# Editorial vocabulary, not a ranking keyword list.
PREFERRED_TAGS = {"fa": {"تحقیق کاربر": "پژوهش کاربر"}, "en": {}}

def norm(value):
    value=unicodedata.normalize("NFKC",value).casefold().replace("\u200c"," ").replace("ي","ی").replace("ك","ک")
    return " ".join(re.findall(r"\w+",value))

def preferred_tag(lang, term):
    return next((target for alias,target in PREFERRED_TAGS.get(lang,{}).items()
                 if norm(alias)==norm(term)),term)

class IntentPage(Page):
    def __init__(self):
        super().__init__()
        self.title=[]
        self.h1=[]
        self.active=""
    def handle_starttag(self, tag, attrs):
        super().handle_starttag(tag,attrs)
        if tag in {"title","h1"}:
            self.active=tag
    def handle_endtag(self,tag):
        if tag==self.active:
            self.active=""
    def handle_data(self,data):
        if self.active:
            getattr(self,self.active).append(data)

def focus(title):
    return norm(re.sub(r"\s*\|\s*(?:iMoein|Moein Ghezelbash|معین قزلباش)\s*$","",title,flags=re.I))

def audit(root):
    root=Path(root)
    groups=defaultdict(list)
    rows=[]
    for file in sorted(root.rglob("*.html")):
        if file.is_symlink() or any(x.startswith(".") for x in file.relative_to(root).parts):
            continue
        p=IntentPage()
        p.feed(file.read_text(encoding="utf-8"))
        url=route(p.canonical)
        if not url or p.refresh or p.robots & {"noindex","none"}:continue
        expected="/"+file.relative_to(root).as_posix()
        if expected.endswith("/index.html"):expected=expected[:-len("index.html")]
        if url!=expected or p.lang not in {"fa","en"}:continue
        title=" ".join("".join(p.title).split())
        heading=" ".join("".join(p.h1).split())
        paginated=bool(re.search(r"/page/\d+/$",url))
        term=""
        if re.match(r"/blog/(fa|en)/tag/",url):
            kind="tag"
            term=re.sub(r"^(?:Tag|برچسب)\s*:\s*","",heading,flags=re.I)
            target=preferred_tag(p.lang,term)
            if not paginated:
                groups[(p.lang,"tag",norm(target))].append((url,term))
        elif "/category/" in url and url.startswith("/blog/"):kind="category"
        elif re.fullmatch(r"/blog/(?:fa|en)/[^/]+/",url) and not url.endswith(("/tags/","/categories/")):kind="article"
        elif url.startswith("/blog/"):kind="listing"
        else:kind="core"
        # Pagination represents a continuation, not a competing primary destination.
        if not paginated and kind=="article":
            groups[(p.lang,"article",focus(title))].append((url,title))
        rows.append({"url":url,"lang":p.lang,"title":title,"h1":heading,"kind":kind,"paginated":paginated,"term":term})
    candidates=[]
    for (lang,kind,key),items in sorted(groups.items()):
        if len(items)<2 or not key:continue
        urls=[u for u,t in items]
        if kind=="tag":
            preferred=next((u for u,t in items if norm(t)==key),None)
            candidates.append({"lang":lang,"type":"synonym_tag","focus":key,"urls":urls,"preferred_url":preferred})
        else:
            candidates.append({"lang":lang,"type":"article_focus","focus":key,"urls":urls,"preferred_url":None})
    return {"scope":"local","ranking_verified":False,"pages":len(rows),
            "articles":sum(r["kind"]=="article" for r in rows),"candidates":candidates,
            "rows":rows}
