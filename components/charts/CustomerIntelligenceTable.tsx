'use client'

import { useState, useEffect, useMemo } from 'react'
import { useDashboardStore } from '@/lib/store'
import { Building2, Users } from 'lucide-react'

const USD_TO_INR = 84

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

function transformHeader(header: string, isINR: boolean): string {
  if (!isINR) return header
  // Replace USD/US$ labels in the header with INR Cr.
  return header
    .replace(/\bUS\$\b/gi, 'INR Cr.')
    .replace(/\bUSD\b/gi, 'INR Cr.')
    .replace(/\bMilli(on)?\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function renderCellValue(header: string, rawVal: any, isINR: boolean): string {
  if (rawVal === undefined || rawVal === null || rawVal === '') return ''
  const strVal = String(rawVal)
  if (!isINR) return strVal
  // Only convert cells in money-type columns
  if (!isUsdMoneyHeader(header)) return strVal
  const usdAmount = parseUsdValue(strVal)
  if (usdAmount === null) return strVal
  return formatInrCr(usdAmount)
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
  filters: { geographies: string[] }
): string {
  const geo = buildGeographyLabel(filters, data)
  const market =
    (dashboardName && dashboardName.trim()) ||
    (data as { metadata?: { market_name?: string } } | null)?.metadata?.market_name ||
    'Market'
  // Don't prepend geography if the dashboard name already starts with it
  if (geo && !market.toLowerCase().startsWith(geo.toLowerCase())) {
    return `${geo} ${market}`
  }
  return market
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

function PropositionTableDashboard({
  data,
  tier,
  bannerTitle,
  showDemoNote,
  isINR,
}: {
  data: PropositionData
  tier: TierKey
  bannerTitle: string
  showDemoNote: boolean
  isINR: boolean
}) {
  const rawHeaders = data.headers?.length ? data.headers : Object.keys(data.rows[0] || {})
  const headers = rawHeaders
  const parentHeaders = data.parentHeaders

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
            Verified directory and insight on customers
            {showDemoNote ? (
              <>
                {' '}
                · <span className="text-sky-200">Demo Data</span>
              </>
            ) : null}
          </p>
        </div>
        <span
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${tierPillClass(tier)}`}
        >
          {tierLabel}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          {parentHeaders && parentHeaders.length > 0 && (
            <thead>
              <tr className="bg-slate-700 text-white">
                {parentHeaders.map((ph, index) => (
                  <th
                    key={index}
                    colSpan={ph.colSpan}
                    className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide border-r border-slate-600 last:border-r-0"
                  >
                    {ph.name || '\u00a0'}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <thead>
            <tr className="bg-sky-100 text-slate-900 border-b border-sky-200">
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-3 py-2.5 text-left text-xs font-semibold border-r border-sky-200/80 last:border-r-0 max-w-[14rem] truncate"
                  title={transformHeader(header, isINR)}
                >
                  {transformHeader(header, isINR)}
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
                    className="px-3 py-2.5 text-sm text-slate-800 border-b border-slate-100 border-r border-slate-100/80 last:border-r-0 align-top max-w-[18rem]"
                  >
                    {row[header] !== undefined && row[header] !== null && row[header] !== '' ? (
                      <span className="line-clamp-3" title={renderCellValue(header, row[header], isINR)}>
                        {renderCellValue(header, row[header], isINR)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
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
    showDemoNote,
    currency,
  } = useDashboardStore()

  const isINR = (currency || data?.metadata?.currency || 'USD') === 'INR'

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

  const marketLine = useMemo(
    () => buildMarketLine(dashboardName, data, filters),
    [dashboardName, data, filters]
  )

  const bannerTitle = useMemo(
    () =>
      intelligenceSource === 'distributor'
        ? `${marketLine} – Distributor Database`
        : `${marketLine} – Customer Database`,
    [marketLine, intelligenceSource]
  )

  const typeLabel =
    intelligenceSource === 'distributor'
      ? 'Distributor'
      : 'Customer'

  const heading = title?.trim() || `${typeLabel} Intelligence Database`
  const subtitle =
    intelligenceSource === 'distributor'
      ? `${marketLine} · Verified distributor directory across proposition tiers`
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
    { id: 'prop1', label: 'Proposition 1', tier: 'standard', hasData: !!hasProp1, count: p1?.rows?.length || 0 },
    { id: 'prop2', label: 'Proposition 2', tier: 'advance', hasData: !!hasProp2, count: p2?.rows?.length || 0 },
    { id: 'prop3', label: 'Proposition 3', tier: 'premium', hasData: !!hasProp3, count: p3?.rows?.length || 0 },
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
          showDemoNote={showDemoNote}
          isINR={isINR}
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
