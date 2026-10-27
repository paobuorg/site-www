import assert from 'node:assert/strict';
import test from 'node:test';

process.env.PUBLIC_ROUTES_ORIGIN = 'https://routes.test';
process.env.PUBLIC_KNOWLEDGE_ORIGIN = 'https://learn.test';
process.env.PUBLIC_TOOLS_ORIGIN = 'https://tools.test';

const { loadContent, defaultContentRoots, renderMarkdown } = await import(
  '../packages/core/src/content/load.ts'
);
const content = loadContent({ roots: defaultContentRoots(), allowUnreviewed: true });
const boston = content.bySlug('route', 'boston');
const easyRun = content.bySlug('knowledge', 'easy-run');
const pace = content.bySlug('tool', 'pace');
if (!boston || !easyRun || !pace) throw new Error('Expected sample content to load');

const bostonHtml = content.translation(boston, 'zh-CN').html;
const easyRunHtml = content.translation(easyRun, 'zh-CN').html;
const paceHtml = content.translation(pace, 'en').html;

test('route body links resolve to the knowledge and tools origins', () => {
  assert.match(bostonHtml, /href="https:\/\/learn\.test\/zh-CN\/articles\/marathon-distance\/"/);
  assert.match(bostonHtml, /href="https:\/\/tools\.test\/zh-CN\/tools\/pace\/"/);
  assert.doesNotMatch(bostonHtml, /href="\/zh-CN\/(?:knowledge|tools)\//);
});

test('cross-site content links do not open a new tab', () => {
  assert.doesNotMatch(bostonHtml, /href="https:\/\/learn\.test[^"]*"[^>]*target="_blank"/);
  assert.doesNotMatch(bostonHtml, /href="https:\/\/tools\.test[^"]*"[^>]*target="_blank"/);
});

test('knowledge body links resolve to the tools origin', () => {
  assert.match(easyRunHtml, /href="https:\/\/tools\.test\/zh-CN\/tools\/pace\/"/);
  assert.doesNotMatch(easyRunHtml, /href="\/zh-CN\/tools\//);
});

test('tool body links stay on the tools origin and external sources open a new tab', () => {
  assert.match(paceHtml, /href="https:\/\/tools\.test\/en\/tools\/splits\/"/);
  assert.doesNotMatch(paceHtml, /href="\/en\/tools\//);
  const rendered = renderMarkdown(
    '[external](https://example.com/source) [search](/en/search/) [pace](/en/tools/pace/)',
  );
  assert.match(rendered.html, /href="https:\/\/example\.com\/source"[^>]*target="_blank"/);
  assert.match(rendered.html, /target="_blank"[^>]*rel="external noopener noreferrer"/);
  assert.match(rendered.html, /href="\/en\/search\/"/);
  assert.match(rendered.html, /href="https:\/\/tools\.test\/en\/tools\/pace\/"/);
  assert.doesNotMatch(rendered.html, /href="https:\/\/tools\.test[^"]*"[^>]*target="_blank"/);
});
