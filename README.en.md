# RUNUP Main Site · site-www

English · [中文](README.md)

Website project for `paobu.org`: a photoreal satellite-Earth home, a catalogue of classic marathon and trail races, route detail pages, cross-site search, an about page, and a local 404. Route content comes from `marathon-trail-running-races`; knowledge and tool entities come from `running-handbook`; shared layouts, themes, i18n, routing, and content validation come from the versioned artifact built by `paobu-core`.

## Current State

- **The local repository restructure was completed on 2026-11-25.** This repository no longer maintains `packages/core`; the shared core is now the standalone `paobu-core`, and all three sites consume `file:vendor/paobu-core.tgz`.
- The content gate passes: **160 entities** (52 routes, 90 knowledge, 18 tools), **959 sources**, **5,389 claims**, and **43 tool cases**.
- Local production build: **115** static HTML pages, **112** hosting pages, **320** Pagefind records, and **112** sitemap URLs. `check:production` passes (route=52 / knowledge=90 / tool=18).
- Local QA passes: 360-page crawl, Chromium 48-screenshot UI matrix with 0 axe violations, performance budgets, 8 fault checks, 11 track checks, 11 cross-site checks, and 18 PWA checks.
- **The live `https://paobu.org/` now serves the 2026-11-25 build**: it was built and deployed from `main` at `873085d`, and `/routes/utnh/` returns 200. All **360** sitemap URLs across the three sites returned 200 in the live crawl.
- Before production release, all three sites must use the same `@paobu/core` version and SHA-256, with the three site origins and `PREVIEW_UNREVIEWED=0` set explicitly.

## Technical Baseline

- Node.js `>=22.23.4 <25`, pnpm 10.18.3, Astro 7.4.2, TypeScript 5.9.3.
- `output: 'static'`, trailing-slash directory output, canonical origin `https://paobu.org`.
- CesiumJS 1.146.0 is the only 3D engine; `vite-plugin-cesium` only participates in the build, and runtime assets are copied to `public/cesium/` by `scripts/prepare-content.mjs`.
- The home uses the local NASA Blue Marble base texture; route detail pages overlay the keyless EOX Sentinel-2 cloudless public tiles and fall back to the local texture on failure.
- Pagefind 1.5.2 builds the cross-site index after the build, loaded per page language.
- Playwright 1.64.1 and axe-core 4.14.0 are pinned in devDependencies; browser acceptance uses Playwright-managed browsers rather than a hard-coded local Chrome path.
- `@paobu/core` **0.3.3** from `vendor/paobu-core.tgz`; `core.lock.json` records SHA-256 `8fdc28f59aab3bdabf908a4b83a405f2c39d7130df0afbc1eca5fd15e94968ae`.

## Layout

```text
src/pages/                [...locale] home, route list/detail, search, about, and 404
src/client/globe.ts       Cesium globe, route anchors, camera, and fallback
src/lib/                  Site content loading and view formatting
scripts/prepare-content   Copies Cesium runtime and checks local textures
scripts/sync-core.mjs     Verifies and syncs the core tgz from ../paobu-core/core-dist
scripts/postbuild         Pagefind index, aggregate records, release files, static output checks
.github/workflows/        Pages build/deploy (the core release workflow lives in paobu-core)
vendor/paobu-core.tgz     Locked core artifact (gitignored; rebuilt by core:sync before install)
core.lock.json            Core artifact version and SHA-256
content.lock.json         Local tree lock for the two content repositories
```

## Local Run

All six projects live under one parent directory. First ensure `paobu-core` has produced `core-dist/paobu-core-0.3.3.tgz`, then sync the core and install:

```bash
cd paobu-core
node scripts/pack-core.mjs

cd ../site-www
node scripts/sync-core.mjs
pnpm install
pnpm prepare-content
pnpm test:content
pnpm check
pnpm build
pnpm dev
```

- Development: `http://localhost:4321`, language entries `/` and `/en/`.
- Preview build: `pnpm preview`, `http://localhost:4421`.
- Build: `pnpm build` prepares Cesium assets, runs the Astro static build, then Pagefind post-processing; missing textures or failed content validation abort the build.
- Type check: `pnpm check`.
- Unit tests: `pnpm test` (`tsx --test tests/*.ts`), covering cross-site body links, CJK/pinyin/number search helpers, acceptance-query contracts, license fields, legal pages, and banned AI/editorial-desk wording.
- Review preparation: `pnpm review:packet` generates bilingual summaries, sources, content digests, and missing-gate reports.

Content directories can be redirected with `PAOBU_REPOS_DIR`, or individually with `ROUTES_CONTENT_DIR`, `KNOWLEDGE_CONTENT_DIR`, and `TOOLS_CONTENT_DIR`. Production builds must ensure the effective env file has `PREVIEW_UNREVIEWED=0` or leaves it unset.

### Browser and Release Acceptance

The scripts need the three preview servers (4421/4422/4423); cross-site checks also need the dev servers 4321/4322/4323. Install browsers first:

```bash
pnpm exec playwright install chromium firefox webkit
pnpm qa:ui          # Chromium by default; QA_BROWSER=firefox|webkit switches
pnpm qa:perf        # Lab performance and budget assertions
pnpm qa:faults      # WebGL disabled, Save-Data, low memory, imagery failure, restricted storage/cookie
pnpm qa:track       # Slow-track notice, 30-second timeout, and cancellation
pnpm qa:cross-site  # Cross-site theme, language, refresh, back, and restricted cookie
pnpm qa:pwa         # Production build only: service worker, cache, and offline fallback
pnpm qa:crawl       # Crawl all public pages in the three sitemaps
```

Results go to `evidence/<date>/ui/`, `perf/`, `track/`, `cross-site/`, `pwa/`, and `local-acceptance/`. On Windows, `qa:perf` uses the local GPU through `--use-angle=d3d11 --enable-gpu`; other platforms use `--enable-gpu`. WebKit without `OffscreenCanvas` degrades by design; real phone GPU, real screen reader, and real Safari still need separate runs.

### Production Build

```bash
PUBLIC_ROUTES_ORIGIN=https://paobu.org \
PUBLIC_KNOWLEDGE_ORIGIN=https://learn.paobu.org \
PUBLIC_TOOLS_ORIGIN=https://tools.paobu.org \
PREVIEW_UNREVIEWED=0 pnpm build
pnpm check:production
```

After all three sites are built, run from the handoff root:

```bash
node scripts/content-lock.mjs
node scripts/release-bundle.mjs
PAOBU_EVIDENCE_DATE=2026-11-25 node scripts/verify-release.mjs
```

`release-bundle.json` records the sites, content locks, coreVersion, and siteBundleId; `verify-release` checks CNAME, `.nojekyll`, robots, sitemap, release manifest, PWA files, canonical, and hreflang. These are local artifact checks, not a Pages deployment.

## Shared Core Flow

Core source changes only in `paobu-core`:

```bash
cd paobu-core
node scripts/pack-core.mjs

cd ../site-www && node scripts/sync-core.mjs && pnpm install
cd ../site-knowledge && node scripts/sync-core.mjs && pnpm install
cd ../site-tools && node scripts/sync-core.mjs && pnpm install
```

`pack-core.mjs` produces `core-dist/paobu-core-<version>.tgz`, its `.sha256`, and `core-dist/core.lock.json`; each site's `sync-core.mjs` verifies the hash, copies the same artifact to `vendor/paobu-core.tgz`, and updates `core.lock.json`. Dependencies use `file:vendor/paobu-core.tgz`, never `workspace:*`, and core source is not copied. Keep older tgz artifacts for rollback.

## Content Lock

Run from the handoff root:

```bash
node scripts/content-lock.mjs          # Regenerate all three sites' content.lock.json
node scripts/content-lock.mjs --verify # Verify the content trees are unchanged
```

The lock uses `sha256-tree-v1` over:

- `marathon-trail-running-races`: `content/`, `data/`, `assets/`;
- `running-handbook`: `knowledge/{content,data,assets}` and `tools/{content,data,assets}`.

The `commit` field pins a full SHA; currently route repo `7cc63ab7…` and handbook `1e008e39…`. The lock is for reproducible local builds and does not replace Git version control.

## AdSense

AdSense site verification uses the meta tag: every page emits `google-adsense-account` in `<head>`; content pages load the ad script, and the production build writes root `ads.txt` from `PUBLIC_ADSENSE_CLIENT`. The home delays the script by 8 seconds after the globe stabilizes; search, 404, and legal pages do not load ads.

- All three sites use publisher `ca-pub-0088997035636558` and ad unit `1813332933`.
- Ads appear only at the bottom of the page, above the footer; manual responsive units hide when unfilled; Auto ads, anchors, interstitials, and in-article automatic ads are not enabled.
- Preview builds and missing variables render no ads.
- EEA/UK/Swiss traffic needs a certified consent management platform in AdSense Privacy & messaging; otherwise use non-personalized ads or pause ads in those regions.
- Local network tests returned `unfilled`; the code, `ads.txt`, and responsive attributes are live, but site review and ad-unit status still need confirmation in AdSense.
- AdSense reporting is not analytics; use a privacy-friendly analytics service for traffic measurement.

## External Configuration and Release Boundary

- The site uses real static paths and does not depend on server-side SSR, runtime secrets, or custom response headers.
- Cross-subdomain links are controlled by `PUBLIC_ROUTES_ORIGIN`, `PUBLIC_KNOWLEDGE_ORIGIN`, and `PUBLIC_TOOLS_ORIGIN`; production defaults live in the core, while the local `.env` points to the three local ports.
- Route close-ups use EOX Sentinel-2 cloudless public tiles and require no map API key; third-party tile terms, availability, and quotas must be reviewed before release.
- All six repositories have been created or renamed under `paobuorg` and pushed. Each site's Pages workflow builds from its own `main`; the shared core is downloaded from the `paobu-core` `core-v0.3.3` Release and verified against its SHA-256.

## License

- Website code: MIT.
- Route, knowledge, and tool content: each repository's license; newly written prose is CC BY 4.0.
- NASA Blue Marble textures are used with attribution under NASA media usage terms and are not CC BY 4.0; see `public/textures/README.md`.
- Third-party dependencies and fonts retain their own licenses.

Last reviewed: 2026-11-25.
