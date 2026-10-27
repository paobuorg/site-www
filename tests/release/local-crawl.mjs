import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const date = new Date().toISOString().slice(0, 10);
const outRoot =
  process.env.QA_CRAWL_OUT ?? path.join(repoRoot, 'evidence', date, 'local-acceptance');
const sites = [
  { id: 'routes', origin: 'https://paobu.org', port: 4421 },
  { id: 'knowledge', origin: 'https://learn.paobu.org', port: 4422 },
  { id: 'tools', origin: 'https://tools.paobu.org', port: 4423 },
];

function parseAttributes(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    const name = match[1];
    if (name) attributes[name.toLowerCase()] = match[2] ?? match[3] ?? '';
  }
  return attributes;
}

function localUrl(origin, site, target) {
  const url = new URL(target, origin);
  if (url.origin !== origin) return null;
  return `http://localhost:${site.port}${url.pathname}${url.search}`;
}

const results = [];
const failures = [];
for (const site of sites) {
  // Read the sitemap from this site's own build, not site-www's.
  const input = path.join(repoRoot, '..', `site-${site.id === 'routes' ? 'www' : site.id}`, 'dist', 'sitemap.xml');
  const siteSitemap = fs.readFileSync(input, 'utf8');
  const siteUrls = [...siteSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  for (const canonical of siteUrls) {
    const target = localUrl(site.origin, site, canonical);
    if (!target) {
      failures.push(`${site.id}: sitemap URL outside origin ${canonical}`);
      continue;
    }
    let response;
    try {
      response = await fetch(target);
    } catch (error) {
      failures.push(`${site.id}: request failed ${canonical}: ${error.message}`);
      continue;
    }
    const html = await response.text();
    const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => parseAttributes(match[0]));
    const canonicalHref = links.find((attributes) => attributes.rel?.toLowerCase() === 'canonical')?.href;
    const alternates = links.filter((attributes) => attributes.rel?.toLowerCase() === 'alternate' && attributes.hreflang);
    const noindex = /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
    const title = html.match(/<title>(.*?)<\/title>/s)?.[1] ?? '';
    const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
    const checks = {
      status: response.status,
      canonical: canonicalHref === canonical,
      alternates: alternates.length >= 2,
      noindex: !noindex,
      title: title.length > 0,
      h1: h1.length > 0,
      noLocalhost: !/https?:\/\/(?:localhost|127\.0\.0\.1)[:/]/.test(html),
    };
    for (const [name, pass] of Object.entries(checks)) {
      if (name === 'status') {
        if (pass !== 200) failures.push(`${site.id}: HTTP ${pass} ${canonical}`);
      } else if (!pass) {
        failures.push(`${site.id}: ${name} failed ${canonical}`);
      }
    }
    results.push({ site: site.id, url: canonical, local: target, ...checks, title, h1 });
  }
}

for (const site of sites) {
  for (const asset of ['/favicon.svg', '/manifest.webmanifest', '/sw.js', '/offline.html', '/robots.txt', '/sitemap.xml']) {
    const response = await fetch(`http://localhost:${site.port}${asset}`).catch(() => null);
    if (!response || !response.ok) failures.push(`${site.id}: asset ${asset} failed`);
  }
}

fs.mkdirSync(outRoot, { recursive: true });
fs.writeFileSync(
  path.join(outRoot, 'crawl.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), results, failures }, null, 2)}\n`,
);
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`local crawl passed: ${results.length} sitemap pages across ${sites.length} sites.`);
