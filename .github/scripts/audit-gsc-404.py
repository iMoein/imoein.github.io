"""Read-only audit of the actual Search Console Not found (404) CSV export."""
import argparse
import csv
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import quote, urlsplit, urlunsplit

HOSTS = {"imoein.com", "www.imoein.com"}

def load_export(directory):
    directory = Path(directory)
    with (directory / "Metadata.csv").open(encoding="utf-8-sig", newline="") as fh:
        metadata = {r["Property"].strip(): r["Value"].strip() for r in csv.DictReader(fh)}
    if metadata.get("Issue", "").casefold() != "not found (404)":
        raise ValueError("Expected GSC Not found (404) report, got: " + repr(metadata.get("Issue")))
    rows = []
    seen = set()
    with (directory / "Table.csv").open(encoding="utf-8-sig", newline="") as fh:
        for row in csv.DictReader(fh):
            url = row["URL"].strip()
            u = urlsplit(url)
            if u.scheme not in {"http", "https"} or u.netloc.lower() not in HOSTS or u.fragment:
                raise ValueError("Unexpected URL in report: " + url)
            if url not in seen:
                seen.add(url)
                rows.append({"url": url, "lastCrawled": row.get("Last crawled", "")})
    if not rows:
        raise ValueError("No URLs in the report")
    return rows

def probe(row):
    url = row["url"]
    p = urlsplit(url)
    safe = urlunsplit((p.scheme, p.netloc, quote(p.path, safe="/%:@!$&'()*+,;=-._~"), quote(p.query, safe="=&%+;:/?"), ""))
    result = subprocess.run(["curl", "-sS", "--max-time", "20", "--max-redirs", "0", "-o", "/dev/null",
                             "-w", "%{http_code}\n%{redirect_url}", safe], capture_output=True, text=True)
    if result.returncode:
        return {**row, "error": result.stderr.strip(), "decision": "manual-review"}
    status, _, target = result.stdout.partition("\n")
    code = int(status)
    return {**row, "status": code, "redirectTarget": target or None,
            "decision": "manual-review", "hint": (
                "confirm removed content and absence of relevant replacement" if code in {404, 410}
                else "verify meaning and canonical destination" if 300 <= code < 400
                else "verify current indexability and last-crawl date" if code == 200
                else "investigate response")}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("export_dir", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    rows = load_export(args.export_dir)
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(probe, rows))
    args.output.write_text(json.dumps({"source": "GSC Not found (404) export", "count": len(rows),
                                       "results": results}, ensure_ascii=False, indent=2) + "\n")
    print(f"Audited {len(results)} report URLs; every decision requires review.")

if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError) as error:
        raise SystemExit(str(error))
