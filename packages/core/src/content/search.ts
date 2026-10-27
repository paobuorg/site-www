import { pinyin } from 'pinyin-pro';

const CJK_CHAR = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/;
const CJK_RUN = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g;
const MAX_CJK_GRAM = 4;
const MAX_PINYIN_GRAM = 3;

// Natural-language questions keep function words that edited copy rarely uses.
// Indexing them on every record lets AND search rank the content terms instead
// of returning zero for "how", "怎么" or "应该".
const QUERY_BRIDGE = [
  '怎么', '怎样', '怎么样', '如何', '为什么', '为何', '是什么', '什么', '多少',
  '哪些', '哪个', '应该', '可以', '能否', '是否', '需要', '要不要', '吗', '呢',
  'how', 'what', 'why', 'when', 'where', 'which', 'who', 'should', 'could',
  'would', 'can', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'the',
  'a', 'an', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'do', 'does', 'did',
  'my', 'i', 'you', 'we', 'they', 'it', 'this', 'that', 'these', 'those',
  'after', 'before', 'with', 'from', 'about', 'into', 'over', 'under',
].join(' ');

// Pagefind segments CJK queries in the browser but indexes custom records with a
// different tokenizer; n-grams up to four characters cover the resulting terms.
export function cjkSearchGrams(text: string): string {
  const parts = new Set<string>();
  for (const run of text.match(CJK_RUN) ?? []) {
    for (let start = 0; start < run.length; start += 1) {
      for (let size = 1; size <= MAX_CJK_GRAM && start + size <= run.length; size += 1) {
        parts.add(run.slice(start, start + size));
      }
    }
  }
  return [...parts].join(' ');
}

export function normalizeNumberSeparators(text: string): string {
  return text.replace(/(\d)[,，](?=\d{3}\b)/g, '$1');
}

// Titles and aliases become both syllable chains and short joined runs so
// "bo shi dun", "boshidun" and "boshidunmalasong" all resolve.
export function pinyinSearchAliases(text: string): string[] {
  if (!CJK_CHAR.test(text)) return [];
  const syllables = pinyin(text, { toneType: 'none', type: 'array', nonZh: 'consecutive' })
    .map((part) => part.toLowerCase().replace(/[^a-z0-9]+/g, ''))
    .filter(Boolean);
  if (syllables.length === 0) return [];
  const aliases = new Set<string>([syllables.join(''), syllables.join(' ')]);
  for (let start = 0; start < syllables.length; start += 1) {
    for (let size = 1; size <= MAX_PINYIN_GRAM && start + size <= syllables.length; size += 1) {
      aliases.add(syllables.slice(start, start + size).join(''));
    }
  }
  if (syllables.length > 1) {
    aliases.add(syllables.map((syllable) => syllable[0]).join(''));
  }
  return [...aliases].filter((alias) => alias.length > 1);
}

export function expandSearchAliases(values: string[]): string[] {
  const expanded = new Set<string>();
  for (const value of values) {
    const clean = value.trim();
    if (!clean) continue;
    expanded.add(clean);
    for (const alias of pinyinSearchAliases(clean)) expanded.add(alias);
  }
  return [...expanded];
}

export function enrichSearchContent(text: string): string {
  const normalized = normalizeNumberSeparators(text);
  const searchable = `${normalized === text ? text : `${text}\n${normalized}`}\n${QUERY_BRIDGE}`;
  const grams = cjkSearchGrams(searchable);
  return grams ? `${searchable}\n${grams}` : searchable;
}
