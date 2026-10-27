import { loadContent, defaultContentRoots } from '../packages/core/src/content/load.ts';

const roots = defaultContentRoots();
const preview = loadContent({ roots, allowUnreviewed: true });
const production = loadContent({ roots, allowUnreviewed: false });

const problems = [];
for (const entity of preview.allEntities) {
  if (entity.translations.length !== 2) {
    problems.push(`${entity.entityId} has ${entity.translations.length} translation(s), expected 2.`);
  }
  for (const locale of ['zh-CN', 'en']) {
    const rendered = entity.rendered[locale];
    if (!rendered) {
      problems.push(`${entity.entityId} is missing rendered ${locale} content.`);
      continue;
    }
    if (rendered.plainText.length < 200) {
      problems.push(`${entity.entityId} ${locale} body is suspiciously short (${rendered.plainText.length} characters).`);
    }
  }
}

const counts = {};
for (const entity of preview.allEntities) {
  counts[entity.kind] = (counts[entity.kind] ?? 0) + 1;
}

console.log(`Content roots: ${roots.routes}, ${roots.knowledge}, ${roots.tools}`);
console.log(`Entities: ${preview.allEntities.length} (${Object.entries(counts).map(([kind, count]) => `${kind} ${count}`).join(', ')})`);
console.log(`Sources: ${preview.sources.length}; contributors: ${preview.contributors.length}; cases: ${preview.cases.length}`);
console.log(`Preview-visible entities: ${preview.entities.length}`);
console.log(`Production-visible entities: ${production.entities.length}`);

if (problems.length > 0) {
  for (const problem of problems) console.error(`- ${problem}`);
  process.exitCode = 1;
} else {
  console.log('Content validation passed.');
}
