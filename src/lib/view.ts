import type { ContentEntity, RouteDetails } from '@paobu/core/content';
import type { Locale } from '@paobu/core/lib/i18n';
import { siteOrigin } from '@paobu/core/lib/sites';

export function routeDetails(entity: ContentEntity): RouteDetails {
  return entity.details as RouteDetails;
}

export function formatDistance(meters: number, locale: Locale): string {
  const km = meters / 1000;
  const value = Number.isInteger(km) ? String(km) : km.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  return `${value} ${locale === 'zh-CN' ? '公里' : 'km'}`;
}

export function formatElevation(meters: number | null, locale: Locale): string {
  if (meters === null) return locale === 'zh-CN' ? '未知' : 'Unknown';
  return `${meters.toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US')} m`;
}

export function routeTypeLabel(kind: 'road-marathon' | 'trail-ultra', locale: Locale): string {
  if (kind === 'road-marathon') return locale === 'zh-CN' ? '公路马拉松' : 'Road marathon';
  return locale === 'zh-CN' ? '越野超马' : 'Trail ultra';
}

export function entityHref(entity: ContentEntity, locale: Locale): string {
  if (entity.kind === 'route') return `/${locale}/routes/${entity.slug}/`;
  if (entity.kind === 'tool') return `${siteOrigin('tools')}/${locale}/tools/${entity.slug}/`;
  const section = entity.details && 'contentType' in entity.details
    ? entity.details.contentType === 'glossary'
      ? 'glossary'
      : entity.details.contentType === 'learning-path'
        ? 'paths'
        : 'articles'
    : 'articles';
  return `${siteOrigin('knowledge')}/${locale}/${section}/${entity.slug}/`;
}

export function formatDate(value: string | null, locale: Locale): string {
  if (!value) return locale === 'zh-CN' ? '尚未审阅' : 'Not yet reviewed';
  return new Intl.DateTimeFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}
