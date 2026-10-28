import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enrichSearchContent,
  cjkSearchGrams,
  normalizeNumberSeparators,
  pinyinSearchAliases,
  expandSearchAliases,
} from '../packages/core/src/content/search.ts';

test('CJK search grams cover runs up to four characters', () => {
  assert.equal(
    cjkSearchGrams('霍普金顿'),
    '霍 霍普 霍普金 霍普金顿 普 普金 普金顿 金 金顿 顿',
  );
  assert.equal(cjkSearchGrams('a 波士顿 b'), '波 波士 波士顿 士 士顿 顿');
});

test('enriched content keeps the original text and adds grams', () => {
  const enriched = enrichSearchContent('马拉松 42.195 公里');
  assert.ok(enriched.startsWith('马拉松 42.195 公里'));
  assert.ok(enriched.includes('马拉'));
  assert.ok(enriched.includes('马拉松'));
  assert.ok(enriched.includes('公里'));
  assert.ok(enriched.includes('42.195'));
});

test('English content keeps its text and gains the query bridge', () => {
  const enriched = enrichSearchContent('Boston Marathon course');
  assert.ok(enriched.startsWith('Boston Marathon course'));
  assert.ok(enriched.includes('how'));
  assert.ok(enriched.includes('should'));
  assert.ok(!enriched.includes('马拉'));
});

test('thousands separators get an unseparated search variant', () => {
  assert.equal(normalizeNumberSeparators('累计爬升 10,000 米'), '累计爬升 10000 米');
  const enriched = enrichSearchContent('累计爬升 10,000 米');
  assert.ok(enriched.includes('10,000'));
  assert.ok(enriched.includes('10000'));
});

test('pinyin aliases cover joined, spaced and grouped forms', () => {
  const aliases = pinyinSearchAliases('波士顿马拉松');
  assert.ok(aliases.includes('boshidunmalasong'));
  assert.ok(aliases.includes('bo shi dun ma la song'));
  assert.ok(aliases.includes('boshidun'));
  assert.ok(aliases.includes('malasong'));
  assert.ok(aliases.includes('bsdmls'));
  assert.deepEqual(pinyinSearchAliases('Boston Marathon'), []);
});

test('alias expansion keeps Latin aliases and adds pinyin variants', () => {
  const aliases = expandSearchAliases(['波士顿马拉松', 'Boston Marathon', '  ']);
  assert.ok(aliases.includes('波士顿马拉松'));
  assert.ok(aliases.includes('Boston Marathon'));
  assert.ok(aliases.includes('boshidunmalasong'));
  assert.equal(new Set(aliases).size, aliases.length);
});
