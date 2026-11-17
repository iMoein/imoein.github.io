# Local performance baseline

Run from the website repository root:

    node .github/scripts/measure-cwv.cjs /tmp/imoein-cwv.json

Requires Node with global WebSocket and Chrome. Set CHROME_BIN for a different Chrome installation.
Optional arguments after the output filename select individual site paths.

The stage 24 snapshot contains cold-cache mobile laboratory measurements from an isolated Chrome instance, with external requests blocked. These are not Lighthouse scores, CrUX results, or field INP measurements. Each scenario has one observation. The final comparison combines the loader rerun and the targeted portrait rerun. Repeat with multiple runs before establishing timing budgets. Production validation must include the real CDN, external fonts and real user interaction.

The loader regression tests run during Pages artifact preparation; variable laboratory timings are not hard CI gates.

## Stage 28 asset optimization

Run npm ci --prefix .github/performance, then node --test .github/performance/test-optimize-assets.cjs. Run node .github/performance/optimize-assets.cjs against an isolated copy of the Pages artifact only. The GitHub workflow validates the original artifact, optimizes the allowlisted CSS/JS with pinned esbuild, and validates again before upload. Editable source, URLs, load order, vendor font CSS and licenses are retained. Raw and gzip sizes in stage28-assets.json are file totals, not measured network throughput.

## Stage 29 cache revisions

After minification, run python3 .github/performance/version-assets.py ARTIFACT followed by the same command with --check. The final content hash is appended as rev, retaining existing version parameters. Run the regression tests in test-version-assets.py. Only artifact HTML references are changed; original source and paths are retained. Mutable data requests revalidate using cache:no-cache. See cloudflare-cache.md and stage29-cache.json for live audit and dashboard recommendations.
