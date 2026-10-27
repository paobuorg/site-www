import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

interface SitemapAlternate {
  hreflang: string;
  href: string;
}

interface SitemapEntry {
  loc: string;
  alternates: SitemapAlternate[];
}

interface HostingOptions {
  distDir: string;
  origin: string;
  preview: boolean;
}

interface ManifestOptions extends HostingOptions {
  site: string;
  projectRoot: string;
  coreLockPath: string;
  contentLockPath: string;
  searchRecords: number;
  hosting: HostingResult;
}

export interface HostingResult {
  sitemapUrls: number;
  htmlPages: number;
}

const skippedDirectories = new Set(['_astro', 'pagefind', 'cesium', 'textures', 'node_modules']);

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const match of tag.matchAll(pattern)) {
    const name = match[1];
    if (!name) continue;
    attributes[name.toLowerCase()] = match[2] ?? match[3] ?? '';
  }
  return attributes;
}

function walkIndexFiles(directory: string, files: string[]): void {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) walkIndexFiles(path.join(directory, entry.name), files);
      continue;
    }
    if (entry.isFile() && entry.name === 'index.html') files.push(path.join(directory, entry.name));
  }
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function readHtmlLinks(html: string): {
  canonical: string | null;
  alternates: SitemapAlternate[];
  noindex: boolean;
} {
  let canonical: string | null = null;
  let noindex = false;
  const alternates: SitemapAlternate[] = [];
  for (const match of html.matchAll(/<meta\b[^>]*>|<link\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0]);
    if (match[0].toLowerCase().startsWith('<meta')) {
      if (attributes.name?.toLowerCase() === 'robots' && /(?:^|[\s,])noindex(?:$|[\s,])/i.test(attributes.content ?? '')) {
        noindex = true;
      }
      continue;
    }
    if (attributes.rel?.toLowerCase() === 'canonical' && attributes.href) {
      canonical = attributes.href;
    }
    if (attributes.rel?.toLowerCase() === 'alternate' && attributes.hreflang && attributes.href) {
      alternates.push({ hreflang: attributes.hreflang, href: attributes.href });
    }
  }
  return { canonical, alternates, noindex };
}

function collectSitemapEntries({ distDir, origin }: HostingOptions): { entries: SitemapEntry[]; htmlPages: number } {
  const files: string[] = [];
  walkIndexFiles(distDir, files);
  const byCanonical = new Map<string, SitemapEntry>();
  let htmlPages = 0;

  for (const file of files) {
    const relative = path.relative(distDir, file).split(path.sep).join('/');
    if (relative === '404.html' || relative.includes('/search/') || relative.startsWith('search/')) continue;
    htmlPages += 1;
    const html = fs.readFileSync(file, 'utf8');
    const { canonical, alternates, noindex } = readHtmlLinks(html);
    if (noindex || !canonical) continue;
    if (!canonical.startsWith(`${origin}/`)) continue;
    byCanonical.set(canonical, { loc: canonical, alternates });
  }

  const included = new Set(byCanonical.keys());
  const entries = [...byCanonical.values()]
    .map((entry) => ({
      ...entry,
      alternates: entry.alternates.filter((alternate) => included.has(alternate.href)),
    }))
    .sort((a, b) => a.loc.localeCompare(b.loc));

  return { entries, htmlPages };
}

function renderSitemap(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const lines = ['  <url>', `    <loc>${escapeXml(entry.loc)}</loc>`];
      for (const alternate of entry.alternates) {
        lines.push(
          `    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hreflang)}" href="${escapeXml(alternate.href)}"/>`,
        );
      }
      lines.push('  </url>');
      return lines.join('\n');
    })
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    urls,
    '</urlset>',
    '',
  ]
    .filter((line, index, lines) => line !== '' || index === lines.length - 1)
    .join('\n');
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

function writePwaFiles(distDir: string, origin: string): void {
  const host = new URL(origin).host;
  const token = createHash('sha256').update(`${host}:${Date.now()}:${origin}`).digest('hex').slice(0, 12);
  const offline = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>离线 · RunMap</title>
<style>
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100dvh; display: grid; place-items: center; background: radial-gradient(circle at 60% 30%, #154c58, #06101f 62%); color: #eef7f5; font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
main { width: min(92vw, 520px); padding: 32px; text-align: center; }
.mark { width: 64px; height: 64px; margin: 0 auto 18px; border-radius: 22px; display: grid; place-items: center; background: #08b89d; color: #062c29; font-size: 1.8rem; font-weight: 900; }
h1 { margin: 0 0 10px; font-size: 1.4rem; }
p { margin: 0 0 12px; color: #b9d3d0; line-height: 1.65; }
a { display: inline-flex; align-items: center; min-height: 46px; margin: 4px; padding: 0 20px; border-radius: 999px; background: #08b89d; color: #062c29; font-weight: 800; text-decoration: none; }
a.secondary { background: rgba(255,255,255,0.12); color: #eef7f5; }
</style>
</head>
<body>
<main>
<div class="mark">R</div>
<h1>当前离线</h1>
<p>当前页面没有可用的离线副本。恢复网络后可继续浏览；已访问过的页面可能仍可打开。</p>
<p lang="en">You are offline. This page has no cached copy. Reconnect to continue; previously visited pages may still be available.</p>
<a href="/zh-CN/">返回首页</a>
<a class="secondary" href="/en/" lang="en">English</a>
</main>
</body>
</html>
`;
  fs.writeFileSync(path.join(distDir, 'offline.html'), offline);
  const sw = `const CACHE = 'paobu-${host.replace(/[^a-z0-9]+/gi, '-')}-${token}';
const OFFLINE = '/offline.html';
const PRECACHE = [OFFLINE, '/favicon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function offlineBanner(cachedAt) {
  const when = cachedAt ? cachedAt.replace('T', ' ').replace(/\\.\\d+Z$/, ' UTC') : '未知时间';
  return '<div style="position:relative;z-index:99;padding:10px 14px;background:#f4d58a;color:#3b2b05;font:600 13px system-ui,sans-serif;text-align:center">离线副本 · 缓存于 ' + when + '</div>';
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/cesium/') || url.pathname.startsWith('/textures/') || url.pathname.startsWith('/pagefind/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const copy = response.clone();
          const headers = new Headers(copy.headers);
          headers.set('x-paobu-cached-at', new Date().toISOString());
          const body = await copy.blob();
          const cache = await caches.open(CACHE);
          await cache.put(request, new Response(body, { status: copy.status, statusText: copy.statusText, headers }));
        }
        return response;
      } catch {
        const cached = await caches.match(request);
        if (cached) {
          const html = await cached.text();
          return new Response(html.replace(/<body([^>]*)>/i, '<body$1>' + offlineBanner(cached.headers.get('x-paobu-cached-at'))), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
        return (await caches.match(OFFLINE)) || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  if (request.destination === 'style' || request.destination === 'font' || request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
  }
});
`;
  fs.writeFileSync(path.join(distDir, 'sw.js'), sw);
}

function readGitCommit(projectRoot: string): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

export function writeHostingFiles(options: HostingOptions): HostingResult {
  const { distDir, origin, preview } = options;
  if (!fs.existsSync(distDir)) throw new Error(`Missing build output directory: ${distDir}`);
  const { entries, htmlPages } = collectSitemapEntries(options);
  const host = new URL(origin).host;
  const sitemap = renderSitemap(entries);
  const robots = preview
    ? ['User-agent: *', 'Disallow: /', ''].join('\n')
    : ['User-agent: *', 'Allow: /', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n');

  fs.writeFileSync(path.join(distDir, 'CNAME'), `${host}\n`);
  fs.writeFileSync(path.join(distDir, '.nojekyll'), '');
  fs.writeFileSync(path.join(distDir, 'robots.txt'), robots);
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap);
  writePwaFiles(distDir, origin);

  if (fs.readFileSync(path.join(distDir, 'CNAME'), 'utf8').trim() !== host) {
    throw new Error('CNAME verification failed');
  }
  if (fs.readFileSync(path.join(distDir, 'robots.txt'), 'utf8') !== robots) {
    throw new Error('robots.txt verification failed');
  }
  if (!sitemap.includes('<urlset') || !sitemap.includes('</urlset>')) {
    throw new Error('sitemap.xml verification failed');
  }

  return { sitemapUrls: entries.length, htmlPages };
}

export function writeReleaseManifest(options: ManifestOptions): void {
  const { distDir, site, origin, preview, projectRoot, coreLockPath, contentLockPath, searchRecords, hosting } = options;
  const coreLock = readJson<{ version: string; artifact: string; sha256: string }>(coreLockPath);
  const contentLock = readJson<{
    primaryRepository: string;
    digestAlgorithm: string;
    repositories: Array<{ name: string; commit: string | null; digest: string; fileCount: number }>;
  }>(contentLockPath);
  const commit = readGitCommit(projectRoot);
  const bundleInput = {
    site,
    origin,
    preview,
    core: { version: coreLock.version, sha256: coreLock.sha256 },
    content: contentLock.repositories.map((repository) => ({
      name: repository.name,
      commit: repository.commit,
      digest: repository.digest,
    })),
    pages: hosting.htmlPages,
    searchRecords,
    sitemapUrls: hosting.sitemapUrls,
  };
  const siteBundleId = createHash('sha256').update(JSON.stringify(bundleInput)).digest('hex');
  const manifest = {
    schemaVersion: 1,
    site,
    origin,
    generatedAt: new Date().toISOString(),
    preview,
    siteBundleId,
    code: {
      commit,
      note: commit ? null : 'No Git commit in this local handoff.',
    },
    core: {
      version: coreLock.version,
      artifact: coreLock.artifact,
      sha256: coreLock.sha256,
    },
    content: {
      primaryRepository: contentLock.primaryRepository,
      digestAlgorithm: contentLock.digestAlgorithm,
      repositories: contentLock.repositories,
    },
    build: {
      htmlPages: hosting.htmlPages,
      searchRecords,
      sitemapUrls: hosting.sitemapUrls,
    },
    checks: {
      hostingFiles: 'passed',
      sitemap: 'passed',
      robots: preview ? 'preview-disallow' : 'production-allow',
    },
  };
  fs.writeFileSync(path.join(distDir, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}
