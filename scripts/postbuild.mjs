import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { loadLocalEnv, projectRoot } from './load-env.mjs';

loadLocalEnv();

const { loadContent, defaultContentRoots, articleSection } = await import(
  '../packages/core/src/content/load.ts'
);
const { enrichSearchContent, expandSearchAliases } = await import(
  '../packages/core/src/content/search.ts'
);
const { absoluteEntityUrl } = await import('../packages/core/src/lib/routing.ts');
const { TOPIC_META } = await import('../packages/core/src/lib/i18n.ts');
const { writeHostingFiles, writeReleaseManifest } = await import('../packages/core/src/lib/release.ts');
const { createIndex, close } = await import('pagefind');

const distDir = path.join(projectRoot, 'dist');
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  throw new Error('dist/index.html is missing. Run astro build before postbuild.');
}

const allowUnreviewed = process.env.PREVIEW_UNREVIEWED === '1';
const content = loadContent({
  roots: defaultContentRoots(),
  allowUnreviewed,
});
const localeLanguage = { 'zh-CN': 'zh', en: 'en' };
const siteForKind = { route: 'routes', knowledge: 'knowledge', tool: 'tools' };

const siteLabels = { routes: 'routes', knowledge: 'knowledge', tools: 'tools' };
const records = [];

for (const entity of content.entities) {
  for (const locale of ['zh-CN', 'en']) {
    const translation = content.translation(entity, locale);
    const other = content.translation(entity, locale === 'zh-CN' ? 'en' : 'zh-CN');
    const aliases = new Set([other.title, ...translation.aliases]);
    if (entity.kind === 'route') {
      const details = entity.details;
      aliases.add(details.placeName['zh-CN']);
      aliases.add(details.placeName.en);
      aliases.add(details.countryCodes.join(' '));
      aliases.add(details.courseVersion);
    }
    if (entity.kind === 'knowledge') {
      const details = entity.details;
      for (const topic of [details.primaryTopic, ...(details.secondaryTopics ?? [])]) {
        const meta = TOPIC_META[topic];
        if (meta) {
          aliases.add(meta.zh);
          aliases.add(meta.en);
        }
      }
      aliases.add(details.contentType);
    }
    if (entity.kind === 'tool') {
      aliases.add(entity.slug.replace(/-/g, ' '));
      aliases.add(entity.details.specVersion);
    }

    const aliasText = expandSearchAliases([
      translation.title,
      translation.summary,
      ...[...aliases].filter(Boolean),
    ]);
    const body = enrichSearchContent(
      `${translation.title}\n${translation.summary}\n\n${translation.plainText}\n\n${aliasText.join(' ')}`,
    );
    const site = siteForKind[entity.kind];
    records.push({
      url: absoluteEntityUrl(entity.entityId, locale, entity.slug, articleSection(entity)),
      content: body,
      language: localeLanguage[locale],
      meta: {
        title: translation.title,
        summary: translation.summary,
        kind: entity.kind,
        site,
        locale,
        status: entity.status,
        preview: entity.status === 'published' ? '0' : '1',
      },
      filters: {
        locale: [locale],
        kind: [entity.kind],
        site: [siteLabels[site]],
      },
    });
  }
}

if (records.length === 0) {
  console.warn('No visible content records. Search index will contain zero content records.');
}

const pagefindDir = path.join(distDir, 'pagefind');
fs.rmSync(pagefindDir, { recursive: true, force: true });

const created = await createIndex({ verbose: false });
if (!created.index) {
  throw new Error(`Pagefind could not create an index: ${created.errors.join('; ')}`);
}
let added = 0;
for (const record of records) {
  const response = await created.index.addCustomRecord(record);
  if (response.errors.length > 0) {
    throw new Error(`Pagefind record ${record.url}: ${response.errors.join('; ')}`);
  }
  added += 1;
}
const written = await created.index.writeFiles({ outputPath: pagefindDir });
if (written.errors.length > 0) {
  throw new Error(`Pagefind write failed: ${written.errors.join('; ')}`);
}
await close();

const manifest = {
  generatedAt: new Date().toISOString(),
  preview: allowUnreviewed,
  recordCount: added,
  contentEntities: content.entities.length,
  dataVersion: content.registry().map((entry) => `${entry.entityId}:${entry.locale}:${entry.dataVersion}`),
};
fs.writeFileSync(path.join(distDir, 'search-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const registry = content.registry().map((entry) => ({
  ...entry,
  aliases: [
    ...new Set([
      ...entry.aliases,
      content.translation(content.byId(entry.entityId), entry.locale === 'zh-CN' ? 'en' : 'zh-CN').title,
    ]),
  ],
}));
fs.writeFileSync(path.join(distDir, 'content-registry.json'), `${JSON.stringify(registry, null, 2)}\n`);

const digest = createHash('sha256');
for (const record of records) digest.update(`${record.url}\n${record.meta.title}\n`);
console.log(
  `Pagefind indexed ${added} records (${content.entities.length} preview-visible entities, preview=${allowUnreviewed}).`,
);
console.log(`Search snapshot digest: ${digest.digest('hex').slice(0, 16)}`);

const origin = 'https://paobu.org';
const hosting = writeHostingFiles({ distDir, origin, preview: allowUnreviewed });
writeReleaseManifest({
  distDir,
  origin,
  preview: allowUnreviewed,
  site: 'routes',
  projectRoot,
  coreLockPath: path.join(projectRoot, 'core-dist', 'core.lock.json'),
  contentLockPath: path.join(projectRoot, 'content.lock.json'),
  searchRecords: added,
  hosting,
});
console.log(`Hosting files: ${hosting.sitemapUrls} sitemap URLs across ${hosting.htmlPages} HTML pages.`);
