# 跑地图主站 · site-www

[English](README.en.md) · 中文

`paobu.org` 的网站工程：真实卫星地球首页、经典马拉松与越野赛道目录、路线详情、三站汇总搜索、关于页与本地 404。内容来自 `running-routes`，并读取知识与工具实体用于关联和汇总搜索。

本仓库同时维护共享核心 `packages/core`（`@paobu/core`），向两个子站发布版本化的 tgz 制品；子站不复制核心源码。

## 当前状态

- 主站已部署到 GitHub Pages，线上地址为 `https://paobu.org/`；旧 `www` 仓库已备份并删除，Pages 与 HTTPS 已启用。
- 搜索验收在 2026-10-28 的 56 实体生产构建上重跑通过：中文 60/60、英文 56/56 进入前五，过滤总数、本站与跨站检索通过；这只针对本地预览索引，线上索引另行验证。
- T15 浏览器矩阵本地通过（2026-10-28 最终生产构建）：Chromium 156.0.8078.4、Firefox 157.0、WebKit 27.2 各生成 48 张 1440×900 / 390×844 截图（6 页 × 2 语言 × 2 主题 × 2 视口）；三套均为 0 条 axe 违规、0 控制台错误与失败请求；320–1920px 共 60 项、200% 缩放 6 项均无横向溢出；键盘 4 页各 14/14 焦点、关键控件 ≥44px、AX 树、搜索分页展开 25/25、软键盘遮挡 0、长标题与 reduced-motion 检查通过。新增 8 个 K1/T1 页面在浅色/深色下 axe 均为 0 且无移动端溢出；六张双语法律页 axe 0、无移动端溢出，所有文章、术语、工具和路线页均有法律提示。路线详情等待地球/近景瓦片可展示后再隐藏海报，移动端画布填满卡片。WebKit 27.2 缺少 `OffscreenCanvas`，因此正确降级为海报与文字说明，不执行 Cesium；真实 Safari、真实读屏与真机仍待补。
- T16 本地实验室检查通过（2026-10-28）：普通文章 LCP 中位 1.356s/最慢 1.568s、CLS 0；地球桌面就绪中位 3.579s/最慢 3.839s（预算 4s）、模拟手机 4.803s/4.873s（预算 6s）；硬件加速 Chromium（Intel Arc）约 60fps；非地图 18,346B gzip、引擎 1,347,806B gzip、纹理 266,599B、地图索引 1,262B；11 项预算与 8 项故障断言通过。它不是线上 p75 或真实手机 GPU 结果。
- 路线详情使用无需 API 密钥的 EOX Sentinel-2 cloudless 公开瓦片作为近景层，署名显示在地图底部；瓦片失败时重试并回退到本地 NASA Blue Marble。首页仍使用本地 NASA 基础层。公开瓦片可用性、第三方条款和额度不由本站保证，真实网络/SLA 仍需另行验证。
- T17 本地发布校验通过：三站分别生成 `CNAME`、`.nojekyll`、`robots.txt`、按公开页面生成的 `sitemap.xml`、`release-manifest.json`、PWA manifest、`sw.js` 与离线页；`scripts/release-bundle.mjs` 与 `scripts/verify-release.mjs` 校验三站同核心、同内容锁和发布文件。当前 56 实体生产构建的静态页面为 43/87/31，发布清单 40/84/28，搜索记录 112/56/24，sitemap 40/84/28，内容守卫通过。当前 release bundleId 为 `c4d0e3fc…`。
- Pages 工作流与 core Release 工作流已加入 `.github/workflows/`；三站 Pages 工作流均已成功，`paobu.org`/`learn.paobu.org`/`tools.paobu.org` 已启用 HTTPS。旧 `paobuorg/www` 已备份并删除。法律与内容更新批次已于 2026-10-28 推送并复核；主站流水线下载已发布的 `core-v0.2.15` 制品并校验 SHA-256，线上三站清单使用同一核心哈希。
- 三站新增中英文法律页 `/legal/` 与 `/en/legal/`，页脚固定入口；页面覆盖责任限制、非专业建议、赛事与户外安全、工具限制、来源与商标、CC BY 4.0 / MIT 许可、隐私和纠错。文章、术语、工具和路线页还显示对应的简短法律提示。
- 56 个实体已于 2026-10-28 完成 **AI 辅助编辑审阅**并发布，112 个语言版本各有 `approve` 记录和匹配的 contentDigest；覆盖路线 16/16、九个知识主题、28 个知识实体（27 篇文章 + 术语表）和 12 项工具。审阅记录由 `runmap-editorial` 生成，内部标注为 AI 辅助；页面只显示中性的“跑地图编辑部 / RunMap Editorial”。这不是独立或专业医学/营养/教练审阅；限制见 [ai-review-report.md](evidence/2026-10-28/review/ai-review-report.md)。本地 `.env` 仍开启 `PREVIEW_UNREVIEWED=1`，开发/预览会带横幅；生产模式构建不带横幅。
- 首页使用 CesiumJS 1.146.0 与本地 NASA Blue Marble 基础纹理；路线详情再叠加无需密钥的 EOX Sentinel-2 cloudless 公开瓦片。两者都不需要 3D 在线服务或地图密钥，但近景瓦片依赖第三方公开服务。

## 技术基线

- Node.js `>=22.23.4 <25`，pnpm 10.18.3，Astro 7.4.2，TypeScript 5.9.3。
- `output: 'static'`、尾斜杠目录输出，规范域名为 `https://paobu.org`。
- Cesium 1.146.0 是唯一 3D 引擎；`vite-plugin-cesium` 只参与构建，运行时资源由 `scripts/prepare-content.mjs` 复制到 `public/cesium/`。
- Pagefind 1.5.2 在构建后生成三站汇总索引，按页面语言分别加载。
- Playwright 1.64.1 与 axe-core 4.14.0 固定在 devDependencies；浏览器验收使用 Playwright 管理的 Chromium、Firefox 与 WebKit，不写死本机浏览器路径。
- 核心版本 0.2.15，制品 SHA-256 `8e2645102a7a8ebcabf56db44ceb49c4d16df54478be489919979fb4a72eaeae`。

## 目录

```text
packages/core/            共享布局、组件、主题、i18n、路由与内容校验
src/pages/                [...locale] 首页、路线列表/详情、搜索、关于与 404
src/client/globe.ts       Cesium 地球、路线锚点、相机与降级
src/lib/                  本站内容加载与视图格式
scripts/prepare-content   复制 Cesium 运行时并检查本地纹理
scripts/pack-core         pnpm pack 共享核心并写 SHA-256 锁
scripts/postbuild         Pagefind 索引、汇总搜索记录、发布文件与静态输出检查
.github/workflows/        Pages 构建/部署与共享核心 Release 定义
public/textures/          NASA Blue Marble 纹理及署名说明
core-dist/                核心 tgz 与 core.lock.json（本地构建产物，gitignore）
content.lock.json         三内容仓库的本地树摘要锁
```

## 本地运行

六个工程应位于同一父目录（默认解析 `../running-*`）。首次安装：

```bash
cd site-www
pnpm install
pnpm prepare-content
pnpm core:pack
pnpm test:content
pnpm check
pnpm build
pnpm dev
```

- 开发：`http://localhost:4321`，语言入口 `/` 与 `/en/`。
- 预览构建：`pnpm preview`，`http://localhost:4421`。构建时跨站链接按实际加载的 `.env` 生成（当前指向开发端口 4322/4323），验证跳转需同时运行对应子站；生产构建必须显式覆盖三个来源，否则 `.env` 的 localhost 会进入 HTML。
- 构建：`pnpm build` 先生成 Cesium 资源，再执行 Astro 静态构建和 Pagefind 后处理；缺少纹理或内容校验失败会中止。
- 内容校验：`pnpm test:content`。
- 类型与 Astro 检查：`pnpm check`。
- 单元测试：`pnpm test`（`tsx --test tests/*.ts`），当前 16 项，覆盖正文跨站链接、CJK/拼音/数字搜索助手、验收查询集契约，以及许可字段、法律页和禁用 AI/编辑台措辞检查。浏览器验收查询集在 `tests/search-acceptance.json`。
- T14 审阅准备：`pnpm review:packet` 生成双语摘要、来源、内容摘要和缺失门禁；当前 56 个实体已有 AI 辅助编辑审阅记录；覆盖率为路线 16/16、知识主题 9/9、28 个知识实体、工具 12/12。证据见 [review-packets.md](evidence/2026-10-28/review/review-packets.md)。

内容目录可用 `PAOBU_REPOS_DIR` 指向父目录，或分别用 `ROUTES_CONTENT_DIR`、`KNOWLEDGE_CONTENT_DIR`、`TOOLS_CONTENT_DIR` 覆盖。生产构建必须确保实际生效的环境文件中 `PREVIEW_UNREVIEWED=0` 或未设置；本地 `.env` 当前为 `1`，发布前应修改或移除，不能只依赖命令行未设置。

### 浏览器验收

T15/T16/T17 的脚本需要三站预览服务（4421/4422/4423）；跨站检查还需要开发服务 4321/4322/4323。首次使用先安装浏览器：

```bash
cd site-www
pnpm exec playwright install chromium firefox webkit
pnpm qa:ui      # 默认 Chromium；QA_BROWSER=firefox|webkit 可切换浏览器
pnpm qa:perf    # T16 实验室性能与预算断言
pnpm qa:faults  # 禁用 WebGL、Save-Data、低内存、影像失败、存储/cookie 受限
pnpm qa:track   # 轨迹慢提示、30 秒超时与取消状态
pnpm qa:cross-site # 跨站主题、语言、刷新、后退与 cookie 受限
pnpm qa:pwa     # 仅生产构建：Service Worker、已访问页缓存与离线降级
pnpm qa:crawl   # 抓取三站 sitemap 的全部公开页面并检查 canonical/hreflang/noindex/资源
```

结果写入 `evidence/<日期>/ui/`、`ui-firefox/`、`ui-webkit/`、`perf/`、`track/`、`cross-site/` 与 `pwa/`；`qa:perf` 在 Windows 上通过 `--use-angle=d3d11 --enable-gpu` 使用本机 GPU，其他平台使用 `--enable-gpu`。WebKit 27.2 没有 `OffscreenCanvas`，地球按设计降级；真实手机 GPU、真实读屏、真实 Safari 仍需单独执行。

### 本地发布准备

生产模式检查（56 个实体已发布，内容守卫应通过）。本地 `.env` 的开发端口不能带进生产，构建时必须显式覆盖三个来源：

```bash
pnpm core:pack
PUBLIC_ROUTES_ORIGIN=https://paobu.org \
PUBLIC_KNOWLEDGE_ORIGIN=https://learn.paobu.org \
PUBLIC_TOOLS_ORIGIN=https://tools.paobu.org \
PREVIEW_UNREVIEWED=0 pnpm build
pnpm check:production   # 当前应输出 route=16, knowledge=28, tool=12
```

三站都完成生产构建后，在交接包根目录执行：

```bash
node scripts/release-bundle.mjs
PAOBU_EVIDENCE_DATE=<日期> node scripts/verify-release.mjs
```

`release-bundle.json` 记录站点、内容锁、coreVersion 与 siteBundleId；`verify-release` 校验 CNAME、`.nojekyll`、robots、sitemap、release manifest、PWA 文件、canonical 与 hreflang。当前成功证据见 [release-check.json](evidence/2026-10-28/release/release-check.json)。这些是本地产物检查，不是 Pages 部署。发布证据来自生产模式构建；重跑前需先将当前预览 `dist/` 重新构建为生产模式。

## 共享核心流程

核心源码只在 `packages/core` 维护。修改后：

```bash
cd site-www
pnpm core:pack
cd ../site-knowledge && pnpm core:sync && pnpm install --force
cd ../site-tools && pnpm core:sync && pnpm install --force
```

`core:pack` 生成 `core-dist/paobu-core-<version>.tgz`、对应 `.sha256` 和 `core-dist/core.lock.json`；`core:sync` 校验哈希后把同一制品放入子站 `vendor/paobu-core.tgz` 并更新子站 `core.lock.json`。子站依赖写作 `file:vendor/paobu-core.tgz`，不使用 `workspace:*`，不复制源码。旧版本 tgz 保留用于回滚。

核心版本变更时同步两个子站锁文件和安装结果；发布前用 `pnpm why @paobu/core` 或安装日志确认版本与哈希一致。

## 内容锁

在交接包根目录运行：

```bash
node scripts/content-lock.mjs          # 重新生成三个站点的 content.lock.json
node scripts/content-lock.mjs --verify # 校验内容树未变化
```

锁使用 `sha256-tree-v1` 覆盖三个内容仓库的 `content/`、`data/` 和 `assets/`。锁里的 `commit` 已固定为完整 SHA：`running-routes` `67a80ab…`、`running-knowledge` `5cfda73…`、`running-tools` `a423a45…`。锁用于本地可复现构建，不代替 Git 版本控制。

## 外部配置与发布边界

- 站点使用真实静态路径，不依赖服务端 SSR、运行时秘密或自定义响应头。
- 跨子域链接由 `PUBLIC_ROUTES_ORIGIN`、`PUBLIC_KNOWLEDGE_ORIGIN`、`PUBLIC_TOOLS_ORIGIN` 控制；生产默认值已写入核心，本地 `.env` 指向三个本地端口。
- 当前路线近景使用 EOX Sentinel-2 cloudless 公开瓦片，不读取任何地图 API 密钥；首页和降级仍使用本地 NASA 纹理。第三方瓦片服务的条款、可用性和额度需在上线前复核。
- GitHub 仓库、DNS 与 Pages 已配置：六个仓库位于 `paobuorg`，三站 Pages 已上线并启用 HTTPS。`core-release.yml` 与 `pages.yml` 已实际执行；主站 Pages 构建下载 `core-v0.2.15` Release 制品并校验 SHA-256，子站工作流使用 `PAOBU_CORE_ARTIFACT_URL`、`PAOBU_CORE_SHA256` 仓库变量。K1/T1 线上页面已验证，证据见 [remote-status.json](evidence/2026-10-28/release/remote-status.json)。

## 许可

- 网站代码：MIT。
- 路线、知识与工具内容：各自仓库许可，新写正文为 CC BY 4.0。
- NASA Blue Marble 纹理按 NASA 媒体使用条件署名使用，不纳入 CC BY 4.0；详见 `public/textures/README.md`。
- 第三方依赖与字体保留各自许可。

最后核对日期：2026-10-28。
