# Local upload-readiness report

Date: 2026-10-27  
Scope: the three production builds under `repos/site-www/dist`, `repos/site-knowledge/dist` and `repos/site-tools/dist`

## Result

Local acceptance **passes** for the complete reviewed launch set. The six public repositories and the core release were uploaded after this run; Pages, DNS and HTTPS remain unconfigured, so no live-site claim is made.

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

## Remote upload status

The six public repositories were created under `paobuorg` and the initial commits were pushed. The `core-v0.2.13` release is published with the tgz, sha256 and core.lock assets, and the `PAOBU_CORE_ARTIFACT_URL` / `PAOBU_CORE_SHA256` variables are set on both subsites. Remote details are in [remote-status.json](../release/remote-status.json).

Pages has **not** been enabled and there is no successful deployment. Bootstrap Pages runs triggered by the final push failed because Pages was not enabled; those runs were cancelled/deleted and Actions is paused until Pages/DNS is ready. DNS, HTTPS and custom domains are not configured, so this report does not claim a live site.

1. Enable GitHub Pages for the three site repositories when custom-domain DNS is ready.
2. Run the three Pages workflows and verify the custom-domain HTTPS redirect and cross-site links.
3. Perform a real remote rollback drill; the earlier local artifact drill covered 0.2.11 → 0.2.10 → 0.2.11 and has not been repeated for 0.2.13.
4. Keep the existing `paobuorg/www` repository untouched unless its ownership is explicitly clarified.

## Known limits

- The AI-assisted review is not independent or professional medical/nutrition/coaching review. The user accepted this for the current first content pass and asked not to require human review.
- The 16-route, nine-topic, 24-knowledge-entity and eight-tool launch set is covered. Future depth is a separate reviewed batch.
- Real screen readers, physical phones, real Safari, third-party EOX tile SLA, formal high-resolution imagery and field p75 remain unverified.
