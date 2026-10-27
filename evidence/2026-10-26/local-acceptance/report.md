# Local upload-readiness report

> Historical 39-entity round. The final 40-entity acceptance report is [2026-10-27/local-acceptance/report.md](../../2026-10-27/local-acceptance/report.md).

Date: 2026-10-27  
Scope: the three production builds under `repos/site-www/dist`, `repos/site-knowledge/dist` and `repos/site-tools/dist`

## Result

Local acceptance **passes** for the complete reviewed launch set. No remote repository, Pages deployment, DNS change, commit or upload was created.

- Content: 39 entities / 78 bilingual translations published (routes 16, knowledge 15, tools 8); 44 sources; 20 tool cases; 78 AI-assisted editorial approval records; `pnpm check:production` passes.
- Production artifacts: 39/55/19 HTML pages; Pagefind 78/30/16 records; sitemaps 38/54/18 URLs; no `localhost` URLs in production HTML.
- Release bundle: `10a36fca8cc2e2681e3f6209cafce067defcf3bf8e8475c41aa8b84d87062d61`; core `0.2.13` (`b3e5b077…`); content locks match.
- Local crawl: all 110 sitemap pages return 200; canonical, hreflang, noindex absence, title, H1, PWA assets, robots and service worker are present.
- Browser matrix: Chromium/Firefox/WebKit each 48 screenshots; 0 axe violations, 0 console errors, 0 failed requests; keyboard 14/14 on four pages; search pagination fully expands to 24/24; no soft-keyboard overlap.
- T16: 11/11 budgets, 8/8 fault assertions; article LCP worst 1.172s; desktop globe-ready worst 3.681s; simulated mobile worst 4.440s; about 60fps on the local Intel Arc.
- T06/T12/T17: cross-site 10/10, track timeout/cancel 11/11, PWA offline 18/18.
- Handoff: 0 issues, 63 links; handoff tests 46/46; content locks verified.

## Upload prerequisites (not performed)

1. GitHub owner and six repository names/access, plus Pages enabled for the three site repositories.
2. Push order: content repositories → `core-v0.2.13` tag/Release in `site-www` → `site-knowledge` and `site-tools` repository variables `PAOBU_CORE_ARTIFACT_URL` / `PAOBU_CORE_SHA256` → run the Pages workflows.
3. DNS/custom-domain configuration and HTTPS verification remain external release steps; no domain has been changed.
4. A real remote rollback drill has not been performed. The earlier local artifact drill covered 0.2.11 → 0.2.10 → 0.2.11; it has not been repeated for 0.2.13.

## Known limits

- The AI-assisted review is not independent or professional medical/nutrition/coaching review.
- The 16-route, 15-article/nine-topic and eight-tool launch list is covered. The deeper knowledge blueprint contains further questions that should be added as separate reviewed batches rather than bulk-generated.
- Real screen readers, physical phones, real Safari, third-party Esri tile SLA and field p75 remain unverified.
