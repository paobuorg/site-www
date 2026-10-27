# Local upload-readiness report

Date: 2026-10-27  
Scope: the three production builds under `repos/site-www/dist`, `repos/site-knowledge/dist` and `repos/site-tools/dist`

## Result

Local acceptance **passes** for the complete reviewed launch set. The six public repositories, core release and three GitHub Pages sites are live on their custom domains with HTTPS; the old `www` repository has been backed up locally and deleted.

- Content: 48 entities / 96 bilingual versions published (routes 16, knowledge 24, tools 8); 59 sources; 20 tool cases; 96 AI-assisted editorial approval records; `pnpm check:production` passes with route=16, knowledge=24, tool=8.
- Knowledge: 23 articles plus a 17-term glossary, nine topics covered, five learning paths.
- Production artifacts: static builds 42/78/22 pages; release manifests 39/75/19 hosted HTML pages; Pagefind 96/48/16 records; sitemaps 38/74/18 URLs; no `localhost` URLs in production HTML.
- Release bundle: `9aab069d45615225fafdf18fd4a1cbbe20285efd59fdee01848e1cff425c67b3`; core `0.2.13` (`b3e5b077…`); content locks match.
- Local crawl: all 130 sitemap pages return 200; canonical, hreflang, noindex absence, title, H1, PWA assets, robots and service worker are present.
- Browser matrix: Chromium/Firefox/WebKit each 48 screenshots; 0 axe violations, 0 console errors, 0 failed requests; keyboard 14/14 on four pages; search pagination fully expands to 25/25; no soft-keyboard overlap.
- T16: 11/11 budgets, 8/8 fault assertions; article LCP worst 1.200s; desktop globe-ready worst 3.632s; simulated mobile worst 4.389s; about 60fps on the local Intel Arc.
- T06/T12/T17: cross-site 11/11 (production hrefs mapped to the three local preview servers), track timeout/cancel 11/11, PWA offline 18/18.
- Handoff: 0 issues, 63 links; handoff tests 46/46; content locks verified.

## Imagery

Route close-ups use EOX Sentinel-2 cloudless public tiles, a no-key CORS-enabled service, with NASA/EOX/CC BY-NC-SA attribution, three retries and a local NASA Blue Marble fallback. A Boston route check received 66 tile responses with 0 failures and 0 console errors. One earlier Chromium matrix run saw 18 transient EOX connection resets on a single route shot; the final run after adding retries was clean, but the provider remains a third-party dependency. This does not prove the provider's terms, quotas, long-term availability or a formal high-resolution SLA; T08's formal high-resolution imagery remains outstanding.

## Remote deployment status

The six public repositories were pushed under `paobuorg`; `@paobu/core@0.2.13` is published as a Release, and both subsites have `PAOBU_CORE_ARTIFACT_URL` / `PAOBU_CORE_SHA256`. The three Pages workflows completed successfully. GitHub Pages is serving:

- `https://paobu.org/`
- `https://learn.paobu.org/`
- `https://tools.paobu.org/`

All three custom domains have approved certificates and HTTP redirects to HTTPS. A live Chromium smoke test navigated paobu.org → learn → tools → paobu.org, loaded the Boston route map, and returned 25 search results with no console errors or failed requests.

The old `paobuorg/www` repository was backed up to `reference/legacy/www-github-backup-2026-10-27.tar.gz`, its legacy Pages site was removed, and the repository was deleted after the new sites were verified.

Remaining remote caveats:

1. A real remote rollback drill has not been performed. The earlier local artifact drill covered 0.2.11 → 0.2.10 → 0.2.11 and has not been repeated for 0.2.13.
2. Real screen readers, physical phones, real Safari, third-party EOX tile SLA and formal high-resolution imagery remain outside this deployment verification.

## Known limits

- The AI-assisted review is not independent or professional medical/nutrition/coaching review. The user accepted this for the current first content pass and asked not to require human review.
- The 16-route, nine-topic, 24-knowledge-entity and eight-tool launch set is covered. Future depth is a separate reviewed batch.
- Real screen readers, physical phones, real Safari, third-party EOX tile SLA, formal high-resolution imagery and field p75 remain unverified.
