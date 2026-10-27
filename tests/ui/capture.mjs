import { chromium, firefox, webkit } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const date = new Date().toISOString().slice(0, 10);
const browserName = process.env.QA_BROWSER ?? 'chromium';
const outRoot =
  process.env.QA_OUT ??
  path.join(repoRoot, 'evidence', date, browserName === 'chromium' ? 'ui' : `ui-${browserName}`);
const axePath = path.join(repoRoot, 'node_modules', 'axe-core', 'axe.min.js');
const axeSource = await readFile(axePath, 'utf8');

const origins = {
  routes: 4421,
  knowledge: 4422,
  tools: 4423,
};

const viewports = {
  desktop: {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};

const locales = ['zh-CN', 'en'];
const localePath = (locale) => (locale === 'zh-CN' ? '' : '/en');
const themes = ['light', 'dark'];

const pages = [
  { id: 'home', origin: 'routes', path: (locale) => `${localePath(locale)}/` },
  { id: 'route', origin: 'routes', path: (locale) => `${localePath(locale)}/routes/boston/` },
  { id: 'knowledge', origin: 'knowledge', path: (locale) => `${localePath(locale)}/` },
  { id: 'article', origin: 'knowledge', path: (locale) => `${localePath(locale)}/articles/easy-run/` },
  { id: 'tools', origin: 'tools', path: (locale) => `${localePath(locale)}/` },
  { id: 'tool', origin: 'tools', path: (locale) => `${localePath(locale)}/tools/pace/` },
];

const searchPage = {
  id: 'search',
  origin: 'routes',
  path: (locale) => `${localePath(locale)}/search/?q=${encodeURIComponent(locale === 'zh-CN' ? '马拉松' : 'marathon')}`,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyPreferences(context, theme) {
  await context.addCookies(
    Object.values(origins).map((port) => ({
      name: 'paobu_theme',
      value: theme,
      url: `http://localhost:${port}`,
    })),
  );
}

function pageUrl(definition, locale) {
  return `http://localhost:${origins[definition.origin]}${definition.path(locale)}`;
}

async function checkServers() {
  for (const [name, port] of Object.entries(origins)) {
    const url = `http://localhost:${port}/`;
    let response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    } catch (error) {
      throw new Error(`Preview server ${name} is not reachable at ${url}: ${error.message}`);
    }
    if (!response.ok) throw new Error(`Preview server ${name} returned ${response.status} at ${url}`);
  }
}

async function waitForPage(page, id) {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => document.fonts.ready);
  if (id === 'home' || id === 'route') {
    await page
      .waitForFunction(
        () => {
          const loading = document.querySelector('.globe-loading');
          const fallback = document.querySelector('.globe-fallback, .route-map-fallback');
          return (
            (loading && getComputedStyle(loading).display === 'none') ||
            (fallback && !fallback.hidden)
          );
        },
        null,
        { timeout: 15000 },
      )
      .catch(() => {});
  }
  if (id === 'search') {
    await page
      .waitForFunction(() => document.querySelectorAll('.search-result').length > 0, null, {
        timeout: 15000,
      })
      .catch(() => {});
  }
  await sleep(350);
}

async function scanAxe(page) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const result = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    return {
      violations: result.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.length,
        targets: violation.nodes.slice(0, 4).map((node) => ({
          target: node.target.join(' '),
          html: node.html,
          summary: node.failureSummary,
        })),
      })),
      passes: result.passes.length,
      incomplete: result.incomplete.length,
    };
  });
}

async function pageFacts(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const imagesWithoutAlt = [...document.images].filter(
      (image) => isVisible(image) && !image.hasAttribute('alt'),
    ).length;
    const buttonsWithoutName = [...document.querySelectorAll('button')].filter(
      (button) =>
        isVisible(button) &&
        !(button.textContent.trim() || button.getAttribute('aria-label') || button.getAttribute('title')),
    ).length;
    const linksWithoutName = [...document.querySelectorAll('a[href]')].filter(
      (link) =>
        isVisible(link) &&
        !(link.textContent.trim() || link.getAttribute('aria-label') || link.getAttribute('title')),
    ).length;
    const keyControls = [
      ...document.querySelectorAll(
        '.header-actions a, .header-actions button, .bottom-nav a, .filter-chip, .button, .icon-button, .globe-controls button, .language-switch, .search-field button',
      ),
    ];
    const smallKeyTargets = keyControls
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44))
      .map(({ element, rect }) => ({
        label: (element.getAttribute('aria-label') || element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      }));
    return {
      title: document.title,
      lang: document.documentElement.lang,
      theme: document.documentElement.dataset.theme,
      themePreference: document.documentElement.dataset.themePreference,
      h1: [...document.querySelectorAll('h1')].map((heading) => heading.textContent.trim()),
      landmarks: {
        header: Boolean(document.querySelector('header')),
        nav: Boolean(document.querySelector('nav')),
        main: Boolean(main),
        footer: Boolean(document.querySelector('footer')),
      },
      skipLink: Boolean(document.querySelector('a[href="#main-content"]')),
      imagesWithoutAlt,
      buttonsWithoutName,
      linksWithoutName,
      smallKeyTargets,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
}

async function keyboardSequence(page, steps = 14) {
  const sequence = [];
  let attempts = 0;
  while (sequence.length < steps && attempts < steps * 4) {
    attempts += 1;
    await page.keyboard.press('Tab');
    const item = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element) return null;
      const tag = element.tagName.toLowerCase();
      const style = getComputedStyle(element);
      const field = element.closest('.search-field');
      const fieldStyle = field ? getComputedStyle(field) : null;
      const siblingStyle = element.nextElementSibling
        ? getComputedStyle(element.nextElementSibling)
        : null;
      return {
        tag,
        text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
        ariaLabel: element.getAttribute('aria-label'),
        href: element.getAttribute('href'),
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow,
        borderColor: style.borderColor,
        fieldBorderColor: fieldStyle?.borderColor ?? null,
        fieldBoxShadow: fieldStyle?.boxShadow ?? null,
        siblingOutlineStyle: siblingStyle?.outlineStyle ?? null,
        siblingBoxShadow: siblingStyle?.boxShadow ?? null,
      };
    });
    if (item && item.tag !== 'body' && item.tag !== 'html') sequence.push(item);
  }
  return sequence;
}

async function systemThemeCheck(browser, colorScheme) {
  const context = await browser.newContext({
    ...viewports.desktop,
    colorScheme,
  });
  await context.addCookies([
    { name: 'paobu_theme', value: 'system', url: `http://localhost:${origins.routes}` },
    { name: 'paobu_theme', value: 'system', url: `http://localhost:${origins.knowledge}` },
    { name: 'paobu_theme', value: 'system', url: `http://localhost:${origins.tools}` },
  ]);
  const page = await context.newPage();
  await page.goto(`http://localhost:${origins.routes}/`, { waitUntil: 'domcontentloaded' });
  await waitForPage(page, 'home');
  const result = await page.evaluate(() => ({
    preference: document.documentElement.dataset.themePreference,
    theme: document.documentElement.dataset.theme,
    scheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  }));
  await context.close();
  return { colorScheme, ...result };
}

async function reducedMotionCheck(browser) {
  const context = await browser.newContext({
    ...viewports.desktop,
    reducedMotion: 'reduce',
  });
  await applyPreferences(context, 'light');
  const page = await context.newPage();
  await page.goto(`http://localhost:${origins.routes}/`, { waitUntil: 'domcontentloaded' });
  await waitForPage(page, 'home');
  const before = await page.evaluate(() => ({
    matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    pressed: document.querySelector('[data-globe-rotate]')?.getAttribute('aria-pressed'),
  }));
  await page.locator('[data-globe-rotate]').click().catch(() => {});
  await sleep(400);
  const after = await page.evaluate(() => ({
    pressed: document.querySelector('[data-globe-rotate]')?.getAttribute('aria-pressed'),
  }));
  await context.close();
  return { ...before, afterPressed: after.pressed };
}

async function widthLayoutCheck(browser) {
  const widths = [320, 360, 768, 1024, 1920];
  const results = [];
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: width >= 768 ? 900 : 800 },
      deviceScaleFactor: 1,
    });
    await applyPreferences(context, 'light');
    for (const definition of pages) {
      for (const locale of locales) {
        const page = await context.newPage();
        await page.goto(pageUrl(definition, locale), { waitUntil: 'domcontentloaded' });
        await waitForPage(page, definition.id);
        const facts = await pageFacts(page);
        results.push({
          width,
          page: definition.id,
          locale,
          overflowX: facts.overflowX,
          scrollWidth: facts.scrollWidth,
          innerWidth: facts.innerWidth,
        });
        await page.close();
      }
    }
    await context.close();
  }
  return results;
}

async function zoomCheck(browser) {
  const context = await browser.newContext({
    viewport: { width: 720, height: 450 },
    deviceScaleFactor: 1,
  });
  await applyPreferences(context, 'light');
  const results = [];
  for (const definition of [pages[0], pages[3], pages[5]]) {
    for (const locale of locales) {
      const page = await context.newPage();
      await page.goto(pageUrl(definition, locale), { waitUntil: 'domcontentloaded' });
      await waitForPage(page, definition.id);
      const facts = await pageFacts(page);
      results.push({
        page: definition.id,
        locale,
        note: '720x450 viewport approximates 200% browser zoom on a 1440x900 window',
        overflowX: facts.overflowX,
        scrollWidth: facts.scrollWidth,
        innerWidth: facts.innerWidth,
      });
      await page.close();
    }
  }
  await context.close();
  return results;
}

async function keyboardCheck(browser) {
  const context = await browser.newContext({ ...viewports.desktop });
  await applyPreferences(context, 'light');
  const results = [];
  for (const definition of [pages[0], pages[3], pages[5], searchPage]) {
    const page = await context.newPage();
    await page.goto(pageUrl(definition, 'zh-CN'), { waitUntil: 'domcontentloaded' });
    await waitForPage(page, definition.id);
    const sequence = await keyboardSequence(page);
    results.push({
      page: definition.id,
      sequence,
      focusVisibleCount: sequence.filter(
        (item) =>
          item &&
          (item.outlineStyle !== 'none' ||
            item.boxShadow !== 'none' ||
            (item.fieldBoxShadow && item.fieldBoxShadow !== 'none') ||
            (item.fieldBorderColor && item.borderColor !== item.fieldBorderColor) ||
            (item.siblingOutlineStyle && item.siblingOutlineStyle !== 'none') ||
            (item.siblingBoxShadow && item.siblingBoxShadow !== 'none')),
      ).length,
    });
    await page.close();
  }
  await context.close();
  return results;
}

async function axAudit(browser, definition, locale) {
  const context = await browser.newContext({ ...viewports.desktop });
  await applyPreferences(context, 'light');
  const page = await context.newPage();
  await page.goto(pageUrl(definition, locale), { waitUntil: 'domcontentloaded' });
  await waitForPage(page, definition.id);
  if (browserName !== 'chromium') {
    const audit = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const nameOf = (element) => {
        let label = element.getAttribute('aria-label') ?? '';
        if (!label) {
          const labelledBy = element.getAttribute('aria-labelledby');
          if (labelledBy) {
            label = labelledBy
              .split(/\s+/)
              .map((id) => document.getElementById(id)?.textContent ?? '')
              .join(' ');
          }
        }
        if (!label && 'labels' in element && element.labels) {
          label = [...element.labels].map((item) => item.textContent ?? '').join(' ');
        }
        if (!label) label = element.getAttribute('title') ?? '';
        if (!label) label = element.textContent ?? '';
        return label.trim();
      };
      const visibleInteractive = (element) =>
        visible(element) && element.getAttribute('aria-hidden') !== 'true';
      const landmarks = [
        ['banner', 'header'],
        ['navigation', 'nav'],
        ['main', 'main'],
        ['contentinfo', 'footer'],
      ].flatMap(([role, selector]) =>
        [...document.querySelectorAll(selector)]
          .filter(visible)
          .map((element) => ({ role, name: nameOf(element) })),
      );
      const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
        .filter(visible)
        .map((element) => ({ level: Number(element.tagName.slice(1)), name: nameOf(element) }));
      const interactive = [...document.querySelectorAll('a,button,input,select,textarea')].filter(visibleInteractive);
      const unnamedInteractive = interactive
        .filter((element) => !nameOf(element) && !(element.getAttribute('type') === 'hidden'))
        .map((element) => element.tagName.toLowerCase());
      return { landmarks, headings, unnamedInteractive };
    });
    await context.close();
    return {
      page: definition.id,
      locale,
      method: 'dom',
      landmarks: audit.landmarks,
      headings: audit.headings,
      h1Count: audit.headings.filter((heading) => heading.level === 1).length,
      unnamedInteractiveCount: audit.unnamedInteractive.length,
      unnamedInteractive: audit.unnamedInteractive,
    };
  }
  const client = await context.newCDPSession(page);
  await client.send('Accessibility.enable');
  const { nodes } = await client.send('Accessibility.getFullAXTree');
  const live = nodes.filter((node) => !node.ignored);
  const roleOf = (node) => node.role?.value ?? '';
  const nameOf = (node) => (node.name?.value ?? '').trim();
  const levelOf = (node) =>
    node.properties?.find((property) => property.name === 'level')?.value?.value ?? null;
  const landmarks = live
    .filter((node) => ['banner', 'navigation', 'main', 'contentinfo'].includes(roleOf(node)))
    .map((node) => ({ role: roleOf(node), name: nameOf(node) }));
  const headings = live
    .filter((node) => roleOf(node) === 'heading')
    .map((node) => ({ level: levelOf(node), name: nameOf(node) }));
  const interactiveRoles = new Set([
    'button',
    'link',
    'textbox',
    'combobox',
    'checkbox',
    'radio',
    'slider',
    'searchbox',
  ]);
  const unnamedInteractive = live
    .filter((node) => interactiveRoles.has(roleOf(node)) && !nameOf(node))
    .map((node) => roleOf(node));
  await context.close();
  return {
    page: definition.id,
    locale,
    method: 'cdp',
    landmarks,
    headings,
    h1Count: headings.filter((heading) => heading.level === 1).length,
    unnamedInteractiveCount: unnamedInteractive.length,
    unnamedInteractive,
  };
}

async function searchA11yCheck(browser) {
  const results = [];
  for (const locale of locales) {
    const context = await browser.newContext({ ...viewports.desktop });
    await applyPreferences(context, 'light');
    const page = await context.newPage();
    await page.goto(pageUrl(searchPage, locale), { waitUntil: 'domcontentloaded' });
    await waitForPage(page, searchPage.id);
    await page.locator('.search-result').first().waitFor({ timeout: 10000 });
    const status = (await page.locator('[data-search-status]').textContent())?.trim() ?? '';
    const total = Number(status.match(/\d+/)?.[0] ?? 0);
    const shown = await page.locator('.search-result').count();
    const moreButton = page.locator('[data-search-more]');
    const hasMore = await moreButton.isVisible();
    let expanded = shown;
    let loadMoreClicks = 0;
    while (expanded < total && (await moreButton.isVisible()) && loadMoreClicks < 20) {
      await moreButton.click();
      await page.waitForFunction((previous) => document.querySelectorAll('.search-result').length > previous, expanded);
      expanded = await page.locator('.search-result').count();
      loadMoreClicks += 1;
    }
    const file = `extra-search-${locale}-light-desktop.png`;
    await page.screenshot({ path: path.join(outRoot, file), fullPage: false, animations: 'disabled' });
    const axe = await scanAxe(page);
    results.push({ locale, status, total, shown, expanded, loadMoreClicks, screenshot: file, axe });
    await context.close();
  }
  return results;
}

async function longTitleCheck(browser) {
  const context = await browser.newContext({ ...viewports.mobile });
  await applyPreferences(context, 'light');
  const samples = [
    {
      locale: 'zh-CN',
      text: '一条用于验证超长中文标题在窄屏换行与布局稳定性的马拉松赛道档案标题，包含地点、赛事与距离说明',
    },
    {
      locale: 'en',
      text: 'An intentionally long marathon route title used to verify heading wrapping and layout stability on narrow mobile screens without horizontal overflow',
    },
  ];
  const results = [];
  for (const sample of samples) {
    const page = await context.newPage();
    await page.goto(pageUrl(pages[3], sample.locale), { waitUntil: 'domcontentloaded' });
    await waitForPage(page, pages[3].id);
    await page.evaluate((text) => {
      const heading = document.querySelector('h1');
      if (heading) heading.textContent = text;
    }, sample.text);
    await sleep(200);
    const facts = await pageFacts(page);
    const file = `extra-long-title-${sample.locale}-mobile.png`;
    await page.screenshot({ path: path.join(outRoot, file), fullPage: false, animations: 'disabled' });
    results.push({
      locale: sample.locale,
      synthetic: true,
      characters: sample.text.length,
      overflowX: facts.overflowX,
      scrollWidth: facts.scrollWidth,
      innerWidth: facts.innerWidth,
      screenshot: file,
    });
    await page.close();
  }
  await context.close();
  return results;
}

async function softKeyboardCheck(browser) {
  const context = await browser.newContext({ ...viewports.mobile });
  await applyPreferences(context, 'light');
  const targets = [
    { page: searchPage, selector: '#search-page-input', locale: 'zh-CN', file: 'extra-soft-keyboard-search-mobile.png' },
    { page: pages[5], selector: '#pace-distance', locale: 'zh-CN', file: 'extra-soft-keyboard-tool-mobile.png' },
  ];
  const results = [];
  for (const target of targets) {
    const page = await context.newPage();
    await page.goto(pageUrl(target.page, target.locale), { waitUntil: 'domcontentloaded' });
    await waitForPage(page, target.page.id);
    await page.locator(target.selector).focus();
    await page.setViewportSize({ width: 390, height: 500 });
    await sleep(250);
    const state = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return { found: false };
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + Math.min(rect.height / 2, Math.max(4, viewportHeight - rect.top));
      const topElement = document.elementFromPoint(centerX, Math.max(1, centerY));
      return {
        found: true,
        active: document.activeElement === element,
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        viewportHeight: Math.round(viewportHeight),
        fullyVisible: rect.top >= 0 && rect.bottom <= viewportHeight,
        covered: Boolean(topElement && topElement !== element && !element.contains(topElement)),
      };
    }, target.selector);
    await page.screenshot({ path: path.join(outRoot, target.file), fullPage: false, animations: 'disabled' });
    results.push({
      page: target.page.id,
      selector: target.selector,
      simulatedKeyboardViewport: '390x500',
      note: 'desktop harness approximates the soft keyboard by shrinking the viewport; a real phone keyboard is still required',
      ...state,
      screenshot: target.file,
    });
    await page.close();
  }
  await context.close();
  return results;
}

async function main() {
  await checkServers();
  await mkdir(outRoot, { recursive: true });

  const channel = browserName === 'chromium' ? process.env.QA_CHANNEL || undefined : undefined;
  const browserType = { chromium, firefox, webkit }[browserName];
  if (!browserType) throw new Error(`Unsupported QA_BROWSER: ${browserName}`);
  const browser = await browserType.launch({ headless: true, ...(channel ? { channel } : {}) });
  const manifest = {
    generatedAt: new Date().toISOString(),
    matrix: {
      pages: pages.map((page) => page.id),
      locales,
      themes,
      viewports: Object.fromEntries(
        Object.entries(viewports).map(([name, value]) => [
          name,
          {
            width: value.viewport.width,
            height: value.viewport.height,
            deviceScaleFactor: value.deviceScaleFactor,
          },
        ]),
      ),
      total: pages.length * locales.length * themes.length * Object.keys(viewports).length,
    },
    browser: channel ? `Playwright ${channel}` : `Playwright ${browserName} ${browser.version()}`,
    screenshots: [],
  };

  try {
    for (const [viewportName, viewport] of Object.entries(viewports)) {
      for (const theme of themes) {
        for (const locale of locales) {
          const context = await browser.newContext({ ...viewport });
          await applyPreferences(context, theme);
          for (const definition of pages) {
            const page = await context.newPage();
            const consoleErrors = [];
            const failedRequests = [];
            page.on('console', (message) => {
              if (message.type() === 'error') consoleErrors.push(message.text());
            });
            page.on('requestfailed', (request) => {
              failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`);
            });
            const url = `http://localhost:${origins[definition.origin]}${definition.path(locale)}`;
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await waitForPage(page, definition.id);
            const facts = await pageFacts(page);
            if (facts.theme !== theme) {
              throw new Error(`${definition.id} ${locale} expected theme ${theme}, got ${facts.theme}`);
            }
            if (Math.abs(facts.innerWidth - viewport.viewport.width) > 1) {
              throw new Error(
                `${definition.id} ${locale} expected viewport width ${viewport.viewport.width}, got ${facts.innerWidth}`,
              );
            }
            const file = `${definition.id}-${locale}-${theme}-${viewportName}.png`;
            await page.screenshot({
              path: path.join(outRoot, file),
              fullPage: false,
              animations: 'disabled',
            });
            let axe = null;
            let axeError = null;
            try {
              axe = await scanAxe(page);
            } catch (error) {
              axeError = error.message;
            }
            manifest.screenshots.push({
              page: definition.id,
              locale,
              theme,
              viewport: viewportName,
              url,
              screenshot: file,
              facts,
              consoleErrors,
              failedRequests,
              axe,
              axeError,
            });
            console.log(`captured ${file}`);
            await page.close();
          }
          await context.close();
        }
      }
    }

    manifest.extraChecks = {
      systemTheme: [await systemThemeCheck(browser, 'dark'), await systemThemeCheck(browser, 'light')],
      reducedMotion: await reducedMotionCheck(browser),
      widthLayout: await widthLayoutCheck(browser),
      zoom200Approx: await zoomCheck(browser),
      keyboard: await keyboardCheck(browser),
      axTree: [
        await axAudit(browser, pages[0], 'zh-CN'),
        await axAudit(browser, pages[3], 'zh-CN'),
        await axAudit(browser, pages[5], 'zh-CN'),
        await axAudit(browser, searchPage, 'zh-CN'),
        await axAudit(browser, pages[3], 'en'),
      ],
      screenReaderNote:
        browserName === 'chromium'
          ? 'Chromium CDP AX tree structure audit only; a real NVDA or VoiceOver pass is still required.'
          : `${browserName} DOM landmark/heading audit only; a real screen reader pass is still required.`,
      searchA11y: await searchA11yCheck(browser),
      longTitles: await longTitleCheck(browser),
      softKeyboard: await softKeyboardCheck(browser),
    };
  } finally {
    await browser.close();
  }

  await writeFile(path.join(outRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const serious = manifest.screenshots.reduce(
    (count, item) =>
      count + (item.axe?.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact)).length ?? 0),
    0,
  );
  const extraSerious = manifest.extraChecks.searchA11y.reduce(
    (count, item) =>
      count + (item.axe?.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact)).length ?? 0),
    0,
  );
  console.log(`wrote ${manifest.screenshots.length} screenshots to ${outRoot}`);
  console.log(`serious/critical axe violations: ${serious + extraSerious} (matrix ${serious}, search extra ${extraSerious})`);
}

await main();
