# Local acceptance report — 2026-10-28 brand release

Date: 2026-10-28  
Scope: the three production builds under `repos/site-www/dist`, `repos/site-knowledge/dist` and `repos/site-tools/dist`, including the 跑起来 / RUNUP rebrand, 豆客 mascot, PWA icons and the optional AdSense slot

## Result

Local acceptance **passes** for the 79-entity production set, and the brand release is live on the three custom domains.

- Content: 79 entities / 158 bilingual versions (routes 16, knowledge 51, tools 12); 66 sources; 26 tool cases; 158 AI-assisted editorial approval records; `check:production` passes with route=16, knowledge=51, tool=12.
- Production artifacts: 43/133/31 HTML files; release manifests 40/130/28 hosted HTML pages; Pagefind 158/102/24 records; sitemaps 40/130/28 URLs; no `localhost` URLs in production HTML.
- Release bundle: `8d5a8a736f8c1780b5845678e847f714c78ef89bee3cc4966a0f8990a2fd5dca`; core `0.2.18` (`8aa7eed3…`); content commits `a9316c26…` / `015a4c71…` / `db5aec29…`.
- Live sites: `paobu.org`, `learn.paobu.org` and `tools.paobu.org` all return HTTPS 200 and match siteBundleIds `e77670a1…` / `82fc81b1…` / `b6696aee…`.
- Local crawl: all 198 sitemap pages return 200; canonical, hreflang, noindex absence, title, H1, PWA assets, robots and service worker are present.
- Browser matrix: Chromium, Firefox and WebKit each produced 48 screenshots; 0 axe violations, 0 console errors and 0 failed requests; keyboard 14/14 on four pages; search pagination 25/25; no soft-keyboard overlap.
- Search: 60/60 Chinese and 56/56 English queries rank an expected result in the top five (90% threshold); kind facets total 16/28/12.
- T16: 11/11 budgets, 8/8 fault assertions; article LCP worst 1.328s; desktop globe-ready worst 3.754s; simulated mobile worst 4.609s; CLS 0; about 60fps on the local Intel Arc.
- Cross-site 11/11; track timeout/cancel 11/11; PWA offline 18/18.
- Release check: `release-bundle` and `verify-release` pass for all three sites; the published core asset was downloaded and its SHA-256 recomputed as `8aa7eed3…`.
- SEO audit: all 210 indexable HTML pages have one H1, canonical, x-default and language alternates, Open Graph/Twitter images, rich-result robots directives, parseable JSON-LD and no duplicate titles/descriptions within a site.
- Favicons: `favicon.ico`, 16/32 PNG, SVG and Apple touch icon return 200 on all three domains; social cards return 200.

## Brand and mascot

The public brand is now **跑起来 / RUNUP**. The shared core renders 豆客 (Douke), a bean mascot with 13 expressions: neutral, run, cheer, tired, hydrate, pr, lost, wave, map, book, tool, search and sleep.

- The header and footer use the run expression; routes uses map; knowledge uses book; tools uses tool; the about page shows all 12 scenario cards plus copy; search empty states use search; 404 uses lost; the globe fallback uses tired; the offline page uses sleep.
- `favicon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` and `apple-touch-icon.png` are present on all three sites. PWA manifests use the new names, `start_url: "/"` and `scope: "/"`.
- Every visible old-brand string was replaced in the 50 articles, route source records, contributor display, legal attribution, page titles, metadata, GPX creator and READMEs. All 158 review digests were regenerated; the content validator accepts them.
- Production HTML for all three sites contains no `跑地图` or `RunMap` strings. Article bylines read 跑起来编辑部 / RunUp Editorial.

## AdSense

AdSense is **active** on all three sites with publisher `ca-pub-0088997035636558` and ad unit `1813332933`.

- Verification choice: the AdSense code snippet is the primary method because it both verifies the site and is required to serve ads. The `google-adsense-account` meta tag is also emitted, and production builds generate `ads.txt`; all three live domains return the correct `ads.txt` line.
- Placement: a manual responsive unit below content and above the footer on route/article/glossary/tool detail pages, the routes list, knowledge home/article list/topics/glossary, tools home and about. Search, 404 and legal pages do not render an ad unit. Auto ads, anchor ads and vignette formats are not used.
- The slot uses `data-ad-format="auto"` and `data-full-width-responsive="true"`; it hides itself when unfilled. Production HTML contains the expected script, meta tag and slot on ad pages.
- Privacy: the live legal pages now disclose Google AdSense, cookies/partners and Google Ads Settings.
- A local-network Playwright check returned `unfilled` on desktop, mobile and a detail page, with no console errors or horizontal overflow. That is a Google fill result, not a layout failure; account/site approval, ad-unit status or regional no-fill still need checking in AdSense and from the target region.
- AdSense is not a replacement for site analytics. Ad blockers, consent refusal and unfilled requests make its reports incomplete.

## Remote deployment

The six public repositories are under `paobuorg`. `@paobu/core@0.2.18` is published as a Release with SHA-256 `8aa7eed3…`; both child repositories use that asset and the same SHA in `PAOBU_CORE_ARTIFACT_URL` / `PAOBU_CORE_SHA256`.

The three AdSense-enabled Pages workflows completed successfully:

- `https://paobu.org/` — code commit `a206739c…`, siteBundleId `e77670a1…`
- `https://learn.paobu.org/` — code commit `4d2d6cea…`, siteBundleId `82fc81b1…`
- `https://tools.paobu.org/` — code commit `9c594633…`, siteBundleId `b6696aee…`

All three live release manifests report core 0.2.18 at `8aa7eed3…` and content commits `a9316c26…` / `015a4c71…` / `db5aec29…`, matching the local bundle `8d5a8a73…`.

Remote caveats:

1. A real remote rollback drill has not been performed for 0.2.18. The earlier local artifact drill covered 0.2.11 → 0.2.10 → 0.2.11.
2. AdSense is active, but Google returned `unfilled` in the local-network check. Consent configuration, site/ad-unit approval and target-region fill remain external.
3. Real screen readers, physical phones, real Safari, third-party EOX tile SLA and formal high-resolution imagery remain outside this verification.

## Known limits

- The AI-assisted review is not independent or professional medical/nutrition/coaching review. The user accepted this for the current content pass and asked not to require human review.
- The 16-route, nine-topic, 51-knowledge-entity and 12-tool set is covered. Future depth is a separate reviewed batch.
- Real screen readers, physical phones, real Safari, third-party EOX tile SLA, formal high-resolution imagery and field p75 remain unverified.
