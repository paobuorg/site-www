# Local acceptance report — 2026-10-28 K1/T1 batch

Date: 2026-10-28  
Scope: the three production builds under `repos/site-www/dist`, `repos/site-knowledge/dist` and `repos/site-tools/dist`, including the K1 knowledge and T1 tool batch

## Result

Local acceptance **passes** for the 56-entity launch set. The three public sites are live on their custom domains with HTTPS, and the K1/T1 deployment has been rechecked against the live release manifests.

- Content: 56 entities / 112 bilingual versions published (routes 16, knowledge 28, tools 12); 62 sources; 26 tool cases; 112 AI-assisted editorial approval records; `check:production` passes with route=16, knowledge=28, tool=12.
- Knowledge: 27 articles plus a 17-term glossary, nine topics covered, five learning paths.
- Production artifacts: static builds 42/86/30 HTML files; release manifests 38/82/26 hosted HTML pages; Pagefind 112/56/24 records; sitemaps 38/82/26 URLs; no `localhost` URLs in production HTML.
- Release bundle: `a00bee5d23041407255cfb36380e95d0e18f6dd7c09115fa9445553d1ac616f7`; core `0.2.14` (`1fcda15d…`); content locks match.
- Local crawl: all 146 sitemap pages return 200; canonical, hreflang, noindex absence, title, H1, PWA assets, robots and service worker are present.
- Browser matrix: Chromium/Firefox/WebKit each 48 screenshots; 0 axe violations, 0 console errors, 0 failed requests; keyboard 14/14 on four pages; search pagination fully expands to 25/25; no soft-keyboard overlap. The eight new K1/T1 pages have 0 axe violations in light and dark themes and no mobile overflow.
- Search: 60/60 Chinese and 56/56 English queries rank an expected result in the top five (90% threshold); kind facets total 16/28/12.
- T16: 11/11 budgets, 8/8 fault assertions; article LCP worst 1.524s; desktop globe-ready worst 3.840s; simulated mobile worst 4.895s; about 60fps on the local Intel Arc.
- T06/T12/T17: cross-site 11/11 (production hrefs mapped to the three local preview servers), track timeout/cancel 11/11, PWA offline 18/18.
- Handoff: 0 issues, 63 links; handoff tests 46/46; content locks verified.

## K1 knowledge batch

Four bilingual articles were added: tempo and interval execution, training load and overtraining, heat and humidity, and shoe technology. The first uses effort, talk-test and recent-pace anchors rather than a percentage table; the second separates diagnosis by exclusion from unsupported single-metric formulas; the third centres on heat-illness signs, acclimatisation and event medical support; the fourth limits carbon-plate claims to the reviewed evidence. Three sources were added (PubMed 23016079, PMC12827780, PubMed 28919842). Learning paths now include tempo/interval and heat content where relevant.

## T1 tool batch

Four browser-local tools were added: fueling planner, route elevation, shoe mileage and race checklist. Fueling shows a 30–60 g/h range only above 60 minutes and treats product servings as arithmetic; elevation reports missing elevation as unknown and reports short-segment grade as unknown; shoe mileage uses the user's own reminder threshold and makes no replacement-interval claim; the checklist is rule-based and not medical or mandatory advice. Six cases were added. The tools repository now has 12 entities and 26 cases; site-tools has 38 passing unit tests.

Browser checks: 90 minutes at 25 g per serving shows “45–90 g”; a sample GPX shows 221 m, 100 m gain, 100 m loss, 90.4% maximum grade and 3 profile points; a 10 km shoe entry persists as 110.0 km after reload; a trail checklist produces eight sections including a headlamp. The four pages had no mobile overflow, console errors or failed requests.

## Imagery

Route close-ups use EOX Sentinel-2 cloudless public tiles, a no-key CORS-enabled service, with NASA/EOX/CC BY-NC-SA attribution, three retries and a local NASA Blue Marble fallback. A Boston route check previously received 66 tile responses with 0 failures and 0 console errors. The provider remains a third-party dependency. This does not prove the provider's terms, quotas, long-term availability or a formal high-resolution SLA; T08's formal high-resolution imagery remains outstanding.

## Remote deployment status

The six public repositories are under `paobuorg`; `@paobu/core@0.2.14` is published as a Release, and both subsites have `PAOBU_CORE_ARTIFACT_URL` / `PAOBU_CORE_SHA256`. The three Pages workflows completed successfully for the previous batch, and GitHub Pages serves:

- `https://paobu.org/`
- `https://learn.paobu.org/`
- `https://tools.paobu.org/`

All three custom domains have approved certificates and HTTP redirects to HTTPS. The K1/T1 deployment is live: the three release manifests report core 0.2.14 at `1fcda15…`, content commits `0cd00cda…` / `a879da16…` / `4a8a3885…`, and siteBundleIds `388cbeb0…` / `1c65fd19…` / `b271663d…`, matching the local release bundle `a00bee5d…`. Eight new K1/T1 pages return 200 with 0 axe violations, 0 console errors, 0 failed requests and no mobile overflow; live search returns the new overtraining article, fueling tool, UTMB route and shoe-technology article; the fueling planner returns 45–90 g for 90 minutes at 25 g per serving.

The main-site Pages workflow was changed to download the published `core-v0.2.14` artifact and verify its SHA-256 instead of repacking, so the live main-site manifest reports the same core hash as both subsites.

Remaining remote caveats:

1. A real remote rollback drill has not been performed. The earlier local artifact drill covered 0.2.11 → 0.2.10 → 0.2.11 and has not been repeated for 0.2.14.
2. Real screen readers, physical phones, real Safari, third-party EOX tile SLA and formal high-resolution imagery remain outside this deployment verification.

## Known limits

- The AI-assisted review is not independent or professional medical/nutrition/coaching review. The user accepted this for the current content pass and asked not to require human review.
- The 16-route, nine-topic, 28-knowledge-entity and 12-tool set is covered. Future depth is a separate reviewed batch.
- Real screen readers, physical phones, real Safari, third-party EOX tile SLA, formal high-resolution imagery and field p75 remain unverified.
