import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import YAML from 'yaml';
import { LOCALES, type Locale, type SiteKind } from '../lib/i18n';
import { absoluteEntityUrl } from '../lib/routing';
import { getSiteOrigins } from '../lib/sites';
import { assertValidBundle } from './validate';
import type {
  CaseRecord,
  ContentBundle,
  ContentEntity,
  ContentIndex,
  ContentKind,
  ContentRoots,
  ContributorRecord,
  Heading,
  LoadOptions,
  RawEntity,
  RegistryEntry,
  ReviewRecord,
  RenderedTranslation,
  SourceRecord,
  Translation,
} from './types';

const md = new MarkdownIt({ html: false, linkify: true, typographer: false, breaks: false });
const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));

const SECTION_SITE: Record<string, SiteKind> = {
  routes: 'routes',
  knowledge: 'knowledge',
  articles: 'knowledge',
  glossary: 'knowledge',
  paths: 'knowledge',
  topics: 'knowledge',
  tools: 'tools',
};

const PRODUCTION_SITE: Record<string, SiteKind> = {
  'https://paobu.org': 'routes',
  'https://learn.paobu.org': 'knowledge',
  'https://tools.paobu.org': 'tools',
};

function contentHref(href: string): string {
  if (href.startsWith('//')) return href;
  if (/^https?:\/\//i.test(href)) {
    const url = new URL(href);
    const site = PRODUCTION_SITE[url.origin];
    if (!site) return href;
    return `${getSiteOrigins()[site]}${url.pathname}${url.search}${url.hash}`;
  }
  if (!href.startsWith('/')) return href;
  const url = new URL(href, 'https://paobu.invalid');
  const [locale, section, ...rest] = url.pathname.split('/').filter(Boolean);
  if (!LOCALES.includes(locale as Locale)) return href;
  const normalizedSection = section === 'knowledge' ? 'articles' : section;
  const site = normalizedSection ? SECTION_SITE[normalizedSection] : undefined;
  if (!site) return href;
  const pathname = `/${locale}/${normalizedSection}/${rest.length > 0 ? `${rest.join('/')}/` : ''}`;
  return `${getSiteOrigins()[site]}${pathname}${url.search}${url.hash}`;
}

function isInternalHref(href: string): boolean {
  if (!/^https?:\/\//i.test(href)) return true;
  return Object.values(getSiteOrigins()).some(
    (origin) => href === origin || href.startsWith(`${origin}/`),
  );
}

md.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const rawHref = String(tokens[index]?.attrGet('href') ?? '');
  const href = contentHref(rawHref);
  if (href !== rawHref) tokens[index]?.attrSet('href', href);
  if (/^https?:\/\//i.test(href) && !isInternalHref(href)) {
    tokens[index]?.attrSet('target', '_blank');
    tokens[index]?.attrSet('rel', 'external noopener noreferrer');
  }
  return defaultLinkOpen(tokens, index, options, env, self);
};

function jsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json') && !name.startsWith('.'))
    .sort();
}

function readJson<T>(file: string): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (error) {
    throw new Error(`Cannot parse JSON at ${file}: ${(error as Error).message}`);
  }
}

function readJsonDirectory<T>(dir: string): T[] {
  return jsonFiles(dir).map((name) => readJson<T>(path.join(dir, name)));
}

function dedupeById<T>(
  items: T[],
  idKey: keyof T,
  label: string,
): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const id = String(item[idKey]);
    const existing = map.get(id);
    if (!existing) {
      map.set(id, item);
      continue;
    }
    if (JSON.stringify(existing) !== JSON.stringify(item)) {
      throw new Error(`Conflicting ${label} records for ${id}`);
    }
  }
  return [...map.values()];
}

function translationFromMarkdown(file: string, entityId: string, locale: Locale): Translation {
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = matter(raw, {
    engines: { yaml: (source: string) => YAML.parse(source) as object },
  });
  const data = parsed.data as Record<string, unknown>;
  if (data.entityId !== entityId) throw new Error(`Frontmatter entityId mismatch in ${file}`);
  if (data.locale !== locale) throw new Error(`Frontmatter locale mismatch in ${file}`);
  const authors = Array.isArray(data.authors) ? data.authors.map(String) : [];
  const reviewers = Array.isArray(data.reviewers) ? data.reviewers.map(String) : [];
  const aliases = Array.isArray(data.aliases)
    ? [...new Set(data.aliases.map((alias) => String(alias).trim()).filter(Boolean))]
    : [];
  const body = parsed.content.replace(/\r\n?/g, '\n').trim();
  if (!body) throw new Error(`Empty body in ${file}`);
  return {
    locale,
    title: String(data.title ?? '').trim(),
    summary: String(data.summary ?? '').trim(),
    body,
    aliases,
    authors,
    reviewers,
    translationStatus:
      data.translationStatus === 'reviewed' || data.translationStatus === 'in-review'
        ? data.translationStatus
        : 'draft',
  };
}

function slugifyHeading(text: string, used: Map<string, number>, index: number): string {
  const base =
    text
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || `section-${index + 1}`;
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

export function renderMarkdown(body: string): { html: string; headings: Heading[]; plainText: string; readingMinutes: number } {
  const tokens = md.parse(body, {});
  const headings: Heading[] = [];
  const used = new Map<string, number>();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token || token.type !== 'heading_open') continue;
    const inline = tokens[index + 1];
    const text = inline?.content?.trim() ?? '';
    const id = slugifyHeading(text, used, headings.length);
    token.attrSet('id', id);
    headings.push({ level: Number(token.tag.slice(1)), text, id });
  }
  const html = md.renderer.render(tokens, md.options, {});
  const plainText = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  const cjkCount = (plainText.match(/[\u3400-\u9fff]/g) ?? []).length;
  const wordCount = plainText.replace(/[\u3400-\u9fff]/g, ' ').split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.ceil(cjkCount / 360 + wordCount / 220));
  return { html, headings, plainText, readingMinutes };
}

function loadRawEntities(root: ContentRoots[keyof ContentRoots], expectedKind: ContentKind): RawEntity[] {
  if (!root) return [];
  const entityDir = path.join(root, 'data', 'entities');
  const entities = readJsonDirectory<RawEntity>(entityDir);
  return entities.map((entity) => {
    if (entity.kind !== expectedKind) {
      throw new Error(`${entity.entityId} in ${root} has kind ${entity.kind}, expected ${expectedKind}`);
    }
    const translations: Translation[] = [];
    for (const locale of LOCALES) {
      const file = path.join(root, 'content', locale, `${entity.slug}.md`);
      if (!fs.existsSync(file)) continue;
      translations.push(translationFromMarkdown(file, entity.entityId, locale));
    }
    return {
      ...entity,
      translations,
    };
  });
}

function buildBundle(roots: ContentRoots): ContentBundle {
  const entries = Object.entries(roots).filter(([, dir]) => Boolean(dir)) as Array<[SiteKind, string]>;
  if (entries.length === 0) throw new Error('At least one content root is required.');
  for (const [, dir] of entries) {
    if (!fs.existsSync(dir)) throw new Error(`Content root does not exist: ${dir}`);
  }
  const entities = entries.flatMap(([kind, dir]) =>
    loadRawEntities(dir, kind === 'routes' ? 'route' : kind === 'knowledge' ? 'knowledge' : 'tool'),
  );
  const sources = dedupeById(
    entries.flatMap(([, dir]) => readJsonDirectory<SourceRecord>(path.join(dir, 'data', 'sources'))),
    'sourceId',
    'source',
  );
  const contributors = dedupeById(
    entries.flatMap(([, dir]) => readJsonDirectory<ContributorRecord>(path.join(dir, 'data', 'contributors'))),
    'contributorId',
    'contributor',
  );
  const reviews = entries.flatMap(([, dir]) => readJsonDirectory<ReviewRecord>(path.join(dir, 'data', 'reviews')));
  const cases = dedupeById(
    entries.flatMap(([, dir]) => readJsonDirectory<CaseRecord>(path.join(dir, 'data', 'cases'))),
    'caseId',
    'case',
  );
  return {
    schemaVersion: 1,
    testOnly: false,
    entities,
    sources,
    contributors,
    reviews,
    cases,
  };
}

function isVisible(entity: ContentEntity, allowUnreviewed: boolean): boolean {
  if (entity.status === 'published') return true;
  if (!allowUnreviewed) return false;
  return entity.status === 'in-review' && entity.translations.length === 2;
}

function sectionOf(entity: ContentEntity): string {
  if (entity.kind === 'route') return 'routes';
  if (entity.kind === 'tool') return 'tools';
  const type = (entity.details as { contentType?: string }).contentType;
  if (type === 'glossary') return 'glossary';
  if (type === 'learning-path') return 'paths';
  return 'articles';
}

function createIndex(bundle: ContentBundle, allowUnreviewed: boolean): ContentIndex {
  const allEntities: ContentEntity[] = bundle.entities.map((entity) => ({
    ...entity,
    rendered: Object.fromEntries(
      entity.translations.map((translation) => [
        translation.locale,
        {
          ...translation,
          ...renderMarkdown(translation.body),
        } satisfies RenderedTranslation,
      ]),
    ),
  }));
  const visibleEntities = allEntities.filter((entity) => isVisible(entity, allowUnreviewed));
  const visibleMap = new Map(visibleEntities.map((entity) => [entity.entityId, entity]));
  const slugMap = new Map(visibleEntities.map((entity) => [`${entity.kind}/${entity.slug}`, entity]));
  const sourceMap = new Map(bundle.sources.map((source) => [source.sourceId, source]));
  const topics = (entity: ContentEntity): string[] => {
    if (entity.kind !== 'knowledge') return [];
    const details = entity.details as { primaryTopic?: string; secondaryTopics?: string[] };
    return [details.primaryTopic, ...(details.secondaryTopics ?? [])].filter(Boolean) as string[];
  };
  return {
    entities: visibleEntities,
    allEntities,
    sources: bundle.sources,
    contributors: bundle.contributors,
    reviews: bundle.reviews,
    cases: bundle.cases,
    preview: allowUnreviewed,
    byId(entityId) {
      return visibleMap.get(entityId);
    },
    bySlug(kind, slug) {
      return slugMap.get(`${kind}/${slug}`);
    },
    visible(kind) {
      return kind ? visibleEntities.filter((entity) => entity.kind === kind) : visibleEntities;
    },
    translation(entity, locale) {
      const rendered = entity.rendered[locale];
      if (!rendered) throw new Error(`Missing ${locale} translation for ${entity.entityId}`);
      return rendered;
    },
    sourcesFor(entity) {
      return entity.sourceRefs.map((id) => sourceMap.get(id)).filter((source): source is SourceRecord => Boolean(source));
    },
    related(entity) {
      return entity.relatedRefs
        .map((id) => visibleMap.get(id))
        .filter((item): item is ContentEntity => Boolean(item));
    },
    registry(): RegistryEntry[] {
      const rows: RegistryEntry[] = [];
      for (const entity of visibleEntities) {
        for (const locale of LOCALES) {
          const translation = entity.rendered[locale];
          if (!translation) continue;
          rows.push({
            entityId: entity.entityId,
            locale,
            kind: entity.kind,
            title: translation.title,
            summary: translation.summary,
            canonicalUrl: absoluteEntityUrl(entity.entityId, locale, entity.slug, sectionOf(entity)),
            topics: topics(entity),
            aliases: translation.aliases,
            dataVersion: `${entity.updatedAt}/${entity.status}`,
            slug: entity.slug,
            section: sectionOf(entity),
          });
        }
      }
      return rows;
    },
  };
}

const cache = new Map<string, ContentIndex>();

export function loadContent(options: LoadOptions): ContentIndex {
  const roots: ContentRoots = {
    routes: options.roots.routes ? path.resolve(options.roots.routes) : undefined,
    knowledge: options.roots.knowledge ? path.resolve(options.roots.knowledge) : undefined,
    tools: options.roots.tools ? path.resolve(options.roots.tools) : undefined,
  };
  const allowUnreviewed = options.allowUnreviewed ?? false;
  const key = JSON.stringify({ roots, allowUnreviewed, fixtures: options.allowTestFixtures ?? false });
  const cached = cache.get(key);
  if (cached) return cached;
  const bundle = buildBundle(roots);
  assertValidBundle(bundle, { allowTestFixtures: options.allowTestFixtures });
  const index = createIndex(bundle, allowUnreviewed);
  cache.set(key, index);
  return index;
}

export function defaultContentRoots(): ContentRoots {
  const reposRoot = process.env.PAOBU_REPOS_DIR
    ? path.resolve(process.env.PAOBU_REPOS_DIR)
    : path.resolve(process.cwd(), '..');
  return {
    routes: process.env.ROUTES_CONTENT_DIR
      ? path.resolve(process.env.ROUTES_CONTENT_DIR)
      : path.join(reposRoot, 'running-routes'),
    knowledge: process.env.KNOWLEDGE_CONTENT_DIR
      ? path.resolve(process.env.KNOWLEDGE_CONTENT_DIR)
      : path.join(reposRoot, 'running-knowledge'),
    tools: process.env.TOOLS_CONTENT_DIR
      ? path.resolve(process.env.TOOLS_CONTENT_DIR)
      : path.join(reposRoot, 'running-tools'),
  };
}

export function loadDefaultContent(allowUnreviewed: boolean): ContentIndex {
  return loadContent({ roots: defaultContentRoots(), allowUnreviewed });
}

export function articleSection(entity: ContentEntity): string {
  return sectionOf(entity);
}
