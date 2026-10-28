import { createHash } from 'node:crypto';
import type { RawEntity, SourceRecord, Translation } from './types';

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, canonical((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

export function computeContentDigest(
  entity: RawEntity,
  translation: Translation,
  sources: SourceRecord[],
): string {
  const referenced = [...entity.sourceRefs].sort().map((id) => {
    const source = sources.find((item) => item.sourceId === id);
    if (!source) throw new Error(`Unknown source: ${id}`);
    return Object.fromEntries(
      ['sourceId', 'title', 'url', 'publisher', 'publishedAt', 'claims', 'license'].map((key) => [
        key,
        (source as unknown as Record<string, unknown>)[key] ?? null,
      ]),
    );
  });
  const value = {
    entityId: entity.entityId,
    slug: entity.slug,
    kind: entity.kind,
    riskLevel: entity.riskLevel,
    license: entity.license,
    sourceRefs: [...entity.sourceRefs].sort(),
    details: entity.details,
    locale: translation.locale,
    title: translation.title,
    summary: translation.summary,
    authors: translation.authors,
    body: translation.body.replace(/\r\n?/g, '\n').trimEnd() + '\n',
    sources: referenced,
  };
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
