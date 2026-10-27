# RunMap main site · site-www

[中文](README.md) · English

The site project for `paobu.org`: a real satellite-Earth home page, a catalogue of classic road marathons and trail races, route detail pages, aggregate search across all three sites, an about page and a local 404. Content comes from `running-routes`; knowledge and tool entities are also read for related links and aggregate search.

This repository also maintains the shared core in `packages/core` (`@paobu/core`) and publishes a versioned tgz artifact to the two subsites. The subsites never copy the core source.

## Status

- The main site is deployed on GitHub Pages at `https://paobu.org/`; the legacy `www` repository was backed up and deleted, and Pages/HTTPS are enabled.
- Local search acceptance passes: 60/60 Chinese and 56/56 English queries rank an expected result in the top five; filter totals, local search and cross-site retrieval also pass. This covers the local preview indexes only, not a deployed index.
- The T15 browser matrix passes locally on the final 2026-10-27 production build: Chromium 156.0.8078.4, Firefox 157.0 and WebKit 27.2 each produced 48 screenshots at 1440×900 / 390×844 (6 pages × 2 locales × 2 themes × 2 viewports), with 0 axe violations and 0 console errors or failed requests; 60 width checks from 320–1920px and 6 approximate-200% zoom checks had no horizontal overflow; keyboard focus is 14/14 on four pages, and ≥44px key controls, the AX tree, 25/25 search pagination, zero soft-keyboard overlap, long titles and reduced motion pass. The route page waits for globe/close-up tiles before hiding the poster, and the mobile canvas fills its card. WebKit 27.2 lacks `OffscreenCanvas`, so it correctly falls back to the poster and text explanation without running Cesium; real Safari, a real screen reader and physical devices remain outstanding.
- T16 laboratory checks pass: article LCP median 1.032s / worst 1.200s with CLS 0; globe-ready median 3.547s / worst 3.632s on desktop (4s budget) and 4.372s / 4.389s under simulated mobile (6s budget); about 60fps on hardware-accelerated Chromium (Intel Arc); non-map 18,106B gzip, engine 1,347,806B gzip, texture 266,599B, map index 1,272B; all 11 budgets and fault assertions pass. These are not field p75 values or a physical-phone GPU result.
- Route detail uses the public, no-key EOX Sentinel-2 cloudless tile service for close-up imagery, with attribution shown on the map, retries and a local NASA fallback if tiles fail. The home page keeps the local NASA base layer. The public tile service's availability, terms and quotas are not guaranteed by this project and still need real-network/SLA review.
- T17 local release preparation exists: each site emits `CNAME`, `.nojekyll`, `robots.txt`, a sitemap built from public pages, `release-manifest.json`, the PWA manifest, `sw.js` and an offline page. `scripts/release-bundle.mjs` and `scripts/verify-release.mjs` check that all three sites use the same core/content locks and hosting files. Production mode exposes all 48 entities (96/48/16 search records and 38/74/18 sitemap URLs), and `pnpm check:production` passes. The current release bundleId is `9aab069d…`.
- Pages and core-release workflows are present under `.github/workflows/`; all three Pages workflows succeeded and the three custom domains enforce HTTPS. The legacy `paobuorg/www` repository was backed up and deleted.
- All 48 entities were **AI-assisted editorially reviewed** and published on 2026-10-27; all 96 language versions have an `approve` record and a matching contentDigest. The reviewer is `runmap-editorial` and is explicitly labelled AI-assisted, not independent or professional medical, nutrition or coaching review; limitations are in [ai-review-report.md](evidence/2026-10-27/review/ai-review-report.md). The local `.env` still sets `PREVIEW_UNREVIEWED=1`, so dev/preview builds show the banner; production builds do not.
- The home page uses CesiumJS 1.146.0 with the local NASA Blue Marble base texture; route detail adds public, no-key EOX Sentinel-2 cloudless tiles. Neither needs a 3D online service or map key, but close-up tiles depend on a third-party public service.

## Technical baseline

- Node.js `>=22.23.4 <25`, pnpm 10.18.3, Astro 7.4.2, TypeScript 5.9.3.
- `output: 'static'` with directory-style trailing slashes; canonical origin `https://paobu.org`.
- Cesium 1.146.0 is the only 3D engine. `vite-plugin-cesium` participates in the build only; `scripts/prepare-content.mjs` copies runtime assets into `public/cesium/`.
- Pagefind 1.5.2 builds the aggregate three-site index after the static build; the indexes are loaded by page language.
- Playwright 1.64.1 and axe-core 4.14.0 are pinned in devDependencies; browser checks use Playwright-managed Chromium, Firefox and WebKit rather than a hard-coded local browser path.
- Core version 0.2.14, artifact SHA-256 `1fcda15d29b7e1de0240ea8b6061f92fc8dc7887a2469c85a3011584bd2bcd89`.

## Layout

```text
packages/core/            Shared layouts, components, theme, i18n, routing and content validation
src/pages/                [locale] home, route list/detail, search, about and 404
src/client/globe.ts       Cesium globe, route anchors, camera and fallback
src/lib/                  Site content loading and view formatting
scripts/prepare-content   Copies the Cesium runtime and checks the local texture
scripts/pack-core         Packs the shared core with pnpm and writes SHA-256 locks
scripts/postbuild         Pagefind index, aggregate records, release files and static-output checks
.github/workflows/        Pages build/deploy and shared-core release definitions
public/textures/          NASA Blue Marble texture and attribution notes
core-dist/                Core tgz and core.lock.json (local build output, gitignored)
content.lock.json         Local source-tree digest lock for the three content repos
```

## Local use

The six projects should sit in the same parent directory (the default resolves `../running-*`). First install:

```bash
cd site-www
pnpm install
pnpm prepare-content
pnpm core:pack
pnpm test:content
pnpm check
pnpm build
pnpm dev
```

- Development: `http://localhost:4321`, with `/` and `/en/` entry points.
- Built preview: `pnpm preview`, `http://localhost:4421`. Cross-site links are baked from the `.env` that is actually loaded (currently the development ports 4322/4323), so following them locally also needs those sites running; a production build must explicitly override all three origins, otherwise the localhost values enter the HTML.
- Build: `pnpm build` prepares Cesium assets, runs the Astro static build and then Pagefind. A missing texture or failed content validation stops the build.
- Content validation: `pnpm test:content`.
- Type and Astro checks: `pnpm check`.
- Unit tests: `pnpm test` (`tsx --test tests/*.ts`), currently 13 tests covering cross-site body links, CJK/pinyin/number search helpers and the acceptance-query contract. Browser acceptance queries live in `tests/search-acceptance.json`.
- T14 review preparation: `pnpm review:packet` writes bilingual summaries, sources, content digests and missing gates. All 48 entities now have AI-assisted editorial review records; coverage is 16/16 routes, 9/9 knowledge topics and 8/8 tools.

Content directories can be relocated with `PAOBU_REPOS_DIR`, or overridden individually with `ROUTES_CONTENT_DIR`, `KNOWLEDGE_CONTENT_DIR` and `TOOLS_CONTENT_DIR`. A production build must have `PREVIEW_UNREVIEWED=0` or unset in the environment file that is actually loaded. The local `.env` currently sets `1`; change or remove it before release instead of relying on the shell variable being absent.

### Browser checks

The T15/T16/T17 scripts need all three built previews (4421/4422/4423); cross-site checks also need the dev servers on 4321/4322/4323. Install browsers once:

```bash
cd site-www
pnpm exec playwright install chromium firefox webkit
pnpm qa:ui      # Chromium by default; QA_BROWSER=firefox|webkit selects another browser
pnpm qa:perf    # T16 laboratory performance and budget assertions
pnpm qa:faults  # WebGL-disabled, Save-Data, low memory, imagery failure, restricted storage/cookies
pnpm qa:track   # track slow hint, 30s timeout and cancel states
pnpm qa:cross-site # theme, locale, reload, back and cookie-restricted cross-site flow
pnpm qa:pwa     # production builds only: service worker, cached page and offline fallback
pnpm qa:crawl   # crawl every sitemap URL on all three sites and check canonical/hreflang/noindex/assets
```

Results go to `evidence/<date>/ui/`, `ui-firefox/`, `ui-webkit/`, `perf/`, `track/`, `cross-site/` and `pwa/`. On Windows, `qa:perf` uses the local GPU through `--use-angle=d3d11 --enable-gpu`; other platforms use `--enable-gpu`. WebKit 27.2 lacks `OffscreenCanvas`, so the globe falls back by design; a physical-phone GPU, a real screen reader and real Safari still need separate runs.

### Local release preparation

Production-mode checks (all 48 entities are published, so the content guard should pass). The local `.env` development origins must not leak into production, so override all three origins for a release build:

```bash
pnpm core:pack
PUBLIC_ROUTES_ORIGIN=https://paobu.org \
PUBLIC_KNOWLEDGE_ORIGIN=https://learn.paobu.org \
PUBLIC_TOOLS_ORIGIN=https://tools.paobu.org \
PREVIEW_UNREVIEWED=0 pnpm build
pnpm check:production   # currently prints route=16, knowledge=24, tool=8
```

After all three sites have production builds, from the handoff root:

```bash
node scripts/release-bundle.mjs
PAOBU_EVIDENCE_DATE=<date> node scripts/verify-release.mjs
```

`release-bundle.json` records the sites, content locks, coreVersion and siteBundleId. `verify-release` checks CNAME, `.nojekyll`, robots, sitemap, release manifests, PWA files, canonical URLs and hreflang. Current successful evidence is in [release-check.json](evidence/2026-10-27/release/release-check.json). These are local artifact checks, not a Pages deployment. The evidence came from production-mode builds; rebuild the current preview `dist/` in production mode before rerunning it.

## Shared core workflow

The core source is maintained only in `packages/core`. After a change:

```bash
cd site-www
pnpm core:pack
cd ../site-knowledge && pnpm core:sync && pnpm install --force
cd ../site-tools && pnpm core:sync && pnpm install --force
```

`core:pack` creates `core-dist/paobu-core-<version>.tgz`, its `.sha256` file and `core-dist/core.lock.json`. `core:sync` verifies the hash, copies the same artifact to the subsite's `vendor/paobu-core.tgz` and updates that site's `core.lock.json`. Subsites depend on `file:vendor/paobu-core.tgz`, not `workspace:*`, and never copy the source. Older tgz files are kept for rollback.

When the core version changes, sync both subsite lock files and confirm the installed version and hash before release.

## Content locks

From the handoff root:

```bash
node scripts/content-lock.mjs          # regenerate content.lock.json for all three sites
node scripts/content-lock.mjs --verify # check that the content trees are unchanged
```

The `sha256-tree-v1` lock covers `content/`, `data/` and `assets/` in all three content repositories. The six repositories currently have no Git commits, so each lock records `commit: null`; replace it with a pinned full SHA once commits and remotes exist. The lock supports reproducible local builds and does not replace version control.

## External configuration and release boundary

- The site uses real static paths and depends on no server-side rendering, runtime secret or custom response header.
- Cross-site links use `PUBLIC_ROUTES_ORIGIN`, `PUBLIC_KNOWLEDGE_ORIGIN` and `PUBLIC_TOOLS_ORIGIN`; production defaults are baked into the core and the local `.env` points to the three local ports.
- Route close-ups currently use the public EOX Sentinel-2 cloudless tile service and do not read any map API key; the home page and fallback keep the local NASA texture. Third-party tile terms, availability and quotas need review before release.
- The GitHub owner, repository access, DNS and Pages settings are not available. `.github/workflows/pages.yml` and `core-release.yml` are local workflow definitions that have not run on GitHub; subsite workflows require the `PAOBU_CORE_ARTIFACT_URL` and `PAOBU_CORE_SHA256` repository variables. Do not describe the local build as a live site.

## Licence

- Site code: MIT.
- Route, knowledge and tool content: under each repository's licence; new text is CC BY 4.0.
- The NASA Blue Marble texture is used with attribution under NASA media usage guidelines and is not relicensed under CC BY 4.0; see `public/textures/README.md`.
- Third-party dependencies and fonts keep their own licences.

Last checked: 2026-10-27.
