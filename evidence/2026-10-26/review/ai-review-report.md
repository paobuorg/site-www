# AI-assisted editorial review report

> Historical 39-entity round. The final 40-entity review report is [2026-10-27/review/ai-review-report.md](../../2026-10-27/review/ai-review-report.md).

Date: 2026-10-27  
Reviewer identity: `runmap-editorial` — “RunMap editorial desk (AI-assisted draft and review)”  
Scope: 39 entities and 78 translations (16 routes, 15 knowledge articles, 8 tools)

## What this review is

This is an **AI-assisted editorial review**, performed by the same editorial desk that drafted the content. It is not an independent review and not a professional medical, nutrition, coaching or safety review. The reviewer has `editor` role and `qualification: null`; that limitation is intentional and visible in the contributor record. Health/safety articles retain conservative wording and do not diagnose or prescribe individual treatment.

## Method

1. Read every Chinese and English article, entity contract, source record and tool case.
2. Checked official race pages, public-health/safety sources, RFC/GPX specifications and tool cases; verified source claims and bilingual agreement.
3. Ran a separate sub-audit of the 14 newly added routes and 5 new knowledge articles; fixed its blockers/should-fix findings before approval.
4. Re-computed `contentDigest` values, wrote one approval per entity/locale, and re-ran the content validator and production build.

## Fixes made before approval

- **Existing sample batch**: UTMB 2026 figures corrected to 174 km / 9,700 m with the official GPX link; Boston pinned to the 2026 BAA course; PAG activity wording corrected; unsourced sleep claims softened; tool privacy URL disclosure corrected; GeoJSON missing-elevation case fixed; RDP citations split; route-comparison missing-value output added.
- **Route batch**: HK100 pinned to the 2027 official 100 km / 5,142 m course and its Chinese finish corrected to Tai Mo Shan Road; Shanghai finish corrected to Xujiahui Sports Park; all new route anchors marked as editorial `overview` positions with a RunMap anchor-method source; Western States does not link an unverified next-edition GPX; Sydney’s GPX is not linked because its file metadata needs version verification; source claims were added for landmark, start/finish and elevation statements.
- **Knowledge batch**: corrected the `/articles/` internal link; scoped NHS knee/Achilles advice correctly; clarified GPX geometry vs live conditions; aligned water/water-treatment wording; added the non-traveling trusted-person requirement and heat-exhaustion response; removed an unsupported “shoes” claim from a surface section; corrected a mismatch between cushioning wording and the cited secondary analysis.
- **Mobile accessibility regression**: the new long tool forms exposed a real soft-keyboard overlap. Shared core now scrolls focused fields above the fixed bottom navigation, and the three-browser matrix re-checks the result.

## Residual limits

- The review is not independent and does not constitute professional advice. Health/safety guidance still needs a qualified reviewer before being treated as specialist-approved.
- Route facts come from official pages where accessible; Beijing and Shanghai official sites are dynamic and were cross-checked through organiser announcements. Some sources are third-party or paywalled; source/licence details remain visible.
- Real NVDA/VoiceOver, physical phones, real Safari, third-party Esri tile SLA, complete real-device performance and production p75 remain unverified.
- The 16-route and nine-topic launch list is covered, but the deeper knowledge blueprint contains further questions that should be added as separate reviewed batches rather than bulk-generated.

## Approval records

For each entity and locale there is one `data/reviews/<slug>-<locale>.json` record with `decision: approve`, `reviewedAt: 2026-10-27` and a digest calculated from the reviewed bilingual body, shared facts and source records. The content validator recomputes the digest and rejects stale approvals. See `review-packets.json` for per-locale digests and `content.lock.json` for the content-tree digest.
