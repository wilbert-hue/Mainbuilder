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
const FALLBACK_SEGMENT_COLUMNS = ['Solution', 'Deployment', 'Application', 'End User']

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
export function segmentTypeToColumn(segmentType: string): string {
  const stripped = segmentType
    .trim()
    .replace(/^by\s+/i, '')
    .replace(/\s+type$/i, '')
    .trim()
  return normaliseCase(stripped || segmentType.trim())
}

/** The market's segment types as Procurement Intelligence column names. */
export function procurementColumns(data: ComparisonData | null | undefined): string[] {
  const types = Object.keys(data?.dimensions?.segments ?? {})
  const columns: string[] = []
  for (const type of types) {
    const name = segmentTypeToColumn(type)
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
export function buildStaticCustomerTemplate(
  data: ComparisonData | null | undefined
): TemplateData {
  const segmentColumns = procurementColumns(data)
  const headers = [...STATIC_CUSTOMER_BASE_HEADERS, ...segmentColumns]

  const rows = Array.from({ length: 20 }, () => {
    const row: Record<string, unknown> = {}
    headers.forEach((h) => {
      row[h] = 'xx'
    })
    return row
  })

  return {
    headers,
    rows,
    // One unnamed band over the fixed columns, then the derived group.
    parentHeaders: [
      { name: '', startCol: 0, colSpan: STATIC_CUSTOMER_BASE_HEADERS.length },
      {
        name: PROCUREMENT_INTELLIGENCE_BANNER,
        startCol: STATIC_CUSTOMER_BASE_HEADERS.length,
        colSpan: segmentColumns.length,
      },
    ],
  }
}
