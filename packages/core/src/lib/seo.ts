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
    isAccessibleForFree: true,
    url: options.url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': options.url },
    image: new URL('/social-card.png', options.url).toString(),
    publisher: {
      '@type': 'Organization',
      name: 'RUNUP',
      alternateName: '跑起来',
      url: new URL('/', options.url).toString(),
      logo: {
        '@type': 'ImageObject',
        url: new URL('/icon-512.png', options.url).toString(),
        width: 512,
        height: 512,
      },
    },
  };
  if (options.dateModified) data.dateModified = options.dateModified;
  if (options.authors.length > 0) {
    data.author = options.authors.map((name) => ({ '@type': 'Organization', name }));
  }
  return data;
}

export function softwareApplicationData(options: {
  name: string;
  description: string;
  url: string;
  locale: string;
  version: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: options.name,
    description: options.description,
    url: options.url,
    inLanguage: options.locale,
    applicationCategory: 'SportsApplication',
    applicationSubCategory: 'Running calculators and track tools',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript and a modern browser',
    softwareVersion: options.version,
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    publisher: {
      '@type': 'Organization',
      name: 'RUNUP',
      alternateName: '跑起来',
      url: new URL('/', options.url).toString(),
    },
  };
}
