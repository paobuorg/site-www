# AI-assisted editorial review report

Date: 2026-10-27  
Reviewer identity: `runmap-editorial` — “RunMap editorial desk (AI-assisted draft and review)”  
Scope: 48 entities and 96 translations (16 routes, 24 knowledge entities — 23 articles plus a glossary — and 8 tools)

## What this review is

This is an **AI-assisted editorial review**, performed by the same editorial desk that drafted the content. It is not an independent review and not a professional medical, nutrition, coaching or safety review. The reviewer has `editor` role and `qualification: null`; that limitation is intentional and visible in the contributor record. Health/safety articles retain conservative wording and do not diagnose or prescribe individual treatment.

## Method

1. Read every Chinese and English article, entity contract, source record and tool case.
2. Checked official race pages, public-health/safety sources, RFC/GPX specifications and tool cases; verified source claims and bilingual agreement.
3. Ran a separate sub-audit of the 14 added routes, the deeper knowledge batch, the glossary and the five learning paths; fixed blockers/should-fix findings before approval.
4. Re-computed `contentDigest` values, wrote one approval per entity/locale, and re-ran the content validator, production builds, browser matrices and release checks.

## Fixes made before approval

- **Existing sample batch**: UTMB 2026 figures corrected to 174 km / 9,700 m with the official GPX link; Boston pinned to the 2026 BAA course; PAG activity wording corrected; unsourced sleep claims softened; tool privacy URL disclosure corrected; GeoJSON missing-elevation case fixed; RDP citations split; route-comparison missing-value output added.
- **Route batch**: HK100 pinned to the 2027 official 100 km / 5,142 m course and its Chinese finish corrected to Tai Mo Shan Road; Shanghai finish corrected to Xujiahui Sports Park; all route anchors marked as editorial `overview` positions with a RunMap anchor-method source; Western States does not link an unverified next-edition GPX; Sydney’s GPX is not linked because its file metadata needs version verification; source claims were added for landmark, start/finish and elevation statements.
- **Knowledge batch 1**: corrected the `/articles/` internal link; scoped NHS knee/Achilles advice correctly; clarified GPX geometry vs live conditions; aligned water/water-treatment wording; added the non-traveling trusted-person requirement and heat-exhaustion response; removed an unsupported “shoes” claim from a surface section; corrected a mismatch between cushioning wording and the cited secondary analysis. Added six deeper articles, a 17-term glossary, five learning paths and a PubMed-linked physiology source.
- **Knowledge batch 2**: added eight bilingual guides and a breathing section. Checked the ISSN protein/caffeine position stands, FDA supplement regulation, CDC older-adult/chronic-condition/pregnancy guidance, CDC healthy-weight factors, NPS winter and Ten Essentials advice, NWS cold exposure, the PLOS ONE taper meta-analysis, BAA race rules, World Athletics records, NHS GAD and WHO's occupational burnout definition. Wording was kept conservative where evidence is observational or population-level.
- **Mobile accessibility regression**: the long tool forms exposed a real soft-keyboard overlap. Shared core now scrolls focused fields above the fixed bottom navigation, and the three-browser matrix re-checks the result.
- **Imagery**: route close-ups were moved from a public tile service that failed CORS in the local Chromium environment to EOX Sentinel-2 cloudless, a public no-key CORS-enabled mosaic with attribution. Tile loading now retries three times and falls back to the local NASA texture.
- **Routing and source links**: Chinese routes moved to the root path and English routes to `/en/`; `/zh-CN/` is intentionally not redirected. The route anchor source URL was changed to `https://paobu.org/about/#method`, affected route digests were recomputed, and all 96 approvals were re-recorded. Content Markdown links that still contain the old `/zh-CN/` form are normalized at render time to the new root paths.

## Residual limits

- The review is not independent and does not constitute professional advice. Health/safety guidance still needs a qualified reviewer before being treated as specialist-approved.
- Route facts come from official pages where accessible; Beijing and Shanghai official sites are dynamic and were cross-checked through organiser announcements. Some sources are third-party or paywalled; source/licence details remain visible.
- Real NVDA/VoiceOver, physical phones, real Safari, third-party EOX tile SLA, formal high-resolution imagery, complete real-device performance and production p75 remain unverified.
- The 16-route, nine-topic, 24-knowledge-entity launch set is covered. Future depth is a separate reviewed batch rather than bulk-generated content.

## Approval records

For each entity and locale there is one `data/reviews/<slug>-<locale>.json` record with `decision: approve`, `reviewedAt: 2026-10-27` and a digest calculated from the reviewed bilingual body, shared facts and source records. The content validator recomputes the digest and rejects stale approvals. See `review-packets.json` for per-locale digests and `content.lock.json` for the content-tree digest.
