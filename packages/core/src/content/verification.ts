import type { Locale } from '../lib/i18n';
import type { SourceRecord } from './types';

export function describeSourceVerification(source: SourceRecord, locale: Locale): string | null {
  const verification = source.verification;
  if (!verification) return null;
  const zh = locale === 'zh-CN';
  const date = verification.checkedAt;
  const via = verification.checkedVia ?? '';
  if (verification.bodyRead) {
    return zh ? `来源正文已读取核对（${date}）` : `Source text read and checked (${date})`;
  }
  const checked = via
    ? zh
      ? `书目经 ${via} 核对，正文未由本机读取`
      : `bibliographic details checked via ${via}; full text not read from this machine`
    : zh
      ? '书目已核对，正文未由本机读取'
      : 'bibliographic details checked; full text not read from this machine';
  if (verification.access === 'metadata-only') {
    return zh
      ? `页面已部分读取；正文关键部分未由本机核对（${date}）`
      : `page partially read; key parts of the full text not verified from this machine (${date})`;
  }
  const reason =
    verification.access === 'blocked'
      ? zh
        ? '自动访问被拦截；'
        : 'Automated access blocked; '
      : '';
  return `${reason}${checked}${zh ? `（${date}）` : ` (${date})`}`;
}
