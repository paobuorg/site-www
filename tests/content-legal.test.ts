import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, defaultContentRoots } from '../packages/core/src/content/load.ts';

const siteRoot = path.join(import.meta.dirname, '..');
const roots = defaultContentRoots();
const content = loadContent({ roots, allowUnreviewed: true });

const forbidden = [
  /RunMap 编辑台/,
  /editorial desk/i,
  /AI-assisted/i,
  /AI 辅助/,
  /\/zh-CN\//,
];

test('published content carries CC BY 4.0 and no editorial-desk or AI-facing copy', () => {
  assert.equal(content.allEntities.length, 76);
  assert.equal(content.reviews.length, 152);
  for (const entity of content.allEntities) {
    assert.equal(entity.license, 'CC-BY-4.0', entity.entityId);
    for (const translation of entity.translations) {
      for (const pattern of forbidden) {
        assert.ok(
          !pattern.test(translation.body),
          `${entity.entityId}/${translation.locale} contains ${pattern}`,
        );
      }
    }
  }
});

test('content repositories state CC BY 4.0 and the site code states MIT', () => {
  const contentRoots = [roots.routes, roots.knowledge, roots.tools].filter(
    (dir): dir is string => Boolean(dir),
  );
  assert.equal(contentRoots.length, 3);
  for (const dir of contentRoots) {
    const licence = fs.readFileSync(path.join(dir, 'LICENSE'), 'utf8');
    assert.match(licence, /CC BY 4\.0/);
  }
  const licence = fs.readFileSync(path.join(siteRoot, 'LICENSE'), 'utf8');
  assert.match(licence, /MIT License/);
  const legal = fs.readFileSync(
    path.join(siteRoot, 'src', 'pages', '[...locale]', 'legal', 'index.astro'),
    'utf8',
  );
  assert.match(legal, /LegalPage/);
});

test('shared footer and legal page link to the licence page', () => {
  const footer = fs.readFileSync(
    path.join(siteRoot, 'packages', 'core', 'src', 'components', 'Footer.astro'),
    'utf8',
  );
  assert.match(footer, /legal\//);
  const legalPage = fs.readFileSync(
    path.join(siteRoot, 'packages', 'core', 'src', 'components', 'LegalPage.astro'),
    'utf8',
  );
  assert.match(legalPage, /CC BY 4\.0/);
  assert.match(legalPage, /MIT/);
  assert.match(legalPage, /免责|disclaimer|liability|责任/i);
});
