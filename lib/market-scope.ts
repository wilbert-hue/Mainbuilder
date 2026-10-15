/**
 * The geography a dashboard reports on, read off the market name.
 *
 * "Global Antioxidants Market" is a global study; "Brazil Wound Care Market"
 * is a Brazilian one. The country strip above the intelligence views names
 * whichever it is, so it can never claim a geography the report does not cover.
 */

/** Regions and the countries these reports are usually cut by. */
const KNOWN_SCOPES = [
  'Global',
  'Worldwide',
  'North America',
  'Latin America',
  'South America',
  'Asia Pacific',
  'Asia-Pacific',
  'Middle East',
  'Middle East and Africa',
  'Europe',
  'Western Europe',
  'Eastern Europe',
  'Africa',
  'Oceania',
  'APAC',
  'EMEA',
  'LATAM',
  'United States',
  'United Kingdom',
  'USA',
  'US',
  'UK',
  'India',
  'China',
  'Japan',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Brazil',
  'Mexico',
  'Canada',
  'Australia',
  'South Korea',
  'Korea',
  'Indonesia',
  'Vietnam',
  'Thailand',
  'Malaysia',
  'Singapore',
  'Saudi Arabia',
  'UAE',
  'South Africa',
  'Russia',
  'Turkey',
  'Poland',
  'Netherlands',
  'Nigeria',
  'Egypt',
  'Argentina',
  'Chile',
  'Colombia',
  'Philippines',
  'Bangladesh',
  'Pakistan',
  'Israel',
  'Switzerland',
  'Sweden',
  'Norway',
  'Denmark',
  'Belgium',
  'Austria',
]

/** The default when a market name names no geography at all. */
export const DEFAULT_MARKET_SCOPE = 'Global'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** True when `name` contains `scope` as a whole phrase. */
function mentions(name: string, scope: string): boolean {
  return new RegExp(`(^|\\s)${escapeRegExp(scope)}($|\\s)`, 'i').test(name)
}

/**
 * The market name without its leading geography: "Brazil Wound Care Market"
 * reads as "Wound Care Market". Used where copy already states the geography
 * separately and repeating it would read as a stutter.
 */
export function stripScopePrefix(marketName: string | null | undefined): string {
  const name = (marketName ?? '').trim()
  if (!name) return ''
  const prefixes = [...KNOWN_SCOPES].sort((a, b) => b.length - a.length)
  for (const scope of prefixes) {
    const match = new RegExp(`^${escapeRegExp(scope)}\\s+`, 'i')
    if (match.test(name)) return name.replace(match, '').trim() || name
  }
  return name
}

/**
 * The scope label for the views a dashboard actually carries.
 *
 * A report states the geography it covers — an India quadrant says "india" —
 * and that beats the word in the market title, which is often "Global" simply
 * because the family of reports is. The title is the fallback, for a dashboard
 * whose views carry no geography of their own.
 */
export function reportScopeLabel(
  reportGeographies: (string | null | undefined)[],
  marketName: string | null | undefined,
  geographies: string[] = []
): string {
  for (const geo of reportGeographies) {
    const value = (geo ?? '').trim()
    if (value) return titleCaseGeography(value)
  }
  return marketScopeLabel(marketName, geographies)
}

/**
 * Title-case a geography however the analyst typed it — "india", "INDIA",
 * "north america" — while leaving abbreviations alone: "U.S." and "UAE" are
 * already written the way they should read.
 */
export function titleCaseGeography(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => {
      // "U.S.", "U.K." — dotted abbreviations are already correct.
      if (word.includes('.')) return word
      // "UAE", "GCC", "EU" — so is a short all-caps token.
      if (word.length <= 4 && word === word.toUpperCase()) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

/**
 * The scope label for a dashboard: a geography the workbook itself reports,
 * if the market name mentions one, otherwise a geography from the known list,
 * otherwise "Global".
 *
 * The workbook's own geographies are checked first so a report cut by a
 * geography this list has never heard of still labels itself correctly.
 */
export function marketScopeLabel(
  marketName: string | null | undefined,
  geographies: string[] = []
): string {
  const name = (marketName ?? '').trim()
  if (!name) return DEFAULT_MARKET_SCOPE

  // Longest first, so "North America" wins over a bare "America".
  const candidates = [...geographies, ...KNOWN_SCOPES]
    .map((g) => g.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)

  for (const scope of candidates) {
    if (mentions(name, scope)) {
      // "Worldwide" is the same study as "Global"; say it one way.
      return /^worldwide$/i.test(scope) ? DEFAULT_MARKET_SCOPE : scope
    }
  }

  return DEFAULT_MARKET_SCOPE
}
