interface GlobeRoute {
  id: string;
  kind: 'road-marathon' | 'trail-ultra';
  title: string;
  place: string;
  url: string;
  longitude: number;
  latitude: number;
}

interface CesiumModule {
  Viewer: new (container: HTMLElement, options: Record<string, unknown>) => any;
  ImageryLayer: new (provider: any) => any;
  SingleTileImageryProvider: new (options: { url: string; tileWidth: number; tileHeight: number }) => any;
  Resource: new (options: {
    url: string;
    retryAttempts?: number;
    retryCallback?: () => boolean;
  }) => any;
  UrlTemplateImageryProvider: new (options: {
    url: string | object;
    maximumLevel?: number;
    credit?: string;
  }) => any;
  Cartesian3: {
    new (x: number, y: number, z: number): any;
    fromDegrees: (lon: number, lat: number, height?: number) => any;
  };
  Color: { fromCssColorString: (value: string) => any };
  Math: { toRadians: (value: number) => number };
  ScreenSpaceEventHandler: new (element: HTMLElement) => any;
  ScreenSpaceEventType: { LEFT_CLICK: number };
  defined: (value: unknown) => boolean;
}

let cesiumPromise: Promise<CesiumModule> | undefined;

async function loadCesium(): Promise<CesiumModule> {
  if (!cesiumPromise) {
    (window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = '/cesium/';
    cesiumPromise = import('cesium') as unknown as Promise<CesiumModule>;
  }
  return cesiumPromise;
}

const HOME_CAMERA = { longitude: -18, latitude: 22, height: 19_000_000 };

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function supportsWebGL(): boolean {
  if (!('OffscreenCanvas' in window)) return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function prefersLiteMode(): boolean {
  const navigatorWithHints = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  if (navigatorWithHints.connection?.saveData) return true;
  const memory = navigatorWithHints.deviceMemory;
  return typeof memory === 'number' && memory > 0 && memory <= 2;
}

const HIGH_RESOLUTION_IMAGERY =
  'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg';
const HIGH_RESOLUTION_CREDIT =
  '<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless</a> by EOX IT Services GmbH (modified Copernicus Sentinel data 2020), CC BY-NC-SA 4.0';

function createViewer(Cesium: CesiumModule, container: HTMLElement, highResolution = false): any {
  const baseProvider = new Cesium.SingleTileImageryProvider({
    url: '/textures/earth-blue-marble-2048.jpg',
    tileWidth: 2048,
    tileHeight: 1024,
  });
  baseProvider.errorEvent.addEventListener(() => showFailure(container));
  const viewer = new Cesium.Viewer(container, {
    baseLayer: new Cesium.ImageryLayer(baseProvider),
    animation: false,
    timeline: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    shouldAnimate: false,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
    scene3DOnly: true,
  });
  if (highResolution) {
    const detailLayer = viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: new Cesium.Resource({
          url: HIGH_RESOLUTION_IMAGERY,
          retryAttempts: 3,
          retryCallback: () => true,
        }),
        maximumLevel: 17,
        credit: HIGH_RESOLUTION_CREDIT,
      }),
    );
    detailLayer.errorEvent.addEventListener(() => {
      viewer.imageryLayers.remove(detailLayer, false);
      viewer.scene.requestRender();
    });
  }
  const scene = viewer.scene;
  scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a1a2a');
  scene.globe.enableLighting = false;
  scene.globe.showGroundAtmosphere = true;
  scene.skyAtmosphere.show = true;
  scene.backgroundColor = Cesium.Color.fromCssColorString('#030a16');
  scene.screenSpaceCameraController.minimumZoomDistance = 1_500_000;
  scene.screenSpaceCameraController.maximumZoomDistance = 40_000_000;
  return viewer;
}

function routePoint(Cesium: CesiumModule, route: GlobeRoute, selected = false): any {
  return {
    id: route.id,
    position: Cesium.Cartesian3.fromDegrees(route.longitude, route.latitude),
    point: {
      pixelSize: selected ? 14 : 11,
      color: Cesium.Color.fromCssColorString(route.kind === 'trail-ultra' ? '#FFD65A' : '#2E70F6'),
      outlineColor: Cesium.Color.fromCssColorString(selected ? '#ffffff' : 'rgba(255,255,255,0.45)'),
      outlineWidth: selected ? 3 : 1.5,
      disableDepthTestDistance: 0,
    },
    label: {
      text: route.title,
      font: '600 13px system-ui, -apple-system, "Segoe UI", sans-serif',
      fillColor: Cesium.Color.fromCssColorString('#ffffff'),
      show: selected,
      showBackground: true,
      backgroundColor: Cesium.Color.fromCssColorString('rgba(7, 18, 34, 0.72)'),
      backgroundPadding: { x: 9, y: 5 },
      pixelOffset: { x: 0, y: -20 },
      horizontalOrigin: 0,
      verticalOrigin: 1,
      disableDepthTestDistance: 0,
    },
    properties: { routeId: route.id },
  };
}

function flyToRoute(Cesium: CesiumModule, viewer: any, route: GlobeRoute, reduceMotion: boolean): void {
  const destination = Cesium.Cartesian3.fromDegrees(route.longitude, route.latitude, 4_500_000);
  if (reduceMotion) {
    viewer.camera.setView({ destination });
    viewer.scene.requestRender();
  } else {
    viewer.camera.flyTo({ destination, duration: 1.35 });
  }
}

function revealPoster(container: HTMLElement): void {
  const poster = container.querySelector<HTMLElement>('.globe-poster');
  const loading = container.querySelector<HTMLElement>('.globe-loading');
  poster?.classList.add('is-hidden');
  if (loading) loading.hidden = true;
}

function revealWhenReady(viewer: any, container: HTMLElement): void {
  let finished = false;
  let listener: ((remaining: number) => void) | undefined;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (listener) viewer.scene.globe.tileLoadProgressEvent.removeEventListener(listener);
    revealPoster(container);
  };
  listener = (remaining: number) => {
    if (remaining === 0) finish();
  };
  viewer.scene.globe.tileLoadProgressEvent.addEventListener(listener);
  const deadline = performance.now() + 6_000;
  const poll = () => {
    if (finished) return;
    if (viewer.scene.globe.tilesLoaded || performance.now() >= deadline) {
      finish();
      return;
    }
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
}

function showFailure(container: HTMLElement): void {
  const fallback = container.querySelector<HTMLElement>('.globe-fallback, .route-map-fallback');
  const loading = container.querySelector<HTMLElement>('.globe-loading');
  if (loading) loading.hidden = true;
  if (fallback) fallback.hidden = false;
  container.querySelectorAll('canvas').forEach((canvas) => {
    canvas.style.display = 'none';
  });
  container
    .querySelectorAll<HTMLElement>('[data-globe-zoom-in], [data-globe-zoom-out], [data-globe-reset], [data-globe-rotate]')
    .forEach((control) => {
      control.style.display = 'none';
    });
  document.querySelectorAll('.cesium-widget-errorPanel').forEach((panel) => panel.remove());
  container.querySelector<HTMLElement>('.globe-poster')?.classList.remove('is-hidden');
}

function updateSelected(container: HTMLElement, route: GlobeRoute | null): void {
  const card = container.parentElement?.querySelector<HTMLElement>('[data-globe-selected]')
    ?? container.querySelector<HTMLElement>('[data-globe-selected]');
  if (!card) return;
  if (!route) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  const title = card.querySelector<HTMLElement>('[data-selected-title]');
  const meta = card.querySelector<HTMLElement>('[data-selected-meta]');
  const link = card.querySelector<HTMLAnchorElement>('[data-selected-link]');
  if (title) title.textContent = route.title;
  if (meta) meta.textContent = route.place;
  if (link) link.href = route.url;
}

function installControls(viewer: any, container: HTMLElement, reset: () => void, onClose: () => void): void {
  container.querySelector('[data-globe-zoom-in]')?.addEventListener('click', () => viewer.camera.zoomIn(2_500_000));
  container.querySelector('[data-globe-zoom-out]')?.addEventListener('click', () => viewer.camera.zoomOut(2_500_000));
  container.querySelector('[data-globe-reset]')?.addEventListener('click', reset);
  const close = container.parentElement?.querySelector('[data-globe-close]')
    ?? container.querySelector('[data-globe-close]');
  close?.addEventListener('click', () => {
    onClose();
    reset();
  });
}

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error);
}

export async function initHomeGlobe(): Promise<void> {
  const container = document.querySelector<HTMLElement>('[data-globe-stage]');
  const data = document.querySelector<HTMLElement>('[data-globe-routes]');
  if (!container || !data) return;
  const routes: GlobeRoute[] = JSON.parse(data.dataset.globeRoutes ?? '[]');
  const filters = document.querySelectorAll<HTMLButtonElement>('[data-route-filter]');
  const applyCardFilter = (kind: string) => {
    for (const filter of filters) {
      filter.setAttribute('aria-pressed', String(filter.dataset.routeFilter === kind));
    }
    document.querySelectorAll<HTMLElement>('[data-route-card]').forEach((card) => {
      card.hidden = kind !== 'all' && card.dataset.routeKind !== kind;
    });
  };
  let currentFilter = 'all';
  let applyGlobeFilter: ((kind: string) => void) | null = null;
  for (const filter of filters) {
    filter.addEventListener('click', () => {
      currentFilter = filter.dataset.routeFilter ?? 'all';
      applyCardFilter(currentFilter);
      applyGlobeFilter?.(currentFilter);
    });
  }
  if (!routes.length || !supportsWebGL() || prefersLiteMode()) {
    showFailure(container);
    return;
  }
  try {
    const Cesium = await loadCesium();
    const viewer = createViewer(Cesium, container);
    const reduceMotion = prefersReducedMotion();
    let selectedId: string | null = null;
    const markerEntities = new Map<string, any>();
    for (const route of routes) {
      const entity = viewer.entities.add(routePoint(Cesium, route));
      markerEntities.set(route.id, entity);
    }
    const homeView = () => {
      if (reduceMotion) {
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(HOME_CAMERA.longitude, HOME_CAMERA.latitude, HOME_CAMERA.height),
        });
        viewer.scene.requestRender();
      } else {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(HOME_CAMERA.longitude, HOME_CAMERA.latitude, HOME_CAMERA.height),
          duration: 1.1,
        });
      }
    };
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(HOME_CAMERA.longitude, HOME_CAMERA.latitude, HOME_CAMERA.height),
    });

    revealWhenReady(viewer, container);
    viewer.scene.globe.imageryLayers.layerAdded.addEventListener(() => {
      viewer.scene.requestRender();
    });

    const clearSelection = () => {
      selectedId = null;
      updateSelected(container, null);
      for (const entity of markerEntities.values()) entity.label.show = false;
      viewer.scene.requestRender();
    };

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement: { position: any }) => {
      const picked = viewer.scene.pick(movement.position);
      const routeId = picked?.id?.id as string | undefined;
      if (!routeId) {
        clearSelection();
        return;
      }
      const route = routes.find((item) => item.id === routeId);
      if (!route) return;
      selectedId = route.id;
      updateSelected(container, route);
      for (const [id, entity] of markerEntities) {
        const item = routes.find((candidate) => candidate.id === id);
        if (!item) continue;
        entity.point.pixelSize = id === selectedId ? 14 : 11;
        entity.point.outlineWidth = id === selectedId ? 3 : 1.5;
        entity.label.show = id === selectedId;
      }
      viewer.scene.requestRender();
      flyToRoute(Cesium, viewer, route, reduceMotion);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    applyGlobeFilter = (kind: string) => {
      for (const [id, entity] of markerEntities) {
        const item = routes.find((candidate) => candidate.id === id);
        entity.show = kind === 'all' || item?.kind === kind;
      }
      viewer.scene.requestRender();
    };
    applyGlobeFilter(currentFilter);

    const rotateButton = document.querySelector<HTMLButtonElement>('[data-globe-rotate]');
    let rotating = false;
    let frame = 0;
    const tick = () => {
      if (!rotating) return;
      viewer.camera.rotate(new Cesium.Cartesian3(0, 0, 1), -0.00055);
      viewer.scene.requestRender();
      frame = requestAnimationFrame(tick);
    };
    const stopRotating = () => {
      rotating = false;
      rotateButton?.setAttribute('aria-pressed', 'false');
      cancelAnimationFrame(frame);
    };
    rotateButton?.addEventListener('click', () => {
      if (reduceMotion) return;
      rotating = !rotating;
      rotateButton.setAttribute('aria-pressed', String(rotating));
      if (rotating) tick();
      else stopRotating();
    });
    for (const event of ['pointerdown', 'wheel', 'touchstart']) {
      container.addEventListener(event, stopRotating, { passive: true });
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopRotating();
    });
    container.addEventListener('runmap:fly', ((event: CustomEvent<string>) => {
      const route = routes.find((item) => item.id === event.detail);
      if (route) flyToRoute(Cesium, viewer, route, reduceMotion);
    }) as EventListener);

    installControls(viewer, container, homeView, clearSelection);
    viewer.scene.requestRender();
  } catch (error) {
    console.error('Globe failed to initialise', describeError(error));
    showFailure(container);
  }
}

export async function initRouteGlobe(): Promise<void> {
  const container = document.querySelector<HTMLElement>('[data-route-globe]');
  if (!container) return;
  const longitude = Number(container.dataset.longitude);
  const latitude = Number(container.dataset.latitude);
  const title = container.dataset.title ?? '';
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || !supportsWebGL() || prefersLiteMode()) {
    showFailure(container);
    return;
  }
  try {
    const Cesium = await loadCesium();
    const viewer = createViewer(Cesium, container, true);
    const route: GlobeRoute = {
      id: 'route-anchor',
      kind: container.dataset.kind === 'trail-ultra' ? 'trail-ultra' : 'road-marathon',
      title,
      place: '',
      url: '',
      longitude,
      latitude,
    };
    viewer.entities.add(routePoint(Cesium, route, true));
    const reset = () => {
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 4_500_000),
      });
      viewer.scene.requestRender();
    };
    reset();
    revealWhenReady(viewer, container);
    installControls(viewer, container, reset, () => {});
    viewer.scene.requestRender();
  } catch (error) {
    console.error('Route globe failed to initialise', describeError(error));
    showFailure(container);
  }
}
