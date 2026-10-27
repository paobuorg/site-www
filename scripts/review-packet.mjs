import fs from 'node:fs';
import path from 'node:path';
import { loadContent, defaultContentRoots } from '../packages/core/src/content/load.ts';
import { computeContentDigest } from '../packages/core/src/content/digest.ts';
import { projectRoot } from './load-env.mjs';

const outRoot =
  process.env.REVIEW_OUT ??
  path.join(projectRoot, 'evidence', new Date().toISOString().slice(0, 10), 'review');
const content = loadContent({ roots: defaultContentRoots(), allowUnreviewed: true });
const locales = ['zh-CN', 'en'];
const routeBacklog = [
  'route:boston',
  'route:utmb',
  'route:tokyo',
  'route:london',
  'route:berlin',
  'route:chicago',
  'route:new-york',
  'route:sydney',
  'route:cape-town',
  'route:beijing',
  'route:shanghai',
  'route:western-states',
  'route:hardrock',
  'route:hong-kong-100',
  'route:diagonale-des-fous',
  'route:tor-des-geants',
];
const topicBacklog = ['training', 'technique', 'recovery', 'nutrition', 'gear', 'health', 'safety', 'habits', 'culture'];

const entities = content.allEntities.map((entity) => {
  const sources = content.sourcesFor(entity);
  const reviews = content.reviews.filter((review) => review.entityId === entity.entityId);
  const translations = locales.map((locale) => {
    const translation = entity.translations.find((item) => item.locale === locale);
    if (!translation) return null;
    return {
      locale,
      title: translation.title,
      summary: translation.summary,
      authors: translation.authors,
      reviewers: translation.reviewers,
      translationStatus: translation.translationStatus,
      bodyCharacters: translation.body.length,
      digest: computeContentDigest(entity, translation, sources),
      body: translation.body,
    };
  });
  const missing = [];
  if (!translations.every(Boolean)) missing.push('bilingual-pair');
  if (sources.length === 0) missing.push('sources');
  if (!entity.license) missing.push('entity-license');
  if (reviews.length === 0) missing.push('review-record');
  if (entity.status !== 'published') missing.push('published-status');
  return {
    entityId: entity.entityId,
    slug: entity.slug,
    kind: entity.kind,
    status: entity.status,
    riskLevel: entity.riskLevel,
    license: entity.license,
    updatedAt: entity.updatedAt,
    sourceCount: sources.length,
    sourceRefs: entity.sourceRefs,
    sources: sources.map((source) => ({
      sourceId: source.sourceId,
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      publishedAt: source.publishedAt,
      license: source.license,
      claims: source.claims,
    })),
    reviewCount: reviews.length,
    reviews: reviews.map((review) => ({
      locale: review.locale,
      reviewerId: review.reviewerId,
      reviewedAt: review.reviewedAt,
      decision: review.decision,
      contentDigest: review.contentDigest,
    })),
    translations,
    missingGates: missing,
  };
});

const topicPrimary = new Set(
  entities
    .filter((entity) => entity.kind === 'knowledge')
    .flatMap((entity) => {
      const details = content.byId(entity.entityId)?.details;
      return details && 'primaryTopic' in details ? [details.primaryTopic] : [];
    }),
);
const coverage = {
  routes: {
    present: entities.filter((entity) => entity.kind === 'route').map((entity) => entity.entityId),
    backlog: routeBacklog,
    missing: routeBacklog.filter((id) => !entities.some((entity) => entity.entityId === id)),
  },
  knowledge: {
    presentTopics: [...topicPrimary].sort(),
    backlogTopics: topicBacklog,
    missingTopics: topicBacklog.filter((topic) => !topicPrimary.has(topic)),
    articles: entities.filter((entity) => entity.kind === 'knowledge').length,
  },
  tools: {
    present: entities.filter((entity) => entity.kind === 'tool').map((entity) => entity.entityId),
    count: entities.filter((entity) => entity.kind === 'tool').length,
  },
  status: Object.fromEntries(
    ['draft', 'in-review', 'published', 'withdrawn'].map((status) => [
      status,
      entities.filter((entity) => entity.status === status).length,
    ]),
  ),
};
const packet = {
  generatedAt: new Date().toISOString(),
  note: 'Review material only. Approval is recorded separately in data/reviews with a matching contentDigest; this file is not an independent or professional approval.',
  contentLock: JSON.parse(fs.readFileSync(path.join(projectRoot, 'content.lock.json'), 'utf8')),
  coverage,
  entities,
};

fs.mkdirSync(outRoot, { recursive: true });
fs.writeFileSync(path.join(outRoot, 'review-packets.json'), `${JSON.stringify(packet, null, 2)}\n`);
const lines = [
  '# Review packets',
  '',
  `Generated: ${packet.generatedAt}`,
  '',
  'This packet is review material. Approval records live in `data/reviews` with matching `contentDigest` values; they are AI-assisted editorial approvals, not independent or professional review.',
  '',
  '## Coverage',
  '',
  `- Routes: ${coverage.routes.present.length}/${coverage.routes.backlog.length}; missing: ${coverage.routes.missing.join(', ') || 'none'}`,
  `- Knowledge topics present: ${coverage.knowledge.presentTopics.join(', ')}; missing: ${coverage.knowledge.missingTopics.join(', ') || 'none'}`,
  `- Tools: ${coverage.tools.count}/8`,
  `- Status: ${Object.entries(coverage.status).map(([key, value]) => `${key}=${value}`).join(', ')}`,
  '',
  '## Entities',
  '',
  '| entityId | status | sources | reviews | missing gates | zh digest | en digest |',
  '|---|---|---:|---:|---|---|---|',
  ...entities.map((entity) => {
    const digests = Object.fromEntries(entity.translations.map((translation) => [translation?.locale ?? 'missing', translation?.digest ?? '—']));
    return `| ${entity.entityId} | ${entity.status} | ${entity.sourceCount} | ${entity.reviewCount} | ${entity.missingGates.join(', ') || 'none'} | \`${(digests['zh-CN'] ?? '—').slice(0, 16)}…\` | \`${(digests.en ?? '—').slice(0, 16)}…\` |`;
  }),
  '',
  'Full bilingual bodies, source records and exact digests are in `review-packets.json`.',
  '',
];
fs.writeFileSync(path.join(outRoot, 'review-packets.md'), lines.join('\n'));
console.log(`Wrote review packet for ${entities.length} entities to ${outRoot}`);
