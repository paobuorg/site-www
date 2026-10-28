# Local acceptance report — 2026-10-28 K1/T1 batch

Date: 2026-10-28  
Scope: the three production builds under `repos/site-www/dist`, `repos/site-knowledge/dist` and `repos/site-tools/dist`, including the K1 knowledge and T1 tool batch

## Result

Local acceptance **passes** for the 56-entity launch set. The three public sites are live on their custom domains with HTTPS, and the K1/T1 deployment has been rechecked against the live release manifests.

- Content: 64 entities / 128 bilingual versions published (routes 16, knowledge 36, tools 12); 62 sources; 26 tool cases; 128 AI-assisted editorial approval records; `check:production` passes with route=16, knowledge=36, tool=12.
- Knowledge: 35 articles plus a 17-term glossary, nine topics covered, five learning paths.
- Production artifacts: static builds 43/103/31 HTML files; release manifests 40/100/28 hosted HTML pages; Pagefind 128/72/24 records; sitemaps 40/100/28 URLs; no `localhost` URLs in production HTML.
- Release bundle: `42ace64240eb0b47cf046354fd809b8a8bdeb19f21ea9bf2de54e5c947baccec`; core `0.2.15` (`8e264510…`); content locks match.
- Local crawl: all 168 sitemap pages return 200; canonical, hreflang, noindex absence, title, H1, PWA assets, robots and service worker are present.
- Browser matrix: Chromium/Firefox/WebKit each 48 screenshots; 0 axe violations, 0 console errors, 0 failed requests; keyboard 14/14 on four pages; search pagination fully expands to 25/25; no soft-keyboard overlap. The eight new K1/T1 pages have 0 axe violations in light and dark themes and no mobile overflow.
- Search: 60/60 Chinese and 56/56 English queries rank an expected result in the top five (90% threshold); kind facets total 16/28/12.
- T16: 11/11 budgets, 8/8 fault assertions; article LCP worst 1.748s; desktop globe-ready worst 3.679s; simulated mobile worst 5.567s; about 60fps on the local Intel Arc.
- T06/T12/T17: cross-site 11/11 (production hrefs mapped to the three local preview servers), track timeout/cancel 11/11, PWA offline 18/18.
- Handoff: 0 issues, 63 links; handoff tests 46/46; content locks verified.

## K1 knowledge batch

Four bilingual articles were added: tempo and interval execution, training load and overtraining, heat and humidity, and shoe technology. The first uses effort, talk-test and recent-pace anchors rather than a percentage table; the second separates diagnosis by exclusion from unsupported single-metric formulas; the third centres on heat-illness signs, acclimatisation and event medical support; the fourth limits carbon-plate claims to the reviewed evidence. Three sources were added (PubMed 23016079, PMC12827780, PubMed 28919842). Learning paths now include tempo/interval and heat content where relevant.

## T1 tool batch

Four browser-local tools were added: fueling planner, route elevation, shoe mileage and race checklist. Fueling shows a 30–60 g/h range only above 60 minutes and treats product servings as arithmetic; elevation reports missing elevation as unknown and reports short-segment grade as unknown; shoe mileage uses the user's own reminder threshold and makes no replacement-interval claim; the checklist is rule-based and not medical or mandatory advice. Six cases were added. The tools repository now has 12 entities and 26 cases; site-tools has 38 passing unit tests.

Browser checks: 90 minutes at 25 g per serving shows “45–90 g”; a sample GPX shows 221 m, 100 m gain, 100 m loss, 90.4% maximum grade and 3 profile points; a 10 km shoe entry persists as 110.0 km after reload; a trail checklist produces eight sections including a headlamp. The four pages had no mobile overflow, console errors or failed requests.

## K2 knowledge batch

Eight bilingual articles were added: cadence/stride, uphill/downhill, running surfaces, race-day fuelling, caffeine, shoe fit/cushioning, trail navigation and post-race recovery. Each uses existing verified sources, states its limits and is linked into the relevant learning paths. Sixteen new pages were checked at 390px: all 200, 0 axe violations, no mobile overflow, 0 console/failed requests and legal notices present.

## Legal, tone and licences

All 56 entities and 112 translations were re-checked after removing editorial-desk/AI-facing bylines and legacy locale links. Visible author labels now read “跑地图编辑部” / “RunMap Editorial”. A bilingual legal page exists on each site with liability, non-professional advice, race/outdoor safety, tool limits, source/trademark, CC BY 4.0, MIT, privacy and correction sections; every article, glossary, tool and route page carries a context-specific legal notice. Six legal pages were checked in both languages: 200, 0 axe violations, no mobile overflow, and CC BY 4.0 / MIT wording present. A source test rejects editorial-desk wording, AI-facing copy, legacy `/zh-CN/` links and missing CC BY 4.0 fields.

## Imagery

Route close-ups use EOX Sentinel-2 cloudless public tiles, a no-key CORS-enabled service, with NASA/EOX/CC BY-NC-SA attribution, three retries and a local NASA Blue Marble fallback. A Boston route check previously received 66 tile responses with 0 failures and 0 console errors. The provider remains a third-party dependency. This does not prove the provider's terms, quotas, long-term availability or a formal high-resolution SLA; T08's formal high-resolution imagery remains outstanding.

## Remote deployment status

The six public repositories are under `paobuorg`; `@paobu/core@0.2.15` is published as a Release with SHA-256 `8e264510…`, and both subsites use its artifact URL and hash. The three Pages workflows completed successfully and GitHub Pages serves:

- `https://paobu.org/`
- `https://learn.paobu.org/`
- `https://tools.paobu.org/`

All three custom domains have approved certificates and HTTP redirects to HTTPS. The K2 legal/content deployment is live: the three release manifests report core 0.2.15 at `8e264510…`, content commits `67a80ab…` / `17e2e6d…` / `a423a45…`, and siteBundleIds `345aab33…` / `946de920…` / `20eb0d99…`, matching the local release bundle `42ace642…`. The knowledge site now has 100 sitemap pages and 72 search records; the main site has 128 aggregate records.

The 16 new K2 article pages return 200 with legal notices, no mobile overflow, and no console or failed requests. Four representative K2 articles checked with axe in both languages had 0 violations. The full 116-query search set passed live at 60/60 Chinese and 56/56 English. Six legal pages remain live and the PWA start URL is `/` on all three sites.

Remaining remote caveats:

1. A real remote rollback drill has not been performed. The earlier local artifact drill covered 0.2.11 → 0.2.10 → 0.2.11 and has not been repeated for 0.2.15.
2. Real screen readers, physical phones, real Safari, third-party EOX tile SLA and formal high-resolution imagery remain outside this deployment verification.

## Known limits

- The AI-assisted review is not independent or professional medical/nutrition/coaching review. The user accepted this for the current content pass and asked not to require human review.
- The 16-route, nine-topic, 28-knowledge-entity and 12-tool set is covered. Future depth is a separate reviewed batch.
- Real screen readers, physical phones, real Safari, third-party EOX tile SLA, formal high-resolution imagery and field p75 remain unverified.
