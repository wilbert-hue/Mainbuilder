'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useDashboardStore } from '@/lib/store'
import { Building2, Users } from 'lucide-react'
import { AccessDataCell, contactFieldOf } from './AccessDataCell'
import {
  buildStaticCustomerTemplate,
  buildStaticDistributorTemplate,
} from '@/lib/static-customer-template'
import { Lock } from 'lucide-react'
import MethodologyPanel from './MethodologyPanel'
import { buildDemoMethodology } from '@/lib/demo-methodology'
import { DEMO_SUBSCRIBE_NOTE } from '@/components/DemoDataNote'
import { distributorNoun } from '@/lib/module-labels'
import type { MethodologySection } from '@/lib/intelligence-sheet-types'

// ---------------------------------------------------------------------------
// Static Proposition 1 data — exact format from the reference template
// Exported so the builder page can load it into the store directly.
// ---------------------------------------------------------------------------
export const STATIC_PROP1_PARENT_HEADERS: ParentHeader[] = [
  { name: 'S. No.',                startCol: 0, colSpan: 1 },
  { name: 'Customer Information',  startCol: 1, colSpan: 6 },
  { name: 'Contact Details',       startCol: 7, colSpan: 6 },
]

export const STATIC_PROP1_HEADERS = [
  'S.No.',
  'Customer Name/Company Name',
  'Business Overview',
  'Industry/Sector',
  'Annual Revenue (US$ Million)',
  'Headquarter/Location',
  'Annual Procurement Volume/Value (Estimated)',
  'Key Contact Person',
  'Designation/Role',
  'Email Address',
  'Phone No. (Direct/Alternate)',
  'LinkedIn Profile',
  'Website URL',
]

function buildStaticProp1Rows(): Record<string, any>[] {
  return Array.from({ length: 20 }, (_, i) => {
    const row: Record<string, any> = { 'S.No.': i + 1 }
    STATIC_PROP1_HEADERS.slice(1).forEach((h) => { row[h] = 'xx' })
    return row
  })
}

export const STATIC_PROP1_DATA: PropositionData = {
  headers: STATIC_PROP1_HEADERS,
  rows: buildStaticProp1Rows(),
  parentHeaders: STATIC_PROP1_PARENT_HEADERS,
}

// ---------------------------------------------------------------------------
// Static Distributor Proposition 1 data
// ---------------------------------------------------------------------------
const USD_TO_INR = 84
const USD_TO_EUR = 0.92

type TableCurrency = 'USD' | 'INR' | 'EUR'

// Detects if a cell value is a USD monetary value like "$2367388" or "$1,234.56"
function parseUsdValue(val: string): number | null {
  const cleaned = val.trim()
  if (!cleaned.startsWith('$')) return null
  const numeric = cleaned.slice(1).replace(/,/g, '')
  const n = parseFloat(numeric)
  return isNaN(n) ? null : n
}

// Detects if a header is a USD monetary column
function isUsdMoneyHeader(header: string): boolean {
  const h = header.toLowerCase()
  return h.includes('us$') || h.includes('usd') || h.includes('revenue') ||
    h.includes('annual') || h.includes('salary') || h.includes('fee') ||
    h.includes('price') || h.includes('amount') || h.includes('cost') ||
    h.includes('income') || h.includes('value')
}

function formatInrCr(usdValue: number): string {
  const inrCr = (usdValue * USD_TO_INR) / 10_000_000
  return `₹ ${inrCr.toFixed(2)} Cr.`
}

function formatEur(usdValue: number): string {
  const eurValue = usdValue * USD_TO_EUR
  return `€ ${eurValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function transformHeader(header: string, currency: TableCurrency): string {
  if (currency === 'USD') return header
  if (currency === 'INR') {
    // Replace USD/US$ labels in the header with INR Cr.
    return header
      .replace(/\bUS\$\b/gi, 'INR Cr.')
      .replace(/\bUSD\b/gi, 'INR Cr.')
      .replace(/\bMilli(on)?\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }
  // EUR: keep the "Million" unit, just relabel the currency
  return header
    .replace(/\bUS\$\b/gi, 'EUR')
    .replace(/\bUSD\b/gi, 'EUR')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function renderCellValue(header: string, rawVal: any, currency: TableCurrency): string {
  if (rawVal === undefined || rawVal === null || rawVal === '') return ''
  const strVal = String(rawVal)
  if (currency === 'USD') return strVal
  // Only convert cells in money-type columns
  if (!isUsdMoneyHeader(header)) return strVal
  const usdAmount = parseUsdValue(strVal)
  if (usdAmount === null) return strVal
  return currency === 'INR' ? formatInrCr(usdAmount) : formatEur(usdAmount)
}

interface ParentHeader {
  name: string
  startCol: number
  colSpan: number
}

interface PropositionData {
  headers: string[]
  rows: Record<string, any>[]
  parentHeaders?: ParentHeader[] | null
  /** Title / definition lines that sat above the table in the source sheet. */
  notes?: string[]
  /** Parsed METHODOLOGY block, when the source sheet opens with one. */
  methodology?: MethodologySection[]
}

type TabType = 'prop1' | 'prop2' | 'prop3'
type TierKey = 'standard' | 'advance' | 'premium'

function buildGeographyLabel(filters: { geographies: string[] }, data: unknown): string {
  const g = filters.geographies
  if (g && g.length > 0) {
    return g.length === 1 ? g[0] : `${g.length} regions`
  }
  const d = data as { dimensions?: { geographies?: { all_geographies?: string[] } } } | null
  const all = d?.dimensions?.geographies?.all_geographies
  if (all && all.length > 0) return all[0]
  return ''
}

function buildMarketLine(
  dashboardName: string | null,
  data: unknown,
  _filters: { geographies: string[] }
): string {
  return (
    (dashboardName && dashboardName.trim()) ||
    (data as { metadata?: { market_name?: string } } | null)?.metadata?.market_name ||
    'Market'
  )
}

function buildIncludesSummary(d: PropositionData | null): string {
  if (!d?.headers?.length) return ''
  const parents = d.parentHeaders?.filter((p) => p.name && String(p.name).trim())
  if (parents && parents.length > 0) {
    return parents
      .map((p) => `${p.name.trim()} (${p.colSpan} field${p.colSpan === 1 ? '' : 's'})`)
      .join(', ')
  }
  const n = d.headers.length
  return `All columns (${n} field${n === 1 ? '' : 's'})`
}

function tierPillClass(tier: TierKey): string {
  if (tier === 'premium') return 'bg-purple-500 text-white border border-purple-400/80'
  if (tier === 'advance') return 'bg-indigo-100 text-indigo-900 border border-indigo-200'
  return 'bg-slate-200 text-slate-800 border border-slate-300'
}

/**
 * Columns dropped before render.
 *
 * Customer: the two fields the directory does not populate for buyers.
 * Distributor: "Office Website" repeats "Website" verbatim in every source
 * workbook, so the pair reads as a duplicate column.
 */
const HIDDEN_COLUMNS: Record<'customer' | 'distributor', string[]> = {
  customer: ['Whom They Sell To', 'Distribution Channel'],
  distributor: ['Office Website'],
}

/** Shown in place of a blank cell — the value exists, it is just gated. */
/**
 * A row-counter column, as opposed to real data.
 *
 * The verified directories keep the numbering from the research sheet, which
 * runs over the rows that were screened out too — so a 159-row table counts up
 * to 286 with gaps. Renumber those sequentially on display.
 */
const isRowNumberColumn = (header: string): boolean =>
  /^(#|s\.?\s*no\.?|sr\.?\s*no\.?|serial\s*no\.?)$/i.test(header.trim())

/**
 * Brand palette for the Procurement Intelligence band at the end of a customer
 * directory. Columns cycle through it left to right, greens deepening into
 * blues; each column's header sits over a tint of its own colour.
 */
const PROCUREMENT_PALETTE = [
  { head: '#D9ED92', cell: '#F5FAE3', border: '#C7E27A', text: '#33400F' },
  { head: '#B5E48C', cell: '#EAF7DD', border: '#9FD873', text: '#2C4214' },
  { head: '#99D98C', cell: '#E4F4DE', border: '#83CC77', text: '#223B1B' },
  { head: '#76C893', cell: '#DEF1E5', border: '#5FB881', text: '#17352A' },
  { head: '#52B69A', cell: '#D8EEE8', border: '#3FA287', text: '#10312A' },
  { head: '#34A0A4', cell: '#D4EAEB', border: '#2A8C90', text: '#0C2D2E' },
  { head: '#168AAD', cell: '#D2E6EF', border: '#137693', text: '#082831' },
  { head: '#1A759F', cell: '#D4E2EA', border: '#15617F', text: '#07222D' },
  { head: '#1E6091', cell: '#D5DFEA', border: '#184F77', text: '#061D2B' },
  { head: '#184E77', cell: '#D4DCE5', border: '#123D5E', text: '#051825' },
]

const LOCKED_CELL_NOTE = 'Kindly subscribe to access these details'

/**
 * One shared dashboard shows a lock where these columns are blank, instead of
 * the usual em dash. Scoped to that link by request — every other dashboard
 * keeps the dash, so widen this only if the client asks for it elsewhere.
 */
const LOCKED_COLUMN_DASHBOARD_ID = 'e0d3b37e7c3982c9464c82dc'

/**
 * A cell with nothing in it. On the locked columns the source workbook writes a
 * lone dash for "not disclosed", which is the same thing as empty.
 */
const isEmptyCell = (value: unknown, dashIsEmpty: boolean): boolean => {
  if (value === undefined || value === null) return true
  const text = String(value).trim()
  if (text === '') return true
  return dashIsEmpty && /^[-–—]+$/.test(text)
}

/** "Annual Revenue" and "Partnership & Purchasing Intent", however they are spelled. */
const isLockedColumn = (header: string): boolean => {
  const h = header.trim().toLowerCase()
  return /annual\s*revenue/.test(h) || (/partnership/.test(h) && /intent/.test(h))
}

function PropositionTableDashboard({
  data,
  tier,
  bannerTitle,
  directoryNoun,
  currency,
  intelligenceSource,
  suitePreview,
  templateMode = false,
  lockBlankColumns = false,
}: {
  data: PropositionData
  tier: TierKey
  bannerTitle: string
  /** What the rows are: "customers", "distributors", "channel partners". */
  directoryNoun: string
  currency: TableCurrency
  intelligenceSource: 'customer' | 'distributor'
  suitePreview: boolean
  /** Static template: every empty cell reads as withheld, not missing. */
  templateMode?: boolean
  /** Blank revenue/intent cells read as withheld rather than missing. */
  lockBlankColumns?: boolean
}) {
  const rawHeaders = data.headers?.length ? data.headers : Object.keys(data.rows[0] || {})
  const parentHeaders = data.parentHeaders
  // Columns under the last band are the procurement group; they get their own
  // colour so the derived intelligence reads apart from the fixed profile.
  // Only a trailing *derived* group is tinted. A table with a single band —
  // the distributor directory — is plain throughout; treating its one band as
  // the accent coloured every column.
  const accentBand =
    parentHeaders && parentHeaders.length > 1 ? parentHeaders[parentHeaders.length - 1] : null
  const isAccentColumn = (index: number) =>
    !!accentBand && accentBand.colSpan > 0 && index >= accentBand.startCol
  /** Each procurement column gets its own tint so they read as separate facets. */
  const accentTone = (index: number) => {
    const tone = PROCUREMENT_PALETTE[(index - (accentBand?.startCol ?? 0)) % PROCUREMENT_PALETTE.length]
    return {
      head: { backgroundColor: tone.head, color: tone.text, borderColor: tone.border },
      cell: { backgroundColor: tone.cell, borderColor: tone.border },
    }
  }
  const hidden = HIDDEN_COLUMNS[intelligenceSource]
  // Banded headers carry colSpans tied to the full column list, so dropping a
  // column there would misalign the band — leave those sheets untouched.
  const headers =
    !suitePreview || parentHeaders?.length
      ? rawHeaders
      : rawHeaders.filter(
          (h) => !hidden.some((x) => x.toLowerCase() === String(h).trim().toLowerCase())
        )

  const tierLabel = tier === 'premium' ? 'Premium' : tier === 'advance' ? 'Advance' : 'Standard'

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm bg-white">
      {/* Navy banner — matches reference */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-[#1a2d4a] text-white">
        <div className="min-w-0">
          <p className="text-sm sm:text-base font-semibold leading-snug truncate" title={bannerTitle}>
            {bannerTitle}
          </p>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Verified directory and insight on {directoryNoun}
          </p>
        </div>
        <span
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${tierPillClass(tier)}`}
        >
          {tierLabel}
        </span>
      </div>

      {/* Methodology — how the directory below was assembled. Collapsible, as
          the source workbook's outline groups are. */}
      {data.methodology && data.methodology.length > 0 && (
        <MethodologyPanel sections={data.methodology} locked />
      )}

      {/* Sheet preamble — the title/definition lines that sit above the table in
          the source workbook. Rendered as a caption so they stay readable
          instead of being forced into table cells. */}
      {data.notes && data.notes.length > 0 && (
        <div className="border-b border-sky-200 bg-sky-50 px-5 py-3 space-y-1.5">
          {data.notes.map((note, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? 'text-sm font-semibold text-slate-900'
                  : 'text-xs leading-relaxed text-slate-600'
              }
            >
              {note}
            </p>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          {parentHeaders && parentHeaders.length > 0 && (
            <thead>
              <tr className="bg-slate-700 text-white">
                {parentHeaders.map((ph, index) => {
                  const accent = parentHeaders.length > 1 && index === parentHeaders.length - 1
                  // An unnamed band painted a bare dark strip above the column
                  // names; blend those into the header row instead.
                  const blank = !ph.name?.trim()
                  return (
                    <th
                      key={index}
                      colSpan={ph.colSpan}
                      title={ph.name?.trim() || undefined}
                      className={`px-3 align-middle text-xs font-semibold uppercase tracking-wide border-r last:border-r-0 ${
                        blank
                          ? 'p-0 bg-sky-100 border-sky-200/80'
                          : accent
                          ? 'py-2 text-left bg-[#7c5a12] text-amber-50 border-amber-700'
                          : 'py-2 text-left border-slate-600'
                      }`}
                    >
                      {/* A band can be wider than the viewport, so its label
                          sticks to the left edge of the scroll area — otherwise
                          scrolling right leaves an apparently empty strip. */}
                      <span className="sticky left-3 inline-block max-w-[min(100%,34rem)] truncate leading-tight">
                        {ph.name?.trim() || ''}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
          )}
          <thead>
            <tr className="bg-sky-100 text-slate-900 border-b border-sky-200">
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-3 py-2.5 text-left text-xs font-semibold border-r last:border-r-0 min-w-[11rem] max-w-[16rem] border-sky-200/80"
                  style={isAccentColumn(index) ? accentTone(index).head : undefined}
                  title={transformHeader(header, currency)}
                >
                  {transformHeader(header, currency)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/90'}
              >
                {headers.map((header, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-3 py-2.5 text-sm text-slate-800 border-b border-slate-100 border-r last:border-r-0 align-top min-w-[11rem] max-w-[18rem] border-slate-100/80"
                    style={isAccentColumn(colIndex) ? accentTone(colIndex).cell : undefined}
                  >
                    {isRowNumberColumn(String(header)) ? (
                      <span>{rowIndex + 1}</span>
                    ) : !isEmptyCell(row[header], lockBlankColumns && isLockedColumn(String(header))) ? (
                      <span className="line-clamp-3" title={renderCellValue(header, row[header], currency)}>
                        {renderCellValue(header, row[header], currency)}
                      </span>
                    ) : templateMode || (lockBlankColumns && isLockedColumn(String(header))) ? (
                      <span className="text-slate-400" title={DEMO_SUBSCRIBE_NOTE}>
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                    ) : suitePreview && contactFieldOf(String(header)) ? (
                      <AccessDataCell row={row} field={contactFieldOf(String(header))!} />
                    ) : (
                      <span className={suitePreview ? 'text-xs italic text-slate-400' : 'text-slate-400'}>
                        {suitePreview ? LOCKED_CELL_NOTE : '—'}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface CustomerIntelligenceTableProps {
  title?: string
  /** Which uploaded workbook slice to display (customer vs distributor proposition tables) */
  intelligenceSource?: 'customer' | 'distributor'
}

export function CustomerIntelligenceTable({
  title,
  intelligenceSource = 'customer',
}: CustomerIntelligenceTableProps) {
  const {
    rawIntelligenceData,
    proposition2Data,
    proposition3Data,
    distributorRawIntelligenceData,
    distributorProposition2Data,
    distributorProposition3Data,
    intelligenceType,
    dashboardName,
    data,
    filters,
    currency,
    staticCustomerProp1,
    staticDistributorProp1,
    b2bSurveyData,
  } = useDashboardStore()

  // Column hiding and the subscribe placeholder belong to the survey-backed
  // preview dashboards; a plain intelligence upload renders in full.
  const isSuitePreview = !!b2bSurveyData?.segments?.length

  const tableCurrency = (currency || data?.metadata?.currency || 'USD') as TableCurrency

  const p1 = intelligenceSource === 'distributor' ? distributorRawIntelligenceData : rawIntelligenceData
  const p2 = intelligenceSource === 'distributor' ? distributorProposition2Data : proposition2Data
  const p3 = intelligenceSource === 'distributor' ? distributorProposition3Data : proposition3Data

  const hasProp1 = p1 && p1.rows && p1.rows.length > 0
  const hasProp2 = p2 && p2.rows && p2.rows.length > 0
  const hasProp3 = p3 && p3.rows && p3.rows.length > 0

  const getDefaultTab = (): TabType => {
    if (hasProp1) return 'prop1'
    if (hasProp2) return 'prop2'
    if (hasProp3) return 'prop3'
    return 'prop1'
  }

  const [activeTab, setActiveTab] = useState<TabType>(getDefaultTab())
  // staticProp1 comes from the store (set via the builder toggle)
  const staticProp1 = intelligenceSource === 'customer' ? staticCustomerProp1 : staticDistributorProp1
  // The customer template's trailing columns follow this market's segments.
  const staticData = useMemo(() => {
    const template =
      intelligenceSource === 'distributor'
        ? (buildStaticDistributorTemplate() as PropositionData)
        : (buildStaticCustomerTemplate(data, dashboardName ?? undefined) as PropositionData)
    // No workbook means no METHODOLOGY rows to parse, so the block is written
    // from the market name instead. Only the customer directory carries one —
    // a distributor list is not assembled this way.
    if (intelligenceSource === 'distributor') return template
    return {
      ...template,
      methodology: buildDemoMethodology(dashboardName ?? data?.metadata?.market_name),
    } as PropositionData
  }, [intelligenceSource, data, dashboardName])

  useEffect(() => {
    const currentTabHasData =
      (activeTab === 'prop1' && hasProp1) ||
      (activeTab === 'prop2' && hasProp2) ||
      (activeTab === 'prop3' && hasProp3)

    if (!currentTabHasData) {
      setActiveTab(getDefaultTab())
    }
  }, [p1, p2, p3, activeTab, hasProp1, hasProp2, hasProp3])

  const hasData = hasProp1 || hasProp2 || hasProp3

  // Scoped to one shared link; see LOCKED_COLUMN_DASHBOARD_ID.
  const pathname = usePathname()
  const lockBlankColumns = !!pathname?.includes(LOCKED_COLUMN_DASHBOARD_ID)

  const marketLine = useMemo(
    () => buildMarketLine(dashboardName, data, filters),
    [dashboardName, data, filters]
  )

  /** "Distributor" on a trade market, "Channel Partner" on a technology one. */
  const typeLabel =
    intelligenceSource === 'distributor' ? distributorNoun(dashboardName) : 'Customer'

  const bannerTitle = useMemo(
    () => `${marketLine} – ${typeLabel} Database`,
    [marketLine, typeLabel]
  )

  /** Plural, lower case: what the directory lists. */
  const directoryNoun = `${typeLabel.toLowerCase()}s`

  const heading = title?.trim() || `${typeLabel} Intelligence Database`
  const subtitle =
    intelligenceSource === 'distributor'
      ? `${marketLine} · Verified ${typeLabel.toLowerCase()} directory across proposition tiers`
      : intelligenceType === 'both'
        ? `${marketLine} · Intelligence directory across proposition tiers`
        : `${marketLine} · Verified ${typeLabel.toLowerCase()} directory across proposition tiers`

  const tabs: {
    id: TabType
    label: string
    tier: TierKey
    hasData: boolean
    count: number
  }[] = [
    { id: 'prop1', label: (p1 as any)?.sheetLabel || 'Proposition 1', tier: 'standard', hasData: !!hasProp1, count: p1?.rows?.length || 0 },
    ...(staticProp1
      ? []
      : [
          { id: 'prop2' as TabType, label: (p2 as any)?.sheetLabel || 'Proposition 2', tier: 'advance' as TierKey, hasData: !!hasProp2, count: p2?.rows?.length || 0 },
          { id: 'prop3' as TabType, label: (p3 as any)?.sheetLabel || 'Proposition 3', tier: 'premium' as TierKey, hasData: !!hasProp3, count: p3?.rows?.length || 0 },
        ]),
  ]

  const tierLabelShort = (t: TierKey) =>
    t === 'premium' ? 'Premium' : t === 'advance' ? 'Advance' : 'Standard'

  const getActiveData = (): PropositionData | null => {
    switch (activeTab) {
      case 'prop1':
        return p1 as PropositionData | null
      case 'prop2':
        return p2 as PropositionData | null
      case 'prop3':
        return p3 as PropositionData | null
      default:
        return null
    }
  }

  const activeTier = tabs.find((t) => t.id === activeTab)?.tier || 'standard'
  const activeData = getActiveData()
  const includesText = useMemo(() => {
    const d = activeTab === 'prop1' ? p1 : activeTab === 'prop2' ? p2 : p3
    return buildIncludesSummary(d as PropositionData | null)
  }, [activeTab, p1, p2, p3])

  // When static mode is on, render the fixed template immediately
  if (staticProp1) {
    return (
      <div className="w-full space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{heading}</h2>
          <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>
        </div>

        <PropositionTableDashboard
          data={staticData}
          tier="standard"
          bannerTitle={bannerTitle}
          directoryNoun={directoryNoun}
          currency={tableCurrency}
          intelligenceSource={intelligenceSource}
          suitePreview={isSuitePreview}
          templateMode={staticProp1}
        />
      </div>
    )
  }

  if (!hasData) {
    const EmptyIcon = intelligenceSource === 'distributor' ? Building2 : Users
    return (
      <div className="bg-slate-50 rounded-xl p-10 text-center border border-slate-200">
        <EmptyIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-900 font-semibold mb-2">No {typeLabel} Intelligence Data Available</p>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Upload your framework workbook in the Dashboard Builder
          {intelligenceSource === 'distributor' && intelligenceType === 'both'
            ? ' (distributor workbook when both types are enabled)'
            : ''}{' '}
          (one file with Proposition 1–3 sheets) to populate this view.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-5">
      {/* Page-style title block */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{heading}</h2>
        <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>
      </div>

      {/* Proposition tier tabs — large controls like reference */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tabs.map((tab) => {
          const selected = activeTab === tab.id
          const disabled = !tab.hasData
          const tierShort = tierLabelShort(tab.tier)

          let selectedClass =
            'border-slate-900 bg-[#1a2d4a] text-white shadow-md ring-1 ring-slate-900/10'
          if (tab.tier === 'standard' && selected) {
            selectedClass = 'border-teal-600 bg-teal-50 text-teal-950 shadow-md ring-1 ring-teal-600/20'
          }
          if (tab.tier === 'advance' && selected) {
            selectedClass = 'border-indigo-800 bg-indigo-950 text-white shadow-md ring-1 ring-indigo-950/30'
          }
          if (tab.tier === 'premium' && selected) {
            selectedClass = 'border-slate-900 bg-[#1a2d4a] text-white shadow-md ring-1 ring-slate-900/20'
          }

          return (
            <button
              key={tab.id}
              type="button"
              disabled={disabled}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'relative flex flex-col items-stretch rounded-xl border-2 px-4 py-3 text-left transition-all',
                disabled ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-50' : 'cursor-pointer',
                !disabled && !selected ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50' : '',
                !disabled && selected ? selectedClass : '',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-semibold ${selected && tab.tier === 'premium' ? 'text-white' : selected && tab.tier === 'advance' ? 'text-white' : selected ? 'text-teal-950' : 'text-slate-800'}`}>
                  {tab.label}
                </span>
                <span
                  className={[
                    'shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                    tab.tier === 'premium'
                      ? selected
                        ? 'bg-purple-500 text-white'
                        : 'bg-purple-100 text-purple-800 border border-purple-200'
                      : tab.tier === 'advance'
                        ? selected
                          ? 'bg-indigo-400 text-white'
                          : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                        : selected
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-600 border border-slate-200',
                  ].join(' ')}
                >
                  {tierShort}
                </span>
              </div>
              <span
                className={`text-xs mt-1 ${selected && (tab.tier === 'premium' || tab.tier === 'advance') ? 'text-slate-200' : selected ? 'text-teal-800/80' : 'text-slate-500'}`}
              >
                {tab.hasData ? `${tab.count} records` : 'No data'}
              </span>
            </button>
          )
        })}
      </div>

      {/* Includes strip */}
      {activeData && includesText && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-700">
          <span className="font-semibold text-sky-900">Includes: </span>
          <span>{includesText}</span>
        </div>
      )}

      {/* Table */}
      {activeData && activeData.rows && activeData.rows.length > 0 && (
        <PropositionTableDashboard
          data={activeData}
          tier={activeTier}
          bannerTitle={bannerTitle}
          directoryNoun={directoryNoun}
          currency={tableCurrency}
          intelligenceSource={intelligenceSource}
          suitePreview={isSuitePreview}
          templateMode={staticProp1}
          lockBlankColumns={lockBlankColumns}
        />
      )}

      <p className="text-xs text-slate-500 border-t border-slate-200 pt-3">
        Totals across all loaded propositions:{' '}
        <span className="font-semibold text-slate-800">
          {(p1?.rows?.length || 0) + (p2?.rows?.length || 0) + (p3?.rows?.length || 0)} rows
        </span>
        {intelligenceSource === 'distributor'
          ? ' · Distributor workbook'
          : intelligenceType === 'distributor'
            ? ' · Distributor view'
            : intelligenceType === 'both'
              ? ' · Customer workbook'
              : ''}
      </p>
    </div>
  )
}

export default CustomerIntelligenceTable
