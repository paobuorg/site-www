export interface CalendarOverride {
  date?: string;
  dateNote?: { 'zh-CN': string; en: string };
  registrationStatus?: 'open' | 'closed' | 'tbd' | 'official';
  registrationClose?: string;
}

// Only dates stated on each route page or its official source are listed here.
// Routes without an entry stay in the calendar with a "date to be announced" state.
export const CALENDAR_2027: Record<string, CalendarOverride> = {
  'hong-kong-100': { date: '2027-01-23' },
  'black-canyon-ultras': { date: '2027-02-13', registrationClose: '2027-02-06' },
  tarawera: { date: '2027-02-13' },
  transgrancanaria: { date: '2027-02-26' },
  tokyo: { date: '2027-03-07' },
  'seoul-marathon': { date: '2027-03-21' },
  'paris-marathon': { date: '2027-04-04' },
  'two-oceans-marathon': { date: '2027-04-04' },
  'patagonia-run': { date: '2027-04-09' },
  canyons: { date: '2027-04-24' },
  miut: { date: '2027-04-24', registrationStatus: 'open' },
  'ultra-trail-australia': { date: '2027-05-15' },
  'lewa-safari-marathon': { date: '2027-05-15' },
  'everest-marathon': { date: '2027-05-29' },
  zegama: { date: '2027-06-06' },
  sdw100: { date: '2027-06-12' },
  'comrades-marathon': { date: '2027-06-13', registrationClose: '2027-05-03' },
  'torrencial-chile': { date: '2027-06-24' },
  lavaredo: { date: '2027-06-25' },
  'mont-blanc-marathon': { date: '2027-06-27' },
  'val-daran': { date: '2027-07-09' },
  'sierre-zinal': { date: '2027-08-07' },
  wildstrubel: { date: '2027-09-10', registrationStatus: 'open' },
  'paraty-brazil': { date: '2027-09-24' },
  berlin: { date: '2027-09-26' },
  chicago: { date: '2027-10-10' },
  'new-york': { date: '2027-11-07' },
};
