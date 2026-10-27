import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, defaultContentRoots } from '../packages/core/src/content/load.ts';

type Case = {
  locale: 'zh-CN' | 'en';
  query: string;
  expected: string[];
  category: 'title' | 'alias' | 'pinyin' | 'long' | 'body' | 'filter';
  kind?: 'route' | 'knowledge' | 'tool';
};

const fixture = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, 'search-acceptance.json'), 'utf8'),
) as { threshold: number; topN: number; cases: Case[] };
const content = loadContent({ roots: defaultContentRoots(), allowUnreviewed: true });
const slugs = new Set(content.entities.map((entity) => entity.slug));
const categories = new Set(['title', 'alias', 'pinyin', 'long', 'body', 'filter']);
const kinds = new Set(['route', 'knowledge', 'tool']);

test('search acceptance set meets the plan minimum and coverage', () => {
  assert.equal(fixture.threshold, 0.9);
  assert.equal(fixture.topN, 5);
  for (const locale of ['zh-CN', 'en'] as const) {
    const cases = fixture.cases.filter((item) => item.locale === locale);
    assert.ok(cases.length >= 50, `${locale} has ${cases.length} queries`);
    assert.equal(
      new Set(cases.map((item) => `${item.query}\u0000${item.kind ?? ''}`)).size,
      cases.length,
    );
    assert.deepEqual(new Set(cases.map((item) => item.category)), categories);
  }
  assert.ok(fixture.cases.length >= 100);
});

test('every expected slug and filter is valid content', () => {
  for (const item of fixture.cases) {
    assert.ok(item.expected.length > 0, item.query);
    for (const slug of item.expected) assert.ok(slugs.has(slug), `${item.query} -> ${slug}`);
    if (item.kind) assert.ok(kinds.has(item.kind), item.query);
    if (item.category === 'filter') assert.ok(item.kind, `${item.query} needs a kind filter`);
  }
});

test('the 90 percent threshold leaves room for at most the expected misses', () => {
  for (const locale of ['zh-CN', 'en'] as const) {
    const cases = fixture.cases.filter((item) => item.locale === locale);
    const required = Math.ceil(cases.length * fixture.threshold);
    assert.ok(required <= cases.length);
    assert.ok(required / cases.length >= 0.9);
  }
});
