import type { Locale, SiteKind, TopicId } from '../lib/i18n';

export type EntityStatus = 'draft' | 'in-review' | 'published' | 'withdrawn';
export type RiskLevel = 'general' | 'guidance' | 'high';
export type TranslationStatus = 'draft' | 'in-review' | 'reviewed';
export type ContentKind = 'route' | 'knowledge' | 'tool';
export type KnowledgeType =
  | 'concept'
  | 'guide'
  | 'answer'
  | 'plan'
  | 'checklist'
  | 'glossary'
  | 'learning-path';

export interface SourceRecord {
  sourceId: string;
  title: string;
  url: string;
  publisher: string;
  publishedAt: string | null;
  accessedAt: string;
  claims: string[];
  license: string | null;
}

export interface ContributorRecord {
  contributorId: string;
  displayName: string;
  roles: Array<'author' | 'editor' | 'expert'>;
  qualification: string | null;
}

export interface ReviewRecord {
  entityId: string;
  locale: Locale;
  reviewerId: string;
  reviewedAt: string;
  decision: 'approve' | 'changes-requested';
  contentDigest: string;
}

export interface CaseRecord {
  caseId: string;
  toolId: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
  basis: string;
}

export interface Translation {
  locale: Locale;
  title: string;
  summary: string;
  body: string;
  aliases: string[];
  authors: string[];
  reviewers: string[];
  translationStatus: TranslationStatus;
}

export interface RouteDetails {
  raceType: 'road-marathon' | 'trail-ultra';
  countryCodes: string[];
  placeName: Record<Locale, string>;
  mapAnchor: {
    longitude: number;
    latitude: number;
    kind: 'start' | 'overview';
    sourceRef: string;
  };
  courseVersion: string;
  direction: string;
  distanceMeters: number;
  distanceMethod: string;
  elevationGainMeters: number | null;
  elevationMethod: string | null;
  geometryAccess: 'redistributable' | 'official-link' | 'unavailable';
  geometryRef: string | null;
  geometrySourceUrl: string | null;
  geometryLicense: string | null;
  officialGeometryUrl: string | null;
  attribution: string | null;
  surface?: string;
  technicality?: string;
}

export interface KnowledgeDetails {
  primaryTopic: TopicId;
  secondaryTopics: string[];
  contentType: KnowledgeType;
  audiences: string[];
  scenarios: string[];
}

export interface ToolPort {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'enum' | 'file' | 'object' | 'array';
  unit: string | null;
  required: boolean;
  minimum?: number;
  maximum?: number;
  enumValues?: string[];
  labels?: Record<Locale, string>;
}

export interface ToolDetails {
  toolId: string;
  specVersion: string;
  inputs: ToolPort[];
  outputs: ToolPort[];
  formulaDescription: string;
  assumptions: string[];
  rounding: string;
  caseRefs: string[];
}

export type EntityDetails = RouteDetails | KnowledgeDetails | ToolDetails;

export interface RawEntity {
  entityId: string;
  slug: string;
  kind: ContentKind;
  status: EntityStatus;
  riskLevel: RiskLevel;
  sourceRefs: string[];
  relatedRefs: string[];
  license: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewDueAt: string | null;
  translations: Translation[];
  details: EntityDetails;
}

export interface ContentBundle {
  schemaVersion: 1;
  testOnly?: boolean;
  entities: RawEntity[];
  sources: SourceRecord[];
  contributors: ContributorRecord[];
  reviews: ReviewRecord[];
  cases: CaseRecord[];
}

export interface Heading {
  level: number;
  text: string;
  id: string;
}

export interface RenderedTranslation extends Translation {
  html: string;
  headings: Heading[];
  plainText: string;
  readingMinutes: number;
}

export interface ContentEntity extends RawEntity {
  rendered: Record<string, RenderedTranslation>;
}

export interface ContentIssue {
  code: string;
  at: string;
  message: string;
}

export interface ContentRoots {
  routes?: string;
  knowledge?: string;
  tools?: string;
}

export interface LoadOptions {
  roots: ContentRoots;
  allowUnreviewed?: boolean;
  allowTestFixtures?: boolean;
}

export interface ContentIndex {
  entities: ContentEntity[];
  allEntities: ContentEntity[];
  sources: SourceRecord[];
  contributors: ContributorRecord[];
  reviews: ReviewRecord[];
  cases: CaseRecord[];
  preview: boolean;
  byId(entityId: string): ContentEntity | undefined;
  bySlug(kind: ContentKind, slug: string): ContentEntity | undefined;
  visible(kind?: ContentKind): ContentEntity[];
  translation(entity: ContentEntity, locale: Locale): RenderedTranslation;
  sourcesFor(entity: ContentEntity): SourceRecord[];
  related(entity: ContentEntity, locale: Locale): ContentEntity[];
  registry(): RegistryEntry[];
}

export interface RegistryEntry {
  entityId: string;
  locale: Locale;
  kind: ContentKind;
  title: string;
  summary: string;
  canonicalUrl: string;
  topics: string[];
  aliases: string[];
  dataVersion: string;
  slug: string;
  section: string;
}

export type SiteContent = ContentIndex & {
  site: SiteKind;
};
