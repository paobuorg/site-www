export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbList(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function articleData(options: {
  headline: string;
  description: string;
  url: string;
  locale: string;
  dateModified?: string | null;
  authors: string[];
}): Record<string, unknown> {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: options.headline,
    description: options.description,
    inLanguage: options.locale,
    mainEntityOfPage: { '@type': 'WebPage', '@id': options.url },
    publisher: { '@type': 'Organization', name: 'RUNUP' },
  };
  if (options.dateModified) data.dateModified = options.dateModified;
  if (options.authors.length > 0) {
    data.author = options.authors.map((name) => ({ '@type': 'Person', name }));
  }
  return data;
}
