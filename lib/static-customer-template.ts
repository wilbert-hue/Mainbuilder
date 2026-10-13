/**
 * Static Customer Intelligence template.
 *
 * Mirrors the layout of the reference workbook
 * (ap_automation__global_ALL_COLUMNS_FILLED.xlsx): a fixed block of company and
 * contact columns, then a "Procurement Intelligence" band whose columns are the
 * market's own segment types — so the template reads as that market's directory
 * rather than a generic one.
 */

import type { ComparisonData } from '@/lib/types'

export interface TemplateParentHeader {
  name: string
  startCol: number
  colSpan: number
}

export interface TemplateData {
  headers: string[]
  rows: Record<string, unknown>[]
  parentHeaders: TemplateParentHeader[] | null
}

/** The fixed columns, in the reference workbook's order. */
export const STATIC_CUSTOMER_BASE_HEADERS = [
  'Company Name',
  'Type',
  'Founded Year',
  'Headquarters',
  'Region',
  'Countries/Regions',
  'Ownership',
  'Business Type (specific)',
  'Employees',
  'Contact Person',
  'Contact Role',
  'Email',
  'Phone',
  'LinkedIn',
  'Domain',
  'Application',
  'Sub-application',
  'Use Case',
  'Whom They Sell To',
  'Industry Type',
  'Enterprise Size',
  'Entity Type',
]

export const PROCUREMENT_INTELLIGENCE_BANNER =
  'Procurement Intelligence (derived by primary research and/or real-time trigger signals and/or captured intent)'

/** Columns to fall back on when no market workbook has been uploaded yet. */
const FALLBACK_SEGMENT_COLUMNS = ['Solutions they procure', 'Technologies they procure']

/** Title-case a value that arrived all-lower or all-upper, leaving "AP Module" alone. */
function normaliseCase(value: string): string {
  const hasMixedCase = value !== value.toLowerCase() && value !== value.toUpperCase()
  if (hasMixedCase) return value
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

/**
 * Segment type → column name: "By Solution Type" becomes "Solution", "BY
 * technology type" becomes "Technology".
 */
/**
 * Segment types that describe *who the customer is* rather than what they buy.
 * A procurement column for one of these would read "End Users they procure",
 * so they are left out of the band entirely.
 */
const AUDIENCE_SEGMENTS =
  /^(by\s+)?(end[\s-]?use[rs]?([\s-]?industry|[\s-]?application)?|industry([\s-]?vertical)?|vertical|enterprise([\s-]?type|[\s-]?size)?|application|sub[\s-]?application|customer([\s-]?type)?|user([\s-]?type)?|organi[sz]ation([\s-]?type|[\s-]?size)?|company([\s-]?type|[\s-]?size)?|region|geography|country)(\s+types?)?$/i

/** True when a segment type describes the buyer rather than the purchase. */
export function isAudienceSegment(segmentType: string): boolean {
  return AUDIENCE_SEGMENTS.test(segmentType.trim())
}

/** Naive pluralisation — good enough for the nouns segment types use. */
function pluralise(value: string): string {
  const words = value.split(/\s+/)
  const last = words[words.length - 1]
  if (!last) return value
  if (/(s|x|z|ch|sh)$/i.test(last)) words[words.length - 1] = `${last}es`
  else if (/[^aeiou]y$/i.test(last)) words[words.length - 1] = `${last.slice(0, -1)}ies`
  else if (!/s$/i.test(last)) words[words.length - 1] = `${last}s`
  return words.join(' ')
}

/**
 * Segment type → procurement column, naming the market it belongs to:
 * "Online Substation Monitoring System - By Polymer Type - they procure".
 *
 * The segment type is kept verbatim, so the column reads as the taxonomy the
 * report itself uses.
 */
/**
 * "Online Substation Monitoring System Market" → "Online Substation Monitoring
 * System". Strips repeatedly, so "… Industry Analysis" reduces fully too.
 */
function marketSubject(market: string): string {
  let subject = market.trim()
  for (;;) {
    const next = subject.replace(/\s*(industry|market|analysis|report)\s*$/i, '').trim()
    if (next === subject || !next) break
    subject = next
  }
  return subject || market.trim()
}

export function segmentTypeToColumn(segmentType: string, market?: string): string {
  const taxonomy = segmentType.trim()
  const subject = market ? marketSubject(market) : ''
  return subject ? `${subject} - ${taxonomy} - they procure` : `${taxonomy} - they procure`
}

/** The market's segment types as Procurement Intelligence column names. */
export function procurementColumns(
  data: ComparisonData | null | undefined,
  market?: string
): string[] {
  const types = Object.keys(data?.dimensions?.segments ?? {}).filter((t) => !isAudienceSegment(t))
  const columns: string[] = []
  for (const type of types) {
    const name = segmentTypeToColumn(type, market)
    // Two segment types can reduce to the same label; keep the first.
    if (name && !columns.includes(name)) columns.push(name)
  }
  return columns.length ? columns : FALLBACK_SEGMENT_COLUMNS
}

/**
 * Build the 20-row template for a market.
 *
 * Cells carry "xx" placeholders: this is a layout preview, shown when the
 * builder's static toggle is on, not a data set.
 */
/**
 * Distributor directory columns, matching the verified distributor workbook.
 * No derived band here: a distributor row describes the company, not what it
 * procures.
 */
export const STATIC_DISTRIBUTOR_HEADERS = [
  '#',
  'Company',
  'Website',
  'Founded',
  'Headquarters',
  'Continent / Geography',
  'Operational Presence',
  'Ownership',
  'Employees',
  'Core Categories',
  'Specialty Focus',
  'Key Products / Technologies',
  'Online / Offline / Both',
  'Contact Person',
  'Role',
  'Email',
  'LinkedIn',
  'Office No.',
  'Office Email',
  'Country Code / Region Code',
]

/** Builds the 20-row distributor template. Cells are blank so the table
 *  renders each as a locked placeholder. */
export function buildStaticDistributorTemplate(): TemplateData {
  const headers = STATIC_DISTRIBUTOR_HEADERS
  const rows = Array.from({ length: 20 }, () => {
    const row: Record<string, unknown> = {}
    headers.forEach((h) => {
      row[h] = ''
    })
    return row
  })
  return {
    headers,
    rows,
    parentHeaders: [
      { name: 'Distributor Profile & Contact Details', startCol: 0, colSpan: headers.length },
    ],
  }
}

export function buildStaticCustomerTemplate(
  data: ComparisonData | null | undefined,
  /** Dashboard name; its subject leads each procurement column. */
  market?: string
): TemplateData {
  const segmentColumns = procurementColumns(data, market ?? data?.metadata?.market_name)
  const headers = [...STATIC_CUSTOMER_BASE_HEADERS, ...segmentColumns]

  // Blank, not "xx": the table renders an empty cell as a locked placeholder.
  const rows = Array.from({ length: 20 }, () => {
    const row: Record<string, unknown> = {}
    headers.forEach((h) => {
      row[h] = ''
    })
    return row
  })

  return {
    headers,
    rows,
    // One unnamed band over the fixed columns, then the derived group.
    parentHeaders: [
      {
        name: 'Company Profile & Contact Details',
        startCol: 0,
        colSpan: STATIC_CUSTOMER_BASE_HEADERS.length,
      },
      {
        name: PROCUREMENT_INTELLIGENCE_BANNER,
        startCol: STATIC_CUSTOMER_BASE_HEADERS.length,
        colSpan: segmentColumns.length,
      },
    ],
  }
}
