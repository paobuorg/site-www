import { chromium } from 'playwright';
import { gzipSync } from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const date = new Date().toISOString().slice(0, 10);
const outRoot = process.env.PERF_OUT ?? path.join(repoRoot, 'evidence', date, 'perf');
const channel = process.env.QA_CHANNEL || undefined;
const runsPerScenario = Number(process.env.PERF_RUNS ?? 3);

const urls = {
  article: 'http://localhost:4422/articles/easy-run/',
  home: 'http://localhost:4421/',
};

const scenarios = {
  article: {
    url: urls.article,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    network: { latency: 150, downloadThroughput: 200 * 1024, uploadThroughput: 96 * 1024 },
    cpuRate: 4,
  },
  homeDesktop: {
    url: urls.home,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    network: { latency: 80, downloadThroughput: 1250 * 1024, uploadThroughput: 500 * 1024 },
    cpuRate: 1,
  },
  homeMobile: {
    url: urls.home,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    network: { latency: 80, downloadThroughput: 1250 * 1024, uploadThroughput: 500 * 1024 },
    cpuRate: 4,
  },
  homeVisibleMobile: {
    url: urls.home,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    network: { latency: 150, downloadThroughput: 200 * 1024, uploadThroughput: 96 * 1024 },
    cpuRate: 4,
    waitForGlobe: false,
  },
};

const perfInit = () => {
  window.__qa = { lcp: 0, lcpElement: '', cls: 0, glClear: 0 };
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.startTime > window.__qa.lcp) {
          window.__qa.lcp = entry.startTime;
          window.__qa.lcpElement = entry.element
            ? `${entry.element.tagName.toLowerCase()}.${String(entry.element.className).trim().replace(/\s+/g, '.')}`
            : entry.url || '';
        }
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__qa.cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
  for (const Context of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!Context) continue;
    const original = Context.prototype.clear;
    Context.prototype.clear = function (...args) {
      window.__qa.glClear += 1;
      return original.apply(this, args);
    };
  }
};

function trackNetwork(client) {
  const pending = new Map();
  const requests = [];
  client.on('Network.requestWillBeSent', (event) => {
    pending.set(event.requestId, { url: event.request.url, type: event.type });
  });
  client.on('Network.responseReceived', (event) => {
    const entry = pending.get(event.requestId);
    if (!entry) return;
    entry.status = event.response.status;
    entry.mimeType = event.response.mimeType;
  });
  client.on('Network.loadingFinished', (event) => {
    const entry = pending.get(event.requestId);
    if (!entry) return;
    entry.transferSize = event.encodedDataLength;
    requests.push(entry);
    pending.delete(event.requestId);
  });
  return requests;
}

async function applyNetwork(client, scenario) {
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: scenario.network.latency,
    downloadThroughput: scenario.network.downloadThroughput,
    uploadThroughput: scenario.network.uploadThroughput,
  });
  if (scenario.cpuRate > 1) {
    await client.send('Emulation.setCPUThrottlingRate', { rate: scenario.cpuRate });
  }
}

async function collectPageMetrics(page) {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource').map((entry) => ({
      name: entry.name,
      initiatorType: entry.initiatorType,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      duration: Math.round(entry.duration),
    }));
    const canvas = document.querySelector('.globe-stage canvas');
    let renderer = null;
    if (canvas) {
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      if (context) {
        const info = context.getExtension('WEBGL_debug_renderer_info');
        renderer = info ? context.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unavailable';
      }
    }
    return {
      perf: { ...window.__qa },
      navigation: navigation
        ? {
            ttfb: Math.round(navigation.responseStart),
            domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
            load: Math.round(navigation.loadEventEnd),
            transferSize: navigation.transferSize,
          }
        : null,
      resources,
      canvas: canvas
        ? {
            cssWidth: Math.round(canvas.getBoundingClientRect().width),
            cssHeight: Math.round(canvas.getBoundingClientRect().height),
            bufferWidth: canvas.width,
            bufferHeight: canvas.height,
            pixelRatio: Number((canvas.width / canvas.getBoundingClientRect().width).toFixed(2)),
          }
        : null,
      renderer,
      routeCount: document.querySelectorAll('[data-route-card]').length,
      globeFallback: document.querySelector('.globe-fallback')?.hidden === false,
    };
  });
}

async function measureRafFps(page, durationMs = 3000) {
  return page.evaluate(async (duration) => {
    let frames = 0;
    const start = performance.now();
    await new Promise((resolve) => {
      const tick = (now) => {
        frames += 1;
        if (now - start >= duration) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const elapsed = performance.now() - start;
    return Number(((frames / elapsed) * 1000).toFixed(1));
  }, durationMs);
}

async function runScenario(browser, name, scenario, runIndex) {
  const context = await browser.newContext({
    viewport: scenario.viewport,
    deviceScaleFactor: scenario.deviceScaleFactor,
    isMobile: scenario.isMobile ?? false,
    hasTouch: scenario.hasTouch ?? false,
  });
  await context.addCookies([
    { name: 'paobu_theme', value: 'light', url: 'http://localhost:4421' },
    { name: 'paobu_theme', value: 'light', url: 'http://localhost:4422' },
  ]);
  await context.addInitScript(perfInit);
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  const client = await context.newCDPSession(page);
  const requests = trackNetwork(client);
  await applyNetwork(client, scenario);

  const start = Date.now();
  await page.goto(scenario.url, { waitUntil: 'load', timeout: 90_000 });
  let readyMs = null;
  let fallback = false;
  if (scenario.waitForGlobe !== false) {
    try {
      await page.waitForFunction(
        () => {
          const loading = document.querySelector('.globe-loading');
          const canvas = document.querySelector('.globe-stage canvas');
          const fallback = document.querySelector('.globe-fallback');
          if (fallback && !fallback.hidden) return true;
          return Boolean(
            canvas &&
              loading &&
              getComputedStyle(loading).display === 'none' &&
              canvas.getBoundingClientRect().width > 0,
          );
        },
        null,
        { timeout: 30_000 },
      );
      readyMs = await page.evaluate(() => Math.round(performance.now()));
      fallback = await page.evaluate(() => document.querySelector('.globe-fallback')?.hidden === false);
    } catch {}
  }
  await page.waitForTimeout(2_000);

  let idleClearsPerSecond = null;
  let activeClearsPerSecond = null;
  let rafFps = null;
  if (readyMs && !fallback) {
    const idleStart = await page.evaluate(() => window.__qa.glClear);
    await page.waitForTimeout(2_000);
    const idleEnd = await page.evaluate(() => window.__qa.glClear);
    idleClearsPerSecond = Number(((idleEnd - idleStart) / 2).toFixed(2));
    const rotate = page.locator('[data-globe-rotate]');
    if (await rotate.isVisible().catch(() => false)) {
      await rotate.click();
      await page.waitForTimeout(300);
      const activeStart = await page.evaluate(() => window.__qa.glClear);
      rafFps = await measureRafFps(page);
      const activeEnd = await page.evaluate(() => window.__qa.glClear);
      activeClearsPerSecond = Number(((activeEnd - activeStart) / 3).toFixed(2));
      await rotate.click().catch(() => {});
    }
  }

  const metrics = await collectPageMetrics(page);
  const elapsed = Date.now() - start;
  if (runIndex === 1) {
    await page.screenshot({
      path: path.join(outRoot, `${name}-run1.png`),
      fullPage: false,
      animations: 'disabled',
    });
  }
  await context.close();
  return {
    scenario: name,
    run: runIndex,
    elapsed,
    readyMs,
    fallback,
    idleClearsPerSecond,
    activeClearsPerSecond,
    rafFps,
    consoleErrors,
    network: requests.map((request) => ({
      url: request.url,
      type: request.type,
      status: request.status ?? null,
      mimeType: request.mimeType ?? null,
      transferSize: request.transferSize ?? null,
    })),
    ...metrics,
  };
}

async function gzipFile(filePath) {
  try {
    return gzipSync(await readFile(filePath), { level: 9 }).length;
  } catch {
    return null;
  }
}

async function nonMapAssetSizes() {
  const siteRoot = path.resolve(repoRoot, '..', 'site-knowledge');
  const htmlPath = path.join(siteRoot, 'dist', 'articles', 'easy-run', 'index.html');
  const html = await readFile(htmlPath, 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="(\/_astro\/[^"]+\.(?:js|css))"/g)].map((match) => match[1]);
  const unique = [...new Set(refs)];
  let css = 0;
  let js = 0;
  const files = [];
  for (const ref of unique) {
    const bytes = await gzipFile(path.join(siteRoot, 'dist', ref.slice(1)));
    if (bytes === null) continue;
    if (ref.endsWith('.css')) css += bytes;
    else js += bytes;
    files.push({ ref, gzipBytes: bytes });
  }
  const htmlGzip = gzipSync(Buffer.from(html), { level: 9 }).length;
  return {
    htmlGzip,
    cssGzip: css,
    jsGzip: js,
    totalGzip: htmlGzip + css + js,
    files,
  };
}

async function homeSizes(homeRun) {
  const siteRoot = repoRoot;
  const html = await readFile(path.join(siteRoot, 'dist', 'index.html'), 'utf8');
  const engineFiles = new Map();
  for (const request of homeRun.network) {
    if (!request.url.startsWith('http://localhost:4421')) continue;
    const pathname = new URL(request.url).pathname;
    if (!pathname.endsWith('.js')) continue;
    if (!pathname.startsWith('/_astro/') && !pathname.startsWith('/cesium/')) continue;
    if (engineFiles.has(pathname)) continue;
    const bytes = await gzipFile(path.join(siteRoot, 'dist', pathname.slice(1)));
    if (bytes !== null) engineFiles.set(pathname, bytes);
  }
  const engineGzip = [...engineFiles.values()].reduce((total, value) => total + value, 0);
  const texture = await readFile(path.join(siteRoot, 'dist', 'textures', 'earth-blue-marble-2048.jpg'));
  const routesMatch = html.match(/data-globe-routes="([^"]+)"/);
  const routeJson = routesMatch
    ? routesMatch[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    : '[]';
  return {
    htmlGzip: gzipSync(Buffer.from(html), { level: 9 }).length,
    engineGzip,
    engineFiles: [...engineFiles.entries()].map(([file, bytes]) => ({ file, gzipBytes: bytes })),
    textureBytes: texture.length,
    mapIndexGzip: gzipSync(Buffer.from(routeJson), { level: 9 }).length,
    mapIndexBytes: Buffer.byteLength(routeJson),
  };
}

function median(values) {
  const sorted = values.filter((value) => typeof value === 'number').sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function summarize(runs) {
  return {
    lcpMedianMs: median(runs.map((run) => run.perf.lcp)),
    lcpWorstMs: Math.max(...runs.map((run) => run.perf.lcp)),
    clsMedian: median(runs.map((run) => run.perf.cls)),
    clsWorst: Math.max(...runs.map((run) => run.perf.cls)),
    domContentLoadedMedianMs: median(runs.map((run) => run.navigation?.domContentLoaded)),
    loadMedianMs: median(runs.map((run) => run.navigation?.load)),
    readyMedianMs: median(runs.map((run) => run.readyMs)),
    readyWorstMs: Math.max(...runs.map((run) => run.readyMs ?? 0)),
    idleClearsPerSecond: runs.map((run) => run.idleClearsPerSecond),
    activeClearsPerSecond: runs.map((run) => run.activeClearsPerSecond),
    rafFps: runs.map((run) => run.rafFps),
    rafFpsMedian: median(runs.map((run) => run.rafFps)),
  };
}

async function main() {
  await mkdir(outRoot, { recursive: true });
  const gpuArgs =
    process.platform === 'win32' ? ['--use-angle=d3d11', '--enable-gpu'] : ['--enable-gpu'];
  const browser = await chromium.launch({ headless: true, channel, args: gpuArgs });
  const report = {
    generatedAt: new Date().toISOString(),
    browser: channel ? `Playwright ${channel}` : `Playwright Chromium ${browser.version()}`,
    launchArgs: gpuArgs,
    runsPerScenario,
    environment: {
      note: 'Local preview server; CDP network and CPU emulation. Laboratory numbers are not field p75. FPS uses the local GPU, not a phone GPU.',
      scenarios: Object.fromEntries(
        Object.entries(scenarios).map(([name, scenario]) => [
          name,
          {
            url: scenario.url,
            viewport: scenario.viewport,
            deviceScaleFactor: scenario.deviceScaleFactor,
            downloadKiBps: Math.round(scenario.network.downloadThroughput / 1024),
            latencyMs: scenario.network.latency,
            cpuSlowdown: scenario.cpuRate,
          },
        ]),
      ),
    },
    budgets: {
      nonMapTotalGzipBytes: 180 * 1024,
      sharedStartupJsGzipBytes: 60 * 1024,
      posterBytes: 300 * 1024,
      textureMobileBytes: 750 * 1024,
      textureDesktopBytes: 1536 * 1024,
      engineGzipBytes: 2560 * 1024,
      mapIndexGzipBytes: 100 * 1024,
      articleLcpMs: 2500,
      articleCls: 0.1,
      globeDesktopReadyMs: 4000,
      globeMobileReadyMs: 6000,
    },
    runs: {},
  };

  try {
    for (const [name, scenario] of Object.entries(scenarios)) {
      report.runs[name] = [];
      for (let run = 1; run <= runsPerScenario; run += 1) {
        const result = await runScenario(browser, name, scenario, run);
        report.runs[name].push(result);
        console.log(
          `${name} run ${run}: lcp=${Math.round(result.perf.lcp)}ms cls=${result.perf.cls.toFixed(4)} ready=${result.readyMs ?? '-'}ms rafFps=${result.rafFps ?? '-'} idle=${result.idleClearsPerSecond ?? '-'}`,
        );
      }
    }

    report.summary = {
      article: summarize(report.runs.article),
      homeDesktop: summarize(report.runs.homeDesktop),
      homeMobile: summarize(report.runs.homeMobile),
      homeVisibleMobile: summarize(report.runs.homeVisibleMobile),
    };
    report.sizes = {
      nonMap: await nonMapAssetSizes(),
      home: await homeSizes(report.runs.homeDesktop[0]),
    };
    report.checks = {
      nonMapNoMapRequests: report.runs.article.every((run) =>
        run.network.every(
          (request) =>
            !/^http:\/\/localhost:442[1-3]\/(cesium|textures|pagefind)\//.test(request.url) &&
            !/\.gpx(\?|$)/.test(request.url),
        ),
      ),
      homeNoSearchIndex: report.runs.homeDesktop.every((run) =>
        run.network.every((request) => !/^http:\/\/localhost:4421\/pagefind\//.test(request.url)),
      ),
      homeFallback: report.runs.homeDesktop.some((run) => run.fallback),
      renderer: report.runs.homeDesktop[0]?.renderer ?? null,
    };
    const makeBudget = (value, limit) => ({ value, limit, pass: value <= limit });
    report.budgetResults = {
      nonMapGzip: makeBudget(report.sizes.nonMap.totalGzip, report.budgets.nonMapTotalGzipBytes),
      sharedStartupJsGzip: makeBudget(report.sizes.nonMap.jsGzip, report.budgets.sharedStartupJsGzipBytes),
      poster: makeBudget(report.sizes.home.textureBytes, report.budgets.posterBytes),
      textureMobile: makeBudget(report.sizes.home.textureBytes, report.budgets.textureMobileBytes),
      textureDesktop: makeBudget(report.sizes.home.textureBytes, report.budgets.textureDesktopBytes),
      engineGzip: makeBudget(report.sizes.home.engineGzip, report.budgets.engineGzipBytes),
      mapIndexGzip: makeBudget(report.sizes.home.mapIndexGzip, report.budgets.mapIndexGzipBytes),
      articleLcpMs: makeBudget(report.summary.article.lcpWorstMs, report.budgets.articleLcpMs),
      articleCls: makeBudget(report.summary.article.clsWorst, report.budgets.articleCls),
      globeDesktopReadyMs: makeBudget(report.summary.homeDesktop.readyWorstMs, report.budgets.globeDesktopReadyMs),
      globeMobileReadyMs: makeBudget(report.summary.homeMobile.readyWorstMs, report.budgets.globeMobileReadyMs),
    };
    const failedBudgets = Object.entries(report.budgetResults).filter(([, result]) => !result.pass);
    if (failedBudgets.length) {
      console.error(`budget failures: ${failedBudgets.map(([name, result]) => `${name} ${result.value} > ${result.limit}`).join(', ')}`);
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }

  await writeFile(path.join(outRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`wrote ${outRoot}/report.json`);
}

await main();
