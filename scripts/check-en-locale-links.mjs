#!/usr/bin/env node
/**
 * 英文侧站内链接 locale 前缀检查。
 * 扫描 content/en/*.md 里所有站内链接，凡是没有 /en/ 前缀的都报出来，
 * 因为这些链接从英文页面点出去会落到中文页。
 *
 * 用法：
 *   node scripts/check-en-locale-links.mjs           # 只检查，有问题 exit 1
 *   node scripts/check-en-locale-links.mjs --fix     # 自动补 /en/ 后复查
 *
 * 同时导出 collectEnLocaleLinkProblems()，供 site-www 的 test:content 复用同一套规则。
 */
import fs from 'node:fs';
import path from 'node:path';

const scriptRoot = path.resolve(import.meta.dirname, '../../..');
const repos = ['running-knowledge', 'running-routes', 'running-tools'];
const internals = [
  'https://learn.paobu.org',
  'https://tools.paobu.org',
  'https://paobu.org',
];
const assetPattern = /\.(?:png|jpe?g|svg|gif|webp|ico|xml|txt|json|pdf|webmanifest)$/i;

function scanFile(repo, name, text) {
  const hits = [];
  const file = path.posix.join('repos', repo, 'content', 'en', name);
  text.split('\n').forEach((line, index) => {
    for (const prefix of internals) {
      const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`${escaped}(?![\\w.-])(/[^\\s)\\]"'<>]*)?`, 'g');
      for (const match of line.matchAll(re)) {
        const url = match[0];
        const rest = url.slice(prefix.length);
        if (!rest) continue;
        if (assetPattern.test(rest)) continue;
        if (rest === '/en' || rest.startsWith('/en/')) continue;
        if (rest.startsWith('/pagefind/')) continue;
        hits.push({ file, line: index + 1, original: url, suggested: `${prefix}/en${rest}` });
      }
    }
    for (const match of line.matchAll(/\]\((\/[^\s)"'<>]*)/g)) {
      const url = match[1];
      if (url === '/en' || url.startsWith('/en/')) continue;
      if (assetPattern.test(url)) continue;
      if (url.startsWith('/pagefind/')) continue;
      hits.push({ file, line: index + 1, original: url, suggested: `/en${url}` });
    }
  });
  return hits;
}

export function collectEnLocaleLinkProblems(rootDir = scriptRoot) {
  const hits = [];
  for (const repo of repos) {
    const dir = path.join(rootDir, 'repos', repo, 'content', 'en');
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.md')) continue;
      hits.push(...scanFile(repo, name, fs.readFileSync(path.join(dir, name), 'utf8')));
    }
  }
  return hits;
}

export function applyEnLocaleLinkFix(rootDir = scriptRoot) {
  const hits = collectEnLocaleLinkProblems(rootDir);
  const byFile = new Map();
  for (const hit of hits) {
    const absolute = path.join(rootDir, hit.file);
    if (!byFile.has(absolute)) byFile.set(absolute, new Set());
    byFile.get(absolute).add(hit.original);
  }
  for (const [absolute, originals] of byFile) {
    let text = fs.readFileSync(absolute, 'utf8');
    for (const original of originals) {
      const suggested = original.startsWith('/')
        ? `/en${original}`
        : original.replace(/^(https:\/\/[a-z.]*paobu\.org)/, '$1/en');
      text = text.split(original).join(suggested);
    }
    fs.writeFileSync(absolute, text);
  }
  return { links: hits.length, files: byFile.size };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename);
if (isMain) {
  if (process.argv.includes('--fix')) {
    const result = applyEnLocaleLinkFix();
    console.log(`Fixed ${result.links} link(s) in ${result.files} file(s).`);
  }
  const remaining = collectEnLocaleLinkProblems();
  if (remaining.length === 0) {
    console.log('en locale links: OK (0 internal links missing /en/).');
    process.exit(0);
  }
  for (const hit of remaining) {
    console.log(`${hit.file}:${hit.line}  ${hit.original}  ->  ${hit.suggested}`);
  }
  console.log(`en locale links: ${remaining.length} problem(s) in ${new Set(remaining.map((h) => h.file)).size} file(s).`);
  process.exit(1);
}
