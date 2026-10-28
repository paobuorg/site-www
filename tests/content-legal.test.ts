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
  /\bRunMap\b/,
  /跑地图/,
  /editorial desk/i,
  /AI-assisted/i,
  /AI 辅助/,
  /\/zh-CN\//,
];

test('published content carries CC BY 4.0 and no editorial-desk or AI-facing copy', () => {
  assert.equal(content.allEntities.length, 79);
  assert.equal(content.reviews.length, 158);
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

test('the public brand is 跑起来 / RUNUP with the Douke bean mark', () => {
  const logo = fs.readFileSync(
    path.join(siteRoot, 'packages', 'core', 'src', 'components', 'Logo.astro'),
    'utf8',
  );
  assert.match(logo, /跑起来/);
  assert.match(logo, /RUNUP/);
  assert.match(logo, /Bean/);
  assert.doesNotMatch(logo, /跑地图|RunMap/);

  const bean = fs.readFileSync(
    path.join(siteRoot, 'packages', 'core', 'src', 'components', 'Bean.astro'),
    'utf8',
  );
  for (const expression of [
    'neutral',
    'run',
    'cheer',
    'tired',
    'hydrate',
    'pr',
    'lost',
    'wave',
    'map',
    'book',
    'tool',
    'search',
    'sleep',
  ]) {
    assert.match(bean, new RegExp(`expression === '${expression}'`), expression);
  }

  const favicon = fs.readFileSync(path.join(siteRoot, 'public', 'favicon.svg'), 'utf8');
  assert.match(favicon, /aria-label="跑起来 RUNUP"/);

  const manifest = JSON.parse(
    fs.readFileSync(path.join(siteRoot, 'public', 'manifest.webmanifest'), 'utf8'),
  ) as { name: string; icons: Array<{ src: string; sizes: string; purpose: string }> };
  assert.equal(manifest.name, '跑起来 RUNUP');
  assert.ok(manifest.icons.some((icon) => icon.src === '/icon-192.png' && icon.sizes === '192x192'));
  assert.ok(manifest.icons.some((icon) => icon.src === '/icon-512.png' && icon.sizes === '512x512'));
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));
  for (const icon of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) {
    assert.ok(fs.statSync(path.join(siteRoot, 'public', icon)).size > 0, icon);
  }

  const footer = fs.readFileSync(
    path.join(siteRoot, 'packages', 'core', 'src', 'components', 'Footer.astro'),
    'utf8',
  );
  assert.match(footer, /跑起来 RUNUP/);

  const layout = fs.readFileSync(
    path.join(siteRoot, 'packages', 'core', 'src', 'layouts', 'BaseLayout.astro'),
    'utf8',
  );
  assert.match(layout, /og:site_name" content="RUNUP"/);
  assert.match(layout, /apple-touch-icon/);
});

test('AdSense is optional, production-only and limited to content detail pages', () => {
  const layout = fs.readFileSync(
    path.join(siteRoot, 'packages', 'core', 'src', 'layouts', 'BaseLayout.astro'),
    'utf8',
  );
  assert.match(layout, /PUBLIC_ADSENSE_CLIENT/);
  assert.match(layout, /google-adsense-account/);
  assert.match(layout, /footerAd/);
  assert.match(layout, /!preview/);

  const footerAd = fs.readFileSync(
    path.join(siteRoot, 'packages', 'core', 'src', 'components', 'FooterAd.astro'),
    'utf8',
  );
  assert.match(footerAd, /PUBLIC_ADSENSE_SLOT/);
  assert.match(footerAd, /data-ad-slot/);
  assert.match(footerAd, /IntersectionObserver/);

  const detailPages = [
    path.join(siteRoot, 'src', 'pages', '[...locale]', 'routes', '[slug].astro'),
  ];
  for (const page of detailPages) {
    assert.match(fs.readFileSync(page, 'utf8'), /footerAd/, page);
  }

  const release = fs.readFileSync(
    path.join(siteRoot, 'packages', 'core', 'src', 'lib', 'release.ts'),
    'utf8',
  );
  assert.match(release, /ads\.txt/);
  assert.match(release, /google\.com, \$\{publisherId\}/);

  const legal = fs.readFileSync(
    path.join(siteRoot, 'packages', 'core', 'src', 'components', 'LegalPage.astro'),
    'utf8',
  );
  assert.match(legal, /adsenseEnabled/);
});
