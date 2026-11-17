"""Version same-origin JS/CSS against final artifact bytes, never source paths."""
import hashlib
import html
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit, unquote, parse_qsl, urlencode, urlunsplit, urljoin

TAG = re.compile(r'<(?:script|link)\b[^>]*>', re.I)
ATTR = re.compile(r'\b(src|href)\s*=\s*(["\'])(.*?)\2', re.I)
ROOT = Path(__file__).resolve().parents[2]

def apply(root, check=False):
    root=Path(root).resolve()
    if root == ROOT or (ROOT in root.parents and root != ROOT/'_site'):
        raise ValueError('Use isolated Pages artifact')
    hashes={}
    count=0
    pages=0
    pending={}
    for file in sorted(root.rglob('*.html')):
        if file.is_symlink():raise ValueError(file)
        route='/'+file.relative_to(root).as_posix()
        if route.endswith('/index.html'):route=route[:-10]
        original=file.read_text(encoding='utf-8')
        def tag_replace(m):
            nonlocal count
            tag=m[0]
            if tag.lower().startswith('<link') and not re.search(r'\brel\s*=\s*["\']stylesheet["\']', tag,re.I):
                return tag
            def attr_replace(a):
                nonlocal count
                raw=html.unescape(a[3]);u=urlsplit(raw)
                if u.scheme or u.netloc:return a[0]
                absolute=urlsplit(urljoin('https://imoein.com'+route,raw))
                if not absolute.path.endswith(('.css','.js')):return a[0]
                target=root/unquote(absolute.path).lstrip('/')
                if root not in target.resolve().parents or not target.is_file() or target.is_symlink():
                    raise ValueError(f'Missing or unsafe resource: {file}: {raw}')
                key=target.relative_to(root).as_posix()
                if key not in hashes:hashes[key]=hashlib.sha256(target.read_bytes()).hexdigest()[:16]
                q=[(k,v) for k,v in parse_qsl(u.query,keep_blank_values=True) if k!='rev']
                q.append(('rev',hashes[key]))
                updated=urlunsplit((u.scheme,u.netloc,u.path,urlencode(q),u.fragment))
                count+=1
                if check and raw!=updated:raise ValueError(f'Stale asset revision: {file}: {raw}')
                return a[1]+'='+a[2]+html.escape(updated,quote=True)+a[2]
            return ATTR.sub(attr_replace,tag)
        result=TAG.sub(tag_replace,original)
        if result!=original:pending[file]=result
        if result!=original or check:pages+=1
    if not check:
        for p,s in pending.items():p.write_text(s,encoding='utf-8')
    return {'references':count,'pages':pages,'assets':hashes}

if __name__=='__main__':
    if len(sys.argv)<2:raise SystemExit('version-assets.py ARTIFACT [--check]')
    report=apply(sys.argv[1],check='--check' in sys.argv)
    print(json.dumps(report,indent=2))
