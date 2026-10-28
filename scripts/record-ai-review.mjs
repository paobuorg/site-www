import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { loadContent, defaultContentRoots } from '../packages/core/src/content/load.ts';
import { computeContentDigest } from '../packages/core/src/content/digest.ts';

const requireFromCore = createRequire(new URL('../packages/core/package.json', import.meta.url));
const matter = requireFromCore('gray-matter');

const roots = defaultContentRoots();
const repoForKind = {
  route: roots.routes,
  knowledge: roots.knowledge,
  tool: roots.tools,
};
const locales = ['zh-CN', 'en'];
const date = '2026-10-28';
const reviewerId = 'runmap-editorial';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readSources() {
  const sources = [];
  for (const repo of new Set(Object.values(repoForKind))) {
    const dir = path.join(repo, 'data', 'sources');
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).filter((item) => item.endsWith('.json'))) {
      sources.push(readJson(path.join(dir, name)));
    }
  }
  return sources;
}

function readTranslation(file, entityId, locale) {
  const parsed = matter(fs.readFileSync(file, 'utf8'));
  const data = parsed.data;
  if (data.entityId !== entityId) throw new Error(`Frontmatter entityId mismatch in ${file}`);
  if (data.locale !== locale) throw new Error(`Frontmatter locale mismatch in ${file}`);
  return {
    locale,
    title: String(data.title ?? '').trim(),
    summary: String(data.summary ?? '').trim(),
    body: parsed.content.replace(/\r\n?/g, '\n').trim(),
    aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : [],
    authors: Array.isArray(data.authors) ? data.authors.map(String) : [],
    reviewers: Array.isArray(data.reviewers) ? data.reviewers.map(String) : [],
    translationStatus: data.translationStatus === 'reviewed' ? 'reviewed' : 'draft',
  };
}

const sources = readSources();
const entityFiles = [];
for (const repo of new Set(Object.values(repoForKind))) {
  const dir = path.join(repo, 'data', 'entities');
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir).filter((item) => item.endsWith('.json'))) {
    entityFiles.push({ repo, file: path.join(dir, name), entity: readJson(path.join(dir, name)) });
  }
}

for (const { repo, file, entity } of entityFiles) {
  const entityJson = readJson(file);
  entityJson.status = 'published';
  entityJson.updatedAt = date;
  entityJson.reviewedAt = date;
  entityJson.reviewDueAt = entity.riskLevel === 'guidance' ? '2027-04-28' : '2027-10-28';
  fs.writeFileSync(file, `${JSON.stringify(entityJson, null, 2)}\n`);

  for (const locale of locales) {
    const contentFile = path.join(repo, 'content', locale, `${entity.slug}.md`);
    if (!fs.existsSync(contentFile)) throw new Error(`Missing ${entity.entityId}/${locale}`);
    const translation = readTranslation(contentFile, entity.entityId, locale);
    const digest = computeContentDigest(entity, translation, sources);

    let markdown = fs.readFileSync(contentFile, 'utf8');
    markdown = markdown.replace(/^reviewers:\s*\[.*?\]\s*$/m, `reviewers:\n  - ${reviewerId}`);
    markdown = markdown.replace(/^translationStatus:\s*.*$/m, 'translationStatus: reviewed');
    fs.writeFileSync(contentFile, markdown);

    const reviewDir = path.join(repo, 'data', 'reviews');
    fs.mkdirSync(reviewDir, { recursive: true });
    fs.writeFileSync(
      path.join(reviewDir, `${entity.slug}-${locale}.json`),
      `${JSON.stringify(
        {
          entityId: entity.entityId,
          locale,
          reviewerId,
          reviewedAt: date,
          decision: 'approve',
          contentDigest: digest,
        },
        null,
        2,
      )}\n`,
    );
  }

  const contributorFile = path.join(repo, 'data', 'contributors', 'runmap-editorial.json');
  if (fs.existsSync(contributorFile)) {
    const contributor = readJson(contributorFile);
    contributor.displayName = 'RunMap editorial desk (AI-assisted draft and review)';
    contributor.roles = [...new Set([...contributor.roles, 'editor'])].sort();
    contributor.qualification = null;
    fs.writeFileSync(contributorFile, `${JSON.stringify(contributor, null, 2)}\n`);
  }
}

const content = loadContent({ roots, allowUnreviewed: true });
console.log(`Recorded AI-assisted editorial approval for ${content.allEntities.length} entities (${date}).`);
