import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const here = import.meta.dirname;
const sites = [
  { dir: 'site-www', subtitle: '真实卫星地球上的经典跑步路线', descriptor: 'Classic courses on a real satellite Earth' },
  { dir: 'site-knowledge', subtitle: '可追溯的跑步知识 · 训练、恢复、营养与安全', descriptor: 'Traceable running knowledge' },
  { dir: 'site-tools', subtitle: '在浏览器本地运行的跑步计算与轨迹工具', descriptor: 'Local running calculators and track tools' },
];

const icon = fs
  .readFileSync(path.join(here, '..', 'public', 'icon-512.png'))
  .toString('base64');
const iconUri = `data:image/png;base64,${icon}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

for (const site of sites) {
  await page.setContent(`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    width: 1200px;
    height: 630px;
    overflow: hidden;
    background: #f3fbf8;
    color: #0b2422;
    font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", system-ui, sans-serif;
  }
  .card {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 380px;
    align-items: center;
    gap: 34px;
    width: 1200px;
    height: 630px;
    padding: 74px 82px;
    background:
      radial-gradient(circle at 88% 16%, rgba(69, 224, 191, 0.26), transparent 36%),
      radial-gradient(circle at 8% 92%, rgba(23, 97, 168, 0.12), transparent 34%),
      #f3fbf8;
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 26px;
    padding: 9px 16px;
    border: 1px solid rgba(8, 184, 157, 0.35);
    border-radius: 999px;
    background: rgba(232, 250, 244, 0.9);
    color: #076b60;
    font-size: 19px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: #f56765; }
  h1 { margin: 0; font-size: 108px; line-height: 1; letter-spacing: -0.05em; font-weight: 900; }
  .en {
    margin: 16px 0 26px;
    color: #075f57;
    font-size: 40px;
    font-weight: 900;
    letter-spacing: 0.2em;
  }
  .rules { width: 86px; height: 7px; margin-bottom: 24px; border-radius: 999px; background: linear-gradient(90deg, #08b89d, #1761a8); }
  .subtitle { max-width: 650px; margin: 0 0 14px; color: #234541; font-size: 27px; font-weight: 700; line-height: 1.5; }
  .descriptor { color: #62807b; font-size: 18px; font-weight: 650; letter-spacing: 0.03em; }
  .url { position: absolute; left: 82px; bottom: 48px; color: #5d7c77; font-size: 17px; font-weight: 700; letter-spacing: 0.08em; }
  .art { position: relative; display: grid; place-items: center; width: 380px; height: 380px; }
  .halo {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, rgba(69, 224, 191, 0.55), rgba(23, 97, 168, 0.22) 62%, transparent 70%);
    filter: blur(4px);
  }
  .art img { position: relative; width: 330px; height: 330px; filter: drop-shadow(0 26px 34px rgba(7, 76, 68, 0.2)); }
</style>
</head>
<body>
  <main class="card">
    <div>
      <span class="eyebrow"><i class="dot"></i>跑起来 · RUNUP</span>
      <h1>跑起来</h1>
      <div class="en">RUNUP</div>
      <div class="rules"></div>
      <p class="subtitle">${site.subtitle}</p>
      <p class="descriptor">${site.descriptor}</p>
      <div class="url">paobu.org · learn.paobu.org · tools.paobu.org</div>
    </div>
    <div class="art"><div class="halo"></div><img src="${iconUri}" alt=""></div>
  </main>
</body>
</html>`);
  const target = path.join(here, '..', '..', site.dir, 'public', 'social-card.png');
  await page.screenshot({ path: target });
  console.log('wrote', target);
}

await browser.close();
