import type { SiteKind } from './i18n';

export interface SiteOrigins {
  routes: string;
  knowledge: string;
  tools: string;
}

function runtimeEnv(): Record<string, unknown> {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env ?? {};
  const nodeEnv =
    (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } })
      .process?.env ?? {};
  return { ...nodeEnv, ...viteEnv };
}

function stripSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function envOrigin(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? stripSlash(value) : fallback;
}

export function getSiteOrigins(): SiteOrigins {
  const env = runtimeEnv();
  const dev = Boolean(env.DEV);
  return {
    routes: envOrigin(env.PUBLIC_ROUTES_ORIGIN, dev ? 'http://localhost:4321' : 'https://paobu.org'),
    knowledge: envOrigin(
      env.PUBLIC_KNOWLEDGE_ORIGIN,
      dev ? 'http://localhost:4322' : 'https://learn.paobu.org',
    ),
    tools: envOrigin(env.PUBLIC_TOOLS_ORIGIN, dev ? 'http://localhost:4323' : 'https://tools.paobu.org'),
  };
}

export function siteOrigin(kind: SiteKind): string {
  return getSiteOrigins()[kind];
}

export function githubUrl(): string | null {
  const value = runtimeEnv().PUBLIC_GITHUB_URL;
  return typeof value === 'string' && /^https:\/\/github\.com\//.test(value) ? value : null;
}

export function arcgisKey(): string | null {
  const value = runtimeEnv().PUBLIC_ARCGIS_API_KEY;
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
