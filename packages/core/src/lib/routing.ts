import type { Locale, SiteKind } from './i18n';
import { siteOrigin } from './sites';

export function sectionFor(entityId: string, kind: string): string {
  if (kind === 'route') return 'routes';
  if (kind === 'tool') return 'tools';
  if (entityId.startsWith('knowledge:glossary:')) return 'glossary';
  if (kind === 'glossary') return 'glossary';
  if (kind === 'learning-path') return 'paths';
  return 'articles';
}

export function localePrefix(locale: Locale): string {
  return locale === 'zh-CN' ? '' : '/en';
}

export function localeStaticParam(locale: Locale): string | undefined {
  return locale === 'zh-CN' ? undefined : locale;
}

export function localizedPath(
  _site: SiteKind,
  locale: Locale,
  section: 'home' | 'routes' | 'articles' | 'glossary' | 'paths' | 'topics' | 'tools' | 'search' | 'about' | 'collections',
  slug?: string,
): string {
  const prefix = localePrefix(locale);
  if (section === 'home') return `${prefix}/`;
  const base = `${prefix}/${section}/`;
  return slug ? `${base}${slug}/` : base;
}

export function canonicalUrl(site: SiteKind, pathname: string): string {
  const clean = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return new URL(clean, siteOrigin(site)).toString();
}

export function alternateLocalePath(pathname: string, locale: Locale): string {
  const parts = pathname.split('/').filter(Boolean);
  const rest = parts[0] === 'en' || parts[0] === 'zh-CN' ? parts.slice(1) : parts;
  const prefix = localePrefix(locale);
  return rest.length > 0 ? `${prefix}/${rest.join('/')}/` : `${prefix}/`;
}

export function routeUrl(locale: Locale, slug: string): string {
  return localizedPath('routes', locale, 'routes', slug);
}

export function knowledgeUrl(locale: Locale, section: string, slug: string): string {
  const mapped = section === 'glossary' || section === 'paths' || section === 'topics' ? section : 'articles';
  return localizedPath('knowledge', locale, mapped, slug);
}

export function toolUrl(locale: Locale, slug: string): string {
  return localizedPath('tools', locale, 'tools', slug);
}

export function absoluteEntityUrl(entityId: string, locale: Locale, slug: string, section?: string): string {
  if (entityId.startsWith('route:')) return new URL(routeUrl(locale, slug), siteOrigin('routes')).toString();
  if (entityId.startsWith('tool:')) return new URL(toolUrl(locale, slug), siteOrigin('tools')).toString();
  return new URL(knowledgeUrl(locale, section ?? 'articles', slug), siteOrigin('knowledge')).toString();
}

export function canonicalForPath(pathname: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return origin ? new URL(pathname, origin).toString() : pathname;
}
