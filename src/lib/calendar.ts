import type { Locale } from '@paobu/core/lib/i18n';
import type { ContentEntity } from '@paobu/core/content';
import { CALENDAR_2027 } from '../data/calendar-2027';
import { routeDetails } from './view';

export interface CalendarEntry {
  slug: string;
  title: string;
  href: string;
  date: string | null;
  month: number | null;
  dateLabel: string;
  dateNote: string | null;
  registrationStatus: 'open' | 'closed' | 'tbd' | 'official';
  registrationClose: string | null;
  place: string;
  region: string;
  countryCode: string;
  type: string;
  typeLabel: string;
  distanceMeters: number | null;
  elevationGainMeters: number | null;
  lastVerified: string | null;
  officialUrl: string | null;
  courseEdition: string | null;
}

const REGION: Record<string, { zh: string; en: string }> = {
  CN: { zh: '中国', en: 'China' },
  HK: { zh: '中国香港', en: 'Hong Kong' },
  JP: { zh: '日本', en: 'Japan' },
  KR: { zh: '韩国', en: 'South Korea' },
  TH: { zh: '泰国', en: 'Thailand' },
  VN: { zh: '越南', en: 'Vietnam' },
  NP: { zh: '尼泊尔', en: 'Nepal' },
  AU: { zh: '澳大利亚', en: 'Australia' },
  NZ: { zh: '新西兰', en: 'New Zealand' },
  US: { zh: '美国', en: 'United States' },
  CA: { zh: '加拿大', en: 'Canada' },
  BR: { zh: '巴西', en: 'Brazil' },
  AR: { zh: '阿根廷', en: 'Argentina' },
  CL: { zh: '智利', en: 'Chile' },
  ZA: { zh: '南非', en: 'South Africa' },
  KE: { zh: '肯尼亚', en: 'Kenya' },
  MA: { zh: '摩洛哥', en: 'Morocco' },
  GB: { zh: '英国', en: 'United Kingdom' },
  DE: { zh: '德国', en: 'Germany' },
  FR: { zh: '法国', en: 'France' },
  IT: { zh: '意大利', en: 'Italy' },
  CH: { zh: '瑞士', en: 'Switzerland' },
  ES: { zh: '西班牙', en: 'Spain' },
  PT: { zh: '葡萄牙', en: 'Portugal' },
  GR: { zh: '希腊', en: 'Greece' },
  RE: { zh: '留尼汪', en: 'Réunion' },
  AQ: { zh: '南极洲', en: 'Antarctica' },
};

function regionLabel(code: string, locale: Locale): string {
  const item = REGION[code];
  if (!item) return code;
  return locale === 'zh-CN' ? item.zh : item.en;
}

function regionGroup(code: string, locale: Locale): string {
  if (['CN', 'HK', 'JP', 'KR', 'TH', 'VN', 'NP'].includes(code)) return locale === 'zh-CN' ? '亚洲' : 'Asia';
  if (['AU', 'NZ'].includes(code)) return locale === 'zh-CN' ? '大洋洲' : 'Oceania';
  if (['US', 'CA'].includes(code)) return locale === 'zh-CN' ? '北美' : 'North America';
  if (['BR', 'AR', 'CL'].includes(code)) return locale === 'zh-CN' ? '南美' : 'South America';
  if (['ZA', 'KE', 'MA', 'RE'].includes(code)) return locale === 'zh-CN' ? '非洲' : 'Africa';
  if (code === 'AQ') return locale === 'zh-CN' ? '南极' : 'Antarctica';
  return locale === 'zh-CN' ? '欧洲' : 'Europe';
}

function monthLabel(date: string | null, locale: Locale): string {
  if (!date) return locale === 'zh-CN' ? '待公布' : 'TBA';
  const value = new Date(`${date}T00:00:00Z`);
  return new Intl.DateTimeFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-GB', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

export function calendarEntries(content: any, locale: Locale): CalendarEntry[] {
  const prefix = locale === 'zh-CN' ? '' : '/en';
  return content.visible('route').map((entity: ContentEntity) => {
    const details = routeDetails(entity);
    const translation = content.translation(entity, locale);
    const override = CALENDAR_2027[entity.slug] ?? {};
    const date = override.date ?? null;
    const source = content.sourcesFor(entity)[0];
    return {
      slug: entity.slug,
      title: translation.title,
      href: `${prefix}/routes/${entity.slug}/`,
      date,
      month: date ? Number(date.slice(5, 7)) : null,
      dateLabel: monthLabel(date, locale),
      dateNote: override.dateNote?.[locale] ?? null,
      registrationStatus: override.registrationStatus ?? 'official',
      registrationClose: override.registrationClose ?? null,
      place: details.placeName[locale],
      region: regionGroup(details.countryCodes[0] ?? '', locale),
      countryCode: details.countryCodes[0],
      type: details.raceType,
      typeLabel: locale === 'zh-CN'
        ? { 'road-marathon': '公路马拉松', 'road-ultra': '公路超马', 'trail-ultra': '越野超马', 'trail-mountain': '山地竞速' }[details.raceType]
        : { 'road-marathon': 'Road marathon', 'road-ultra': 'Road ultra', 'trail-ultra': 'Trail ultra', 'trail-mountain': 'Mountain race' }[details.raceType],
      distanceMeters: details.distanceMeters,
      elevationGainMeters: details.elevationGainMeters,
      lastVerified: entity.reviewedAt,
      officialUrl: source?.url ?? null,
      courseEdition: details.courseEdition ?? null,
    };
  }).sort((a: CalendarEntry, b: CalendarEntry) => {
    if (a.date && b.date) return a.date.localeCompare(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title, locale === 'zh-CN' ? 'zh-CN' : 'en');
  });
}
