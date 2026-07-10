/**
 * Market- and header-aware demo data for intelligence proposition uploads.
 * Fills empty cells, placeholders, and wholly empty sheets on upload.
 */

export const DEFAULT_INTELLIGENCE_DEMO_ROW_COUNT = 15

export type DemoGenerationContext = {
  marketName: string
  intelligenceType?: string
  /** When set, empty sheets pad/generate to this row count (e.g. from sibling proposition sheets). */
  targetRowCount?: number
}

export type ParsedMarketContext = {
  marketLabel: string
  region: string
  product: string
  productTitle: string
}

const DEMO_DATA = {
  firstNames: ['James', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Ashley', 'William', 'Amanda'],
  lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'],
  companies: ['Acme Corporation', 'Global Industries Ltd', 'Tech Solutions Inc', 'Premier Services Group', 'Innovative Systems', 'Pacific Trading Co', 'Horizon Group', 'Stellar Solutions', 'Phoenix Industries', 'Nexus Corporation'],
  industries: ['Healthcare', 'Technology', 'Manufacturing', 'Financial Services', 'Retail', 'Energy', 'Construction', 'Consumer Goods', 'Logistics', 'Agriculture'],
  cities: ['New York', 'London', 'Paris', 'Berlin', 'Mumbai', 'Singapore', 'Dubai', 'Sydney', 'Toronto', 'Amsterdam'],
  countries: ['United States', 'United Kingdom', 'Germany', 'France', 'India', 'Singapore', 'UAE', 'Australia', 'Canada', 'Netherlands'],
  regions: ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Africa', 'South Asia'],
  departments: ['Sales', 'Marketing', 'Engineering', 'Procurement', 'Operations', 'Business Development'],
  titles: ['CEO', 'CTO', 'VP Sales', 'Director', 'Senior Manager', 'Procurement Lead', 'Category Manager'],
  statuses: ['Active', 'Qualified', 'In Progress', 'Negotiating', 'Contacted'],
  sources: ['Website', 'Referral', 'Trade Show', 'Partner', 'Conference', 'Email Campaign'],
  emailDomains: ['company.com', 'business.net', 'corporate.io', 'enterprise.org'],
  streets: ['Main Street', 'Industrial Park', 'Commerce Drive', 'Tech Park'],
}

const REGION_PREFIXES = [
  'north america',
  'latin america',
  'asia pacific',
  'western europe',
  'eastern europe',
  'middle east',
  'south asia',
  'southeast asia',
  'europe',
  'apac',
  'emea',
  'africa',
  'oceania',
  'india',
  'china',
  'japan',
  'global',
  'us',
  'uk',
]

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomNumber(min: number, max: number, decimals = 0): string {
  const num = Math.random() * (max - min) + min
  return decimals > 0 ? num.toFixed(decimals) : Math.floor(num).toString()
}

function randomDate(): string {
  const start = new Date()
  start.setFullYear(start.getFullYear() - 2)
  const end = new Date()
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return date.toISOString().split('T')[0]
}

function randomPhone(): string {
  const formats = [
    `+1 (${randomNumber(200, 999)}) ${randomNumber(200, 999)}-${randomNumber(1000, 9999)}`,
    `+44 ${randomNumber(7000, 7999)}${randomNumber(100000, 999999)}`,
    `+91 ${randomNumber(70000, 99999)}${randomNumber(10000, 99999)}`,
  ]
  return randomItem(formats)
}

/** Parse dashboard / market name into region + product tokens for contextual copy. */
export function parseMarketContext(marketName: string): ParsedMarketContext {
  const marketLabel = (marketName || 'Global market').trim() || 'Global market'
  let core = marketLabel.replace(/\s+market\s*$/i, '').trim()
  if (!core) core = 'market offerings'

  const lower = core.toLowerCase()
  let region = 'Global'
  let product = core

  for (const prefix of REGION_PREFIXES) {
    if (lower === prefix) {
      region = titleCase(prefix)
      product = 'market offerings'
      break
    }
    if (lower.startsWith(`${prefix} `)) {
      region = titleCase(prefix)
      product = core.slice(prefix.length).trim() || 'market offerings'
      break
    }
  }

  product = product.replace(/\s+market\s*$/i, '').trim() || 'market offerings'

  return {
    marketLabel,
    region,
    product,
    productTitle: titleCase(product),
  }
}

export function isPlaceholderValue(value: string): boolean {
  if (!value) return false
  const normalized = value.toLowerCase().trim()
  return (
    normalized === 'xx' ||
    normalized === 'xxx' ||
    normalized === 'xxxx' ||
    normalized === 'x' ||
    normalized === 'na' ||
    normalized === 'n/a' ||
    normalized === 'tbd' ||
    normalized === 'placeholder' ||
    normalized === '-' ||
    normalized === '--' ||
    normalized === '—' ||
    normalized === '...' ||
    normalized === 'demo' ||
    normalized === 'sample' ||
    normalized === 'test'
  )
}

export function isEmptyCellValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  const s = String(value).trim()
  return s === '' || isPlaceholderValue(s)
}

function pickVariant<T>(items: T[], rowIndex: number, salt = 0): T {
  return items[(rowIndex + salt) % items.length]
}

function professionalDriverValue(header: string, rowIndex: number, market: ParsedMarketContext): string | null {
  const h = header.toLowerCase()
  const { region, productTitle, marketLabel } = market

  if (
    h.includes('buying criteria') ||
    h.includes('key buying') ||
    h.includes('purchase criteria') ||
    h.includes('selection criteria')
  ) {
    const options = [
      `Total cost of ownership for ${productTitle} in ${region}`,
      `Compliance with ${region} safety and quality standards`,
      `Lead times and installation support for ${productTitle}`,
      `Supplier track record in ${marketLabel}`,
      `Lifecycle durability and maintenance costs`,
      `Sustainability and recyclability requirements`,
      `Warranty coverage and after-sales service network`,
      `Customization options for ${productTitle} specifications`,
    ]
    return pickVariant(options, rowIndex, 1)
  }

  if (h.includes('pain point') || h.includes('key pain') || h.includes('challenge')) {
    const options = [
      `Rising raw material costs affecting ${productTitle} margins`,
      `Long procurement cycles for specialized ${productTitle}`,
      `Limited visibility into ${region} supplier capacity`,
      `Inconsistent product quality across distributors`,
      `Difficulty comparing specs across vendors in ${marketLabel}`,
      `Regulatory changes increasing compliance overhead`,
      `Fragmented data on customer demand by segment`,
      `High logistics costs for cross-border ${productTitle} shipments`,
    ]
    return pickVariant(options, rowIndex, 2)
  }

  if (
    h.includes('trigger') ||
    h.includes('initiative') ||
    h.includes('upcoming') ||
    h.includes('planned project')
  ) {
    const options = [
      `Planned facility expansion in ${region} (H2 ${new Date().getFullYear() + 1})`,
      `RFP for ${productTitle} refresh across key accounts`,
      `Sustainability roadmap requiring greener ${productTitle}`,
      `Digital procurement platform rollout in ${region}`,
      `Consolidation of preferred supplier list for ${marketLabel}`,
      `New product line launch tied to ${productTitle} demand`,
      `Budget cycle approval for capex in ${region}`,
      `Partnership evaluation with regional distributors`,
    ]
    return pickVariant(options, rowIndex, 3)
  }

  if (h.includes('professional driver') || h.includes('driver')) {
    const options = [
      `Growth in ${region} ${productTitle} adoption`,
      `Shift toward premium ${productTitle} tiers`,
      `Increased outsourcing of installation`,
      `Focus on total cost of ownership`,
    ]
    return pickVariant(options, rowIndex, 4)
  }

  return null
}

/** Generate one cell value from header name, row index, and market context. */
export function generateDemoValue(
  header: string,
  rowIndex: number,
  ctx: DemoGenerationContext
): string {
  const market = parseMarketContext(ctx.marketName)
  const h = header.toLowerCase().trim()

  // If the header lists allowed options in parentheses like "Field (A, B, C)" or "Field (A / B / C)", use those.
  const bracketMatch = header.match(/\(([^)]+)\)/)
  if (bracketMatch) {
    let options = bracketMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    if (options.length < 2) {
      // Try "/" as separator (e.g. "Industry Vertical (IT and ITES / Banking / Manufacturing)")
      options = bracketMatch[1].split('/').map(s => s.trim()).filter(Boolean)
    }
    if (options.length >= 2) {
      return pickVariant(options, rowIndex)
    }
  }

  const professional = professionalDriverValue(header, rowIndex, market)
  if (professional) return professional

  if (h.includes('first name') || h === 'firstname') return randomItem(DEMO_DATA.firstNames)
  if (h.includes('last name') || h === 'lastname' || h === 'surname') return randomItem(DEMO_DATA.lastNames)
  if (
    h.includes('full name') ||
    h === 'name' ||
    h.includes('customer name') ||
    h.includes('contact name') ||
    h.includes('client name') ||
    h.includes('contact person') ||
    h.includes('key contact') ||
    h.includes('decision maker') ||
    h.includes('decision-maker')
  ) {
    return `${randomItem(DEMO_DATA.firstNames)} ${randomItem(DEMO_DATA.lastNames)}`
  }
  if (h.includes('company') || h.includes('organization') || h.includes('account name')) {
    return `${market.productTitle} ${randomItem(['Co.', 'Ltd', 'GmbH', 'Inc', 'Group'])}`
  }
  if (h.includes('email') || h.includes('e-mail')) {
    const fn = randomItem(DEMO_DATA.firstNames).toLowerCase()
    const ln = randomItem(DEMO_DATA.lastNames).toLowerCase()
    return `${fn}.${ln}@${randomItem(DEMO_DATA.emailDomains)}`
  }
  if (h.includes('phone') || h.includes('mobile') || h.includes('whatsapp') || h.includes('tel')) {
    return randomPhone()
  }
  if (h.includes('linkedin') || h.includes('profile url')) {
    const slug = randomItem(DEMO_DATA.companies).toLowerCase().replace(/[^a-z0-9]/g, '')
    return `linkedin.com/in/${slug}-lead`
  }
  if (h.includes('website') || h.includes('url') || h.includes('web')) {
    const slug = randomItem(DEMO_DATA.companies).toLowerCase().replace(/[^a-z0-9]/g, '')
    return `www.${slug}.com`
  }
  if (h.includes('address') || h.includes('street')) {
    return `${randomNumber(10, 999)} ${randomItem(DEMO_DATA.streets)}, ${randomItem(DEMO_DATA.cities)}`
  }
  if (/\bcity\b|\btown\b/.test(h)) return randomItem(DEMO_DATA.cities)
  if (/\bcountry\b|\bnation\b/.test(h)) return randomItem(DEMO_DATA.countries)
  if (h.includes('region') || h.includes('territory')) return market.region
  if (h.includes('industry') || h.includes('sector')) return randomItem(DEMO_DATA.industries)
  if (h.includes('department') || h.includes('dept')) return randomItem(DEMO_DATA.departments)
  if (h.includes('title') || h.includes('designation') || h.includes('position')) {
    return randomItem(DEMO_DATA.titles)
  }
  if (h.includes('status') || h.includes('stage')) return randomItem(DEMO_DATA.statuses)
  if (h.includes('source') || h.includes('channel')) return randomItem(DEMO_DATA.sources)
  if (h.includes('date')) return randomDate()
  if (
    /\bid\b/.test(h) ||
    h === 'no' ||
    h === 'no.' ||
    h === 'sr' ||
    h === 'sno' ||
    h === 's.no' ||
    h === 's.no.' ||
    /\bsr\.?\s*no\.?\b/.test(h) ||
    h.includes('serial number') ||
    h.includes('row no') ||
    h.includes('sl no') ||
    h.includes('sl. no')
  ) {
    return String(rowIndex + 1)
  }
  if (h.includes('overview') || h.includes('business profile') || h.includes('company profile') || h.includes('about')) {
    const overviews = [
      `Leading ${market.productTitle} provider with operations across ${market.region}`,
      `Established ${market.productTitle} company focused on enterprise and institutional clients`,
      `${market.region}-based organization specializing in ${market.productTitle} procurement`,
      `Mid-tier ${market.productTitle} firm with a strong presence in the ${market.region} market`,
      `Globally active enterprise with significant ${market.productTitle} requirements`,
      `Fast-growing company in the ${market.productTitle} space with regional expansion plans`,
    ]
    return pickVariant(overviews, rowIndex)
  }
  if (h.includes('vertical') && !h.includes('industry')) return randomItem(DEMO_DATA.industries)
  if (/\bsize\b/.test(h) || /\bscale\b/.test(h)) {
    return pickVariant(['Small Enterprise', 'Medium Enterprise', 'Large Enterprise'], rowIndex)
  }
  if (h.includes('note') || h.includes('comment') || h.includes('remark') || h.includes('description')) {
    return `Relevant to ${market.marketLabel} — follow-up scheduled`
  }
  if (h.includes('revenue') || h.includes('value') || h.includes('amount')) {
    return `$${randomNumber(50000, 2500000)}`
  }
  if (h.includes('capacity') || h.includes('quantity') || h.includes('mtpa') || h.includes('mmbtu') || h.includes('tonnes')) {
    return randomNumber(1, 50, 1)
  }

  return `${market.productTitle} insight ${rowIndex + 1} (${market.region})`
}

export function fillEmptyCellsInRow(
  row: Record<string, unknown>,
  headers: string[],
  rowIndex: number,
  ctx: DemoGenerationContext
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const header of headers) {
    const raw = row[header]
    if (isEmptyCellValue(raw)) {
      out[header] = generateDemoValue(header, rowIndex, ctx)
    } else {
      out[header] = String(raw).trim()
    }
  }
  return out
}

export function generateDemoRows(
  headers: string[],
  rowCount: number,
  ctx: DemoGenerationContext
): Record<string, string>[] {
  const count = Math.max(1, rowCount)
  const rows: Record<string, string>[] = []
  for (let i = 0; i < count; i++) {
    const blank: Record<string, unknown> = {}
    rows.push(fillEmptyCellsInRow(blank, headers, i, ctx))
  }
  return rows
}

export function ensureIntelligenceRows(
  headers: string[],
  rows: Record<string, unknown>[],
  ctx: DemoGenerationContext
): Record<string, string>[] {
  const target =
    ctx.targetRowCount && ctx.targetRowCount > 0
      ? ctx.targetRowCount
      : rows.length > 0
        ? rows.length
        : DEFAULT_INTELLIGENCE_DEMO_ROW_COUNT

  if (headers.length === 0) return []

  if (rows.length === 0) {
    return generateDemoRows(headers, target, ctx)
  }

  const filled = rows.map((row, i) => fillEmptyCellsInRow(row, headers, i, ctx))

  while (filled.length < target) {
    filled.push(
      fillEmptyCellsInRow({}, headers, filled.length, ctx)
    )
  }

  return filled
}
