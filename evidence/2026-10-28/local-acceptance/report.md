# Local acceptance report — 2026-10-28 brand release

Date: 2026-10-28  
Scope: the three production builds under `repos/site-www/dist`, `repos/site-knowledge/dist` and `repos/site-tools/dist`, including the 跑起来 / RUNUP rebrand, 豆客 mascot, PWA icons and the optional AdSense slot

## Result

Local acceptance **passes** for the 79-entity production set, and the brand release is live on the three custom domains.

- Content: 79 entities / 158 bilingual versions (routes 16, knowledge 51, tools 12); 66 sources; 26 tool cases; 158 AI-assisted editorial approval records; `check:production` passes with route=16, knowledge=51, tool=12.
- Production artifacts: 43/133/31 HTML files; release manifests 40/130/28 hosted HTML pages; Pagefind 158/102/24 records; sitemaps 40/130/28 URLs; no `localhost` URLs in production HTML.
- Release bundle: `510b233fa8db10125acc678bac5d219a24fa7832b2da5bb3031f65fb24ee344e`; core `0.2.16` (`8b0e47ba…`); content commits `a9316c26…` / `015a4c71…` / `db5aec29…`.
- Live sites: `paobu.org`, `learn.paobu.org` and `tools.paobu.org` all return HTTPS 200 and match siteBundleIds `12355d5b…` / `2a0a6dc1…` / `168f558c…`.
- Local crawl: all 198 sitemap pages return 200; canonical, hreflang, noindex absence, title, H1, PWA assets, robots and service worker are present.
- Browser matrix: Chromium, Firefox and WebKit each produced 48 screenshots; 0 axe violations, 0 console errors and 0 failed requests; keyboard 14/14 on four pages; search pagination 25/25; no soft-keyboard overlap.
- Search: 60/60 Chinese and 56/56 English queries rank an expected result in the top five (90% threshold); kind facets total 16/28/12.
- T16: 11/11 budgets, 8/8 fault assertions; article LCP worst 1.328s; desktop globe-ready worst 3.754s; simulated mobile worst 4.609s; CLS 0; about 60fps on the local Intel Arc.
- Cross-site 11/11; track timeout/cancel 11/11; PWA offline 18/18.
- Release check: `release-bundle` and `verify-release` pass for all three sites; the published core asset was downloaded and its SHA-256 recomputed as `8b0e47ba…`.

## Brand and mascot

The public brand is now **跑起来 / RUNUP**. The shared core renders 豆客 (Douke), a bean mascot with 13 expressions: neutral, run, cheer, tired, hydrate, pr, lost, wave, map, book, tool, search and sleep.

- The header and footer use the run expression; routes uses map; knowledge uses book; tools uses tool; the about page shows all 12 scenario cards plus copy; search empty states use search; 404 uses lost; the globe fallback uses tired; the offline page uses sleep.
- `favicon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` and `apple-touch-icon.png` are present on all three sites. PWA manifests use the new names, `start_url: "/"` and `scope: "/"`.
- Every visible old-brand string was replaced in the 50 articles, route source records, contributor display, legal attribution, page titles, metadata, GPX creator and READMEs. All 158 review digests were regenerated; the content validator accepts them.
- Production HTML for all three sites contains no `跑地图` or `RunMap` strings. Article bylines read 跑起来编辑部 / RunUp Editorial.

## AdSense readiness

The AdSense slot is **off by default** and was not active in this deployment.

- Verification choice: the AdSense code snippet is the primary method because it both verifies the site and is required to serve ads. A `google-adsense-account` meta tag is emitted as a secondary signal when `PUBLIC_ADSENSE_CLIENT` is set. `ads.txt` is a seller-authorisation file, not a substitute for the ad code; production builds generate it from the publisher ID.
- Placement: a manual display unit only, below content and above the footer, on route, article, glossary and tool detail pages. Home, listing, search, about, legal and 404 pages do not render an ad unit. Auto ads, anchor ads and vignette formats are intentionally not used.
- Gating: both `PUBLIC_ADSENSE_CLIENT` and `PUBLIC_ADSENSE_SLOT` are required. Preview builds and builds missing either variable render no ad markup. Current production HTML contains no `adsbygoogle`, `pagead2` or `google-adsense` markup, and `/ads.txt` returns 404.
- Privacy: the legal page switches its privacy paragraph to an AdSense disclosure only when the client variable is set. Activation still requires a Google-certified consent message for EEA/UK/Swiss traffic and a legal review.
- AdSense is not a replacement for site analytics. Ad blockers, consent refusal and unfilled requests make its reports incomplete.

## Remote deployment

The six public repositories are under `paobuorg`. `@paobu/core@0.2.16` is published as a Release with SHA-256 `8b0e47ba…`; both child repositories use that asset and the same SHA in `PAOBU_CORE_ARTIFACT_URL` / `PAOBU_CORE_SHA256`.

The three Pages workflows completed successfully:

- `https://paobu.org/` — code commit `52bdfef0…`, siteBundleId `12355d5b…`
- `https://learn.paobu.org/` — code commit `0058f430…`, siteBundleId `2a0a6dc1…`
- `https://tools.paobu.org/` — code commit `54b0ce1c…`, siteBundleId `168f558c…`

All three live release manifests report core 0.2.16 at `8b0e47ba…` and content commits `a9316c26…` / `015a4c71…` / `db5aec29…`, matching the local bundle `510b233f…`.

Remote caveats:

1. A real remote rollback drill has not been performed for 0.2.16. The earlier local artifact drill covered 0.2.11 → 0.2.10 → 0.2.11.
2. AdSense is not activated; no live ad has been requested or served. Publisher ID, slot ID, consent configuration and approval are still external.
3. Real screen readers, physical phones, real Safari, third-party EOX tile SLA and formal high-resolution imagery remain outside this verification.

## Known limits

- The AI-assisted review is not independent or professional medical/nutrition/coaching review. The user accepted this for the current content pass and asked not to require human review.
- The 16-route, nine-topic, 51-knowledge-entity and 12-tool set is covered. Future depth is a separate reviewed batch.
- Real screen readers, physical phones, real Safari, third-party EOX tile SLA, formal high-resolution imagery and field p75 remain unverified.
