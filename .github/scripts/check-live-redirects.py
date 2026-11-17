#!/usr/bin/env python3
"""Read-only post-release verification for the public redirect contract."""
import subprocess
from concurrent.futures import ThreadPoolExecutor

ORIGIN = "https://imoein.com"


def probe(url):
    result = subprocess.run(
        ["curl", "-sS", "-L", "--max-redirs", "8", "--max-time", "20",
         "-o", "/dev/null", "-w", "%{http_code} %{num_redirects} %{url_effective}", url],
        capture_output=True, text=True,
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or str(result.returncode))
    code, hops, final = result.stdout.strip().split(" ", 2)
    return int(code), int(hops), final


def cases():
    for path in ("/", "/en/", "/about.html", "/blog/fa/", "/blog/en/"):
        yield ORIGIN + path, (200, 0, ORIGIN + path)
    for prefix in ("http://imoein.com", "http://www.imoein.com", "https://www.imoein.com"):
        for path in ("/", "/en/?utm_source=redirect-check"):
            yield prefix + path, (200, 1, ORIGIN + path)
    for prefix in (ORIGIN, "http://www.imoein.com", "https://www.imoein.com", "http://imoein.com"):
        for path in ("/home", "/home/", "/home/index.html"):
            yield prefix + path, (200, 1, ORIGIN + "/")
    for path in ("/articles/deactivate-telegram-account/", "/home/unrelated/"):
        yield ORIGIN + path, (404, 0, ORIGIN + path)


def verify(item):
    url, expected = item
    try:
        actual = probe(url)
    except (RuntimeError, ValueError) as error:
        return False, f"FAIL {url}: {error}"
    ok = actual == expected
    return ok, f"{'PASS' if ok else 'FAIL'} {url}: {actual}; expected {expected}"


def main():
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(verify, cases()))
    for _, message in results:
        print(message)
    failed = sum(not ok for ok, _ in results)
    print(f"{len(results)-failed}/{len(results)} passed; {failed} failed.")
    return int(bool(failed))


if __name__ == "__main__":
    raise SystemExit(main())
