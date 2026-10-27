import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from './schema.json';
import { computeContentDigest } from './digest';
import type {
  ContentBundle,
  ContentIssue,
  RawEntity,
  RouteDetails,
  SourceRecord,
  ToolDetails,
} from './types';

const LOCALES = ['zh-CN', 'en'];
const TOPICS = ['training', 'technique', 'recovery', 'nutrition', 'gear', 'health', 'safety', 'habits', 'culture'];
const KNOWLEDGE_TYPES = ['concept', 'guide', 'answer', 'plan', 'checklist', 'glossary', 'learning-path'];

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

function validUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function finiteTree(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(finiteTree);
  if (isObject(value)) return Object.values(value).every(finiteTree);
  return true;
}

const ajv = new Ajv2020({ strict: true, allErrors: true, allowUnionTypes: true });
addFormats(ajv);
const validateShape = ajv.compile(schema);

export function validateBundleShape(bundle: ContentBundle): ContentIssue[] {
  if (validateShape(bundle)) return [];
  return (validateShape.errors ?? []).map((error) => ({
    code: `schema.${error.keyword}`,
    at: error.instancePath || '$',
    message: error.message ?? 'Invalid value.',
  }));
}

export function validateSemantics(
  bundle: ContentBundle,
  options: { allowTestFixtures?: boolean } = {},
): ContentIssue[] {
  const allowTestFixtures = options.allowTestFixtures ?? false;
  const issues: ContentIssue[] = [];
  const add = (code: string, at: string, message: string) => issues.push({ code, at, message });
  if (!isObject(bundle)) return [{ code: 'bundle.object', at: '$', message: 'Expected an object.' }];
  if (bundle.schemaVersion !== 1) add('bundle.version', '$', 'Unsupported schema version.');
  if (bundle.testOnly && !allowTestFixtures) add('fixture.production', '$', 'Test fixtures cannot enter production.');
  if (!finiteTree(bundle)) add('number.finite', '$', 'Non-finite numbers are forbidden.');

  const sources = new Map<string, SourceRecord>();
  const people = new Map<string, ContentBundle['contributors'][number]>();
  const entities = new Map<string, RawEntity>();
  const reviews = new Map<string, ContentBundle['reviews'][number]>();
  const cases = new Map<string, ContentBundle['cases'][number]>();

  for (const source of bundle.sources) {
    if (!nonempty(source.sourceId)) {
      add('id.missing', 'sourceId', 'Missing stable ID.');
      continue;
    }
    if (sources.has(source.sourceId)) add('id.duplicate', source.sourceId, 'Duplicate ID.');
    sources.set(source.sourceId, source);
  }
  for (const person of bundle.contributors) {
    if (!nonempty(person.contributorId)) {
      add('id.missing', 'contributorId', 'Missing stable ID.');
      continue;
    }
    if (people.has(person.contributorId)) add('id.duplicate', person.contributorId, 'Duplicate ID.');
    people.set(person.contributorId, person);
  }
  for (const entity of bundle.entities) {
    if (!nonempty(entity.entityId)) {
      add('id.missing', 'entityId', 'Missing stable ID.');
      continue;
    }
    if (entities.has(entity.entityId)) add('id.duplicate', entity.entityId, 'Duplicate ID.');
    entities.set(entity.entityId, entity);
  }
  for (const item of bundle.cases) {
    if (!nonempty(item.caseId)) {
      add('id.missing', 'caseId', 'Missing stable ID.');
      continue;
    }
    if (cases.has(item.caseId)) add('id.duplicate', item.caseId, 'Duplicate ID.');
    cases.set(item.caseId, item);
  }

  for (const source of sources.values()) {
    if (!validUrl(source.url) || !nonempty(source.title) || !nonempty(source.publisher) || !validDate(source.accessedAt)) {
      add('source.required', source.sourceId, 'Invalid source metadata.');
    }
    if (source.publishedAt !== null && !validDate(source.publishedAt)) {
      add('source.date', source.sourceId, 'Invalid publication date.');
    }
    if (!Array.isArray(source.claims) || source.claims.length === 0 || !source.claims.every(nonempty)) {
      add('source.claims', source.sourceId, 'Source must identify supported claims.');
    }
    if (!allowTestFixtures && validUrl(source.url)) {
      const host = new URL(source.url).hostname;
      if (['example.org', 'example.com', 'example.net'].includes(host)) {
        add('source.placeholder', source.sourceId, 'Placeholder source cannot be published.');
      }
    }
  }

  for (const person of people.values()) {
    if (
      !nonempty(person.displayName) ||
      !Array.isArray(person.roles) ||
      person.roles.length === 0 ||
      person.roles.some((role) => !['author', 'editor', 'expert'].includes(role))
    ) {
      add('person.required', person.contributorId, 'Invalid contributor metadata.');
    }
  }

  for (const review of bundle.reviews) {
    const key = `${review.entityId}/${review.locale}`;
    if (reviews.has(key)) add('review.duplicate', key, 'One current review per entity and locale.');
    reviews.set(key, review);
    if (!entities.has(review.entityId) || !LOCALES.includes(review.locale) || !people.has(review.reviewerId)) {
      add('review.reference', key, 'Unknown review target or reviewer.');
    }
    if (
      !validDate(review.reviewedAt) ||
      !['approve', 'changes-requested'].includes(review.decision) ||
      !/^[a-f0-9]{64}$/.test(review.contentDigest ?? '')
    ) {
      add('review.required', key, 'Invalid review record.');
    }
  }

  for (const entity of entities.values()) {
    const id = entity.entityId;
    const published = entity.status === 'published';
    if (!allowTestFixtures && /^\w+:fixture-/.test(id)) add('fixture.entity', id, 'Reserved fixture entity cannot enter production.');
    if (
      !['route', 'knowledge', 'tool'].includes(entity.kind) ||
      !new RegExp(`^${entity.kind}:[a-z0-9]+(?:-[a-z0-9]+)*$`).test(id)
    ) {
      add('entity.kind', id, 'Kind and ID disagree.');
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entity.slug ?? '')) add('entity.slug', id, 'Invalid slug.');
    if (!['draft', 'in-review', 'published', 'withdrawn'].includes(entity.status)) add('entity.status', id, 'Invalid status.');
    if (!['general', 'guidance', 'high'].includes(entity.riskLevel)) add('entity.risk', id, 'Invalid risk level.');
    if (!validDate(entity.createdAt) || !validDate(entity.updatedAt) || entity.createdAt > entity.updatedAt) {
      add('entity.date', id, 'Invalid content dates.');
    }
    if (!Array.isArray(entity.sourceRefs) || entity.sourceRefs.some((source) => !sources.has(source))) {
      add('entity.sources', id, 'Unknown source references.');
    }
    if (!Array.isArray(entity.relatedRefs) || entity.relatedRefs.some((ref) => !entities.has(ref))) {
      add('entity.related', id, 'Unknown entity references.');
    }

    const translated = Array.isArray(entity.translations) ? entity.translations : [];
    const languageSet = new Set<string>();
    for (const translation of translated) {
      if (!isObject(translation)) {
        add('translation.object', id, 'Expected translation object.');
        continue;
      }
      if (!LOCALES.includes(translation.locale) || languageSet.has(translation.locale)) {
        add('translation.locale', id, 'Unknown or duplicate language.');
      }
      languageSet.add(translation.locale);
      if (!nonempty(translation.title) || !nonempty(translation.summary) || !nonempty(translation.body)) {
        add('translation.content', id, 'Empty localized content.');
      }
      if (!['draft', 'in-review', 'reviewed'].includes(translation.translationStatus)) {
        add('translation.status', id, 'Invalid translation status.');
      }
      for (const field of ['authors', 'reviewers'] as const) {
        if (!Array.isArray(translation[field]) || translation[field].some((person) => !people.has(person))) {
          add('translation.people', `${id}/${field}`, 'Unknown contributor.');
        }
      }
      if (published) {
        if (translation.translationStatus !== 'reviewed' || !translation.authors?.length || !translation.reviewers?.length) {
          add('publication.translation', id, 'Both translations need authors and review.');
        }
        const review = reviews.get(`${id}/${translation.locale}`);
        const reviewer = review ? people.get(review.reviewerId) : undefined;
        if (
          !review ||
          review.decision !== 'approve' ||
          !Array.isArray(translation.reviewers) ||
          !translation.reviewers.includes(review.reviewerId) ||
          !reviewer?.roles.some((role) => ['editor', 'expert'].includes(role))
        ) {
          add('publication.review', id, 'Missing valid approval.');
        }
        if (review && validDate(review.reviewedAt) && validDate(entity.updatedAt) && review.reviewedAt < entity.updatedAt) {
          add('publication.review-date', id, 'Approval predates content update.');
        }
        if (
          entity.riskLevel === 'high' &&
          (!reviewer?.roles.includes('expert') || !nonempty(reviewer.qualification))
        ) {
          add('publication.expert', id, 'High-risk content needs a qualified expert.');
        }
        if (
          review &&
          entity.sourceRefs.every((source) => sources.has(source)) &&
          nonempty(translation.body) &&
          review.contentDigest !== computeContentDigest(entity, translation, bundle.sources)
        ) {
          add('publication.stale-review', id, 'Approved content has changed.');
        }
      }
    }

    if (published) {
      if (!LOCALES.every((locale) => languageSet.has(locale))) add('publication.bilingual', id, 'Both languages are required.');
      if (!nonempty(entity.license) || entity.sourceRefs.length === 0 || !validDate(entity.reviewedAt) || !validDate(entity.reviewDueAt) || entity.reviewDueAt < entity.reviewedAt) {
        add('publication.metadata', id, 'License, sources and review dates required.');
      }
      if (entity.relatedRefs.some((ref) => entities.get(ref)?.status !== 'published')) {
        add('publication.related', id, 'Published content points to unavailable content.');
      }
    }

    if (!isObject(entity.details)) {
      add('details.object', id, 'Details must be an object.');
      continue;
    }

    const details = entity.details;
    if (entity.kind === 'knowledge') {
      const knowledge = details as { primaryTopic?: string; contentType?: string };
      if (!TOPICS.includes(knowledge.primaryTopic ?? '') || !KNOWLEDGE_TYPES.includes(knowledge.contentType ?? '')) {
        add('knowledge.taxonomy', id, 'Unknown knowledge taxonomy.');
      }
    }

    if (entity.kind === 'route') {
      const route = details as RouteDetails;
      if (
        !['road-marathon', 'trail-ultra'].includes(route.raceType) ||
        !nonempty(route.courseVersion) ||
        !nonempty(route.direction) ||
        !isObject(route.placeName) ||
        !LOCALES.every((locale) => nonempty(route.placeName[locale as 'zh-CN' | 'en'])) ||
        !Array.isArray(route.countryCodes) ||
        route.countryCodes.length === 0 ||
        new Set(route.countryCodes).size !== route.countryCodes.length ||
        route.countryCodes.some((code) => !/^[A-Z]{2}$/.test(code))
      ) {
        add('route.identity', id, 'Invalid course identity or bilingual place names.');
      }
      if (
        !isObject(route.mapAnchor) ||
        !Number.isFinite(route.mapAnchor.longitude) ||
        Math.abs(route.mapAnchor.longitude) > 180 ||
        !Number.isFinite(route.mapAnchor.latitude) ||
        Math.abs(route.mapAnchor.latitude) > 90 ||
        !['start', 'overview'].includes(route.mapAnchor.kind) ||
        !entity.sourceRefs.includes(route.mapAnchor.sourceRef)
      ) {
        add('route.anchor', id, 'Valid sourced globe anchor required.');
      }
      if (!Number.isFinite(route.distanceMeters) || route.distanceMeters <= 0 || !nonempty(route.distanceMethod)) {
        add('route.distance', id, 'Invalid course distance.');
      }
      if (
        route.elevationGainMeters === null
          ? route.elevationMethod !== null
          : !Number.isFinite(route.elevationGainMeters) || route.elevationGainMeters < 0 || !nonempty(route.elevationMethod)
      ) {
        add('route.elevation', id, 'Unknown elevation must remain null; known elevation needs a method.');
      }
      if (!['redistributable', 'official-link', 'unavailable'].includes(route.geometryAccess)) {
        add('route.geometry-mode', id, 'Invalid geometry mode.');
      }
      if (
        route.geometryAccess === 'redistributable' &&
        (!/^assets\/[a-zA-Z0-9/_-]+\.geojson$/.test(route.geometryRef ?? '') ||
          !validUrl(route.geometrySourceUrl) ||
          !nonempty(route.geometryLicense) ||
          !nonempty(route.attribution))
      ) {
        add('route.geometry-rights', id, 'Geometry redistribution needs source, license and attribution.');
      }
      if (route.geometryAccess !== 'redistributable' && route.geometryRef !== null) {
        add('route.geometry-ref', id, 'External-only or unavailable geometry has no bundled download.');
      }
      if (route.geometryAccess === 'official-link' && !validUrl(route.officialGeometryUrl)) {
        add('route.official-link', id, 'Official geometry URL required.');
      }
    }

    if (entity.kind === 'tool') {
      const tool = details as ToolDetails;
      if (
        tool.toolId !== id ||
        !/^\d+\.\d+\.\d+$/.test(tool.specVersion ?? '') ||
        !nonempty(tool.formulaDescription) ||
        !nonempty(tool.rounding) ||
        !Array.isArray(tool.inputs) ||
        tool.inputs.length === 0 ||
        !Array.isArray(tool.outputs) ||
        tool.outputs.length === 0 ||
        !Array.isArray(tool.assumptions)
      ) {
        add('tool.specification', id, 'Incomplete tool specification.');
      }
      if (
        !Array.isArray(tool.caseRefs) ||
        tool.caseRefs.some((caseId) => !cases.has(caseId) || cases.get(caseId)?.toolId !== id) ||
        (published && tool.caseRefs.length === 0)
      ) {
        add('tool.cases', id, 'Tool must reference its own independent examples.');
      }
    }
  }

  const slugs = new Set<string>();
  for (const entity of entities.values()) {
    const key = `${entity.kind}/${entity.slug}`;
    if (slugs.has(key)) add('entity.slug-duplicate', key, 'Duplicate public slug.');
    slugs.add(key);
  }

  for (const item of cases.values()) {
    if (
      !entities.has(item.toolId) ||
      entities.get(item.toolId)?.kind !== 'tool' ||
      !isObject(item.input) ||
      !isObject(item.expected) ||
      !nonempty(item.basis)
    ) {
      add('case.reference', item.caseId, 'Invalid independent tool case.');
    }
  }

  return issues;
}

export function assertValidBundle(bundle: ContentBundle, options: { allowTestFixtures?: boolean } = {}): void {
  const issues = [...validateBundleShape(bundle), ...validateSemantics(bundle, options)];
  if (issues.length === 0) return;
  const message = issues.map((issue) => `${issue.code} at ${issue.at}: ${issue.message}`).join('\n');
  throw new Error(`Content validation failed:\n${message}`);
}
