'use client'

/**
 * DashboardShell – the full interactive dashboard UI.
 *
 * Reads all data from the Zustand store. Assumes the caller has already
 * hydrated the store with the relevant data before rendering this component.
 *
 * Used by:
 *   - app/page.tsx          (normal dashboard flow)
 *   - app/shared/[id]/page.tsx  (shared-link flow)
 */

import { useEffect, useState, useRef } from 'react'
import { useDashboardStore } from '@/lib/store'
import { EnhancedFilterPanel } from '@/components/filters/EnhancedFilterPanel'
import { GroupedBarChart } from '@/components/charts/GroupedBarChart'
import { MultiLineChart } from '@/components/charts/MultiLineChart'
import { MatrixHeatmap } from '@/components/charts/MatrixHeatmap'
import { ComparisonTable } from '@/components/charts/ComparisonTable'
import { WaterfallChart } from '@/components/charts/WaterfallChart'
import { D3BubbleChartIndependent } from '@/components/charts/D3BubbleChartIndependent'
import { CompetitiveIntelligence } from '@/components/charts/CompetitiveIntelligence'
import { IntelligenceDatabaseViews } from '@/components/charts/IntelligenceDatabaseViews'
import { BuyerSurveyView } from '@/components/charts/BuyerSurveyView'
import { QuadrantView } from '@/components/charts/QuadrantView'
import { TaxonomyView } from '@/components/charts/TaxonomyView'
import { PricingAnalysisView } from '@/components/charts/PricingAnalysisView'
import { InsightsPanel } from '@/components/InsightsPanel'
import { FilterPresets } from '@/components/filters/FilterPresets'
import { ChartGroupSelector } from '@/components/filters/ChartGroupSelector'
import { CustomScrollbar } from '@/components/ui/CustomScrollbar'
import { GlobalKPICards } from '@/components/GlobalKPICards'
import { getChartsForGroup } from '@/lib/chart-groups'
import { suiteSubtitle } from '@/lib/dashboard-title'
import { countriesFromData } from '@/lib/taxonomy'
import { Lightbulb, X, Layers, LayoutGrid, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Footer } from '@/components/Footer'
import { CredibilitySection } from '@/components/CredibilitySection'
import { AccoladesSection } from '@/components/AccoladesSection'
import { WhyCoherentSection } from '@/components/WhyCoherentSection'
import { CountryGate, COVERED_COUNTRY } from '@/components/CountryGate'
import { DemoDataNote } from '@/components/DemoDataNote'
import Image from 'next/image'

type ActiveTab =
  | 'taxonomy'
  | 'bar'
  | 'line'
  | 'heatmap'
  | 'table'
  | 'waterfall'
  | 'bubble'
  | 'competitive-intelligence'
  | 'customer-intelligence'
  | 'distributor-intelligence'
  | 'pricing-bar'
  | 'pricing-line'
  | 'pricing-heatmap'
  | 'pricing-table'
  | 'b2b-survey'
  | 'b2c-survey'
  | 'coherent-quadrant'

interface Props {
  /** When true the "Dashboard Builder" button in the header is hidden (read-only shared view). */
  readOnly?: boolean
}

/** Applies the country selector only where the view is country-scoped. */
function MaybeCountryGate({
  enabled,
  countries,
  children,
}: {
  enabled: boolean
  countries: string[]
  children: React.ReactNode
}) {
  return enabled ? <CountryGate countries={countries}>{children}</CountryGate> : <>{children}</>
}

/** In-chart dummy-data alert. Market-analysis charts only. */
function DemoBadge() {
  return <DemoDataNote className="mb-4" />
}

export function DashboardShell({ readOnly = false }: Props) {
  const router = useRouter()
  const {
    data,
    filters,
    selectedChartGroup,
    dashboardName,
    rawIntelligenceData,
    proposition2Data,
    proposition3Data,
    distributorRawIntelligenceData,
    distributorProposition2Data,
    distributorProposition3Data,
    intelligenceType,
    pricingAnalysisData,
    showDemoNote,
    logoChoice,
    b2bSurveyData,
    b2cSurveyData,
    quadrantData,
  } = useDashboardStore()

  const [activeTab, setActiveTab] = useState<ActiveTab>('bar')
  /** Selected panel in the no-market-data shell (intelligence / b2b / b2c). */
  const [standaloneTab, setStandaloneTab] = useState<string>('intelligence')
  const [showInsights, setShowInsights] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<'tabs' | 'vertical'>('tabs')
  const sidebarScrollRef = useRef<HTMLDivElement>(null)

  const hasMarketData = !!data
  const hasCustomerWorkbook = !!(
    rawIntelligenceData?.rows?.length ||
    proposition2Data?.rows?.length ||
    proposition3Data?.rows?.length
  )
  const hasDistributorWorkbook = !!(
    distributorRawIntelligenceData?.rows?.length ||
    distributorProposition2Data?.rows?.length ||
    distributorProposition3Data?.rows?.length
  )

  const hasB2bSurvey = !!b2bSurveyData?.segments?.length
  const hasB2cSurvey = !!b2cSurveyData?.segments?.length
  const hasQuadrant = !!(quadrantData?.charted?.length || quadrantData?.others?.length)
  /** Any JSON-sourced view; these move Chart View to the top strip. */
  const hasAnySurvey = hasB2bSurvey || hasB2cSurvey || hasQuadrant

  /**
   * Suite mode — the presentation built for the survey-backed dashboards:
   * taxonomy, per-country gating and the full-width views. A dashboard without
   * a buyer survey keeps the original layout, so the plain
   * market/customer/distributor flows are untouched.
   */
  const isSuitePreview = hasB2bSurvey

  const isMarketAnalysis = selectedChartGroup === 'market-analysis'

  /** Market Analysis owns the filter sidebar and KPI row; in suite mode it is
   *  the only view that shows them. */
  const showSidebar = !isSuitePreview || isMarketAnalysis

  /** Views reported per country — suite mode only; taxonomy and market analysis never. */
  const isCountryScoped =
    isSuitePreview && !isMarketAnalysis && selectedChartGroup !== 'taxonomy'

  /** Geographies offered in the country strip, taken from the workbook. */
  const countryOptions = countriesFromData(data, COVERED_COUNTRY)

  /** Market name on top; a loaded survey adds the module list beneath it. */
  const headingTitle = dashboardName || 'Market Analysis'
  const headingSubtitle = suiteSubtitle(hasB2bSurvey)

  const visibleCharts = getChartsForGroup(selectedChartGroup)

  /** Charts that stand alone — they render from their own dataset, not market data. */
  const STANDALONE_CHARTS = [
    'customer-intelligence',
    'distributor-intelligence',
    'b2b-survey',
    'b2c-survey',
    'coherent-quadrant',
  ]

  const isChartVisible = (chartId: string): boolean => {
    if (!hasMarketData && !STANDALONE_CHARTS.includes(chartId)) {
      return false
    }
    if (chartId === 'taxonomy' && !hasB2bSurvey) return false
    if (chartId === 'b2b-survey' && !hasB2bSurvey) return false
    if (chartId === 'b2c-survey' && !hasB2cSurvey) return false
    if (chartId === 'coherent-quadrant' && !hasQuadrant) return false
    // Mirrors the tab rule in ChartGroupSelector: a loaded survey replaces the
    // Opportunity Matrix, so the bubble chart is hidden in every layout too.
    if (chartId === 'bubble' && (hasB2bSurvey || hasB2cSurvey)) return false
    return visibleCharts.includes(chartId)
  }

  const chartIdToTab: Record<string, ActiveTab> = {
    taxonomy: 'taxonomy',
    'grouped-bar': 'bar',
    'multi-line': 'line',
    heatmap: 'heatmap',
    'comparison-table': 'table',
    waterfall: 'waterfall',
    bubble: 'bubble',
    'competitive-intelligence': 'competitive-intelligence',
    'customer-intelligence': 'customer-intelligence',
    'distributor-intelligence': 'distributor-intelligence',
    'pricing-grouped-bar': 'pricing-bar',
    'pricing-multi-line': 'pricing-line',
    'pricing-heatmap': 'pricing-heatmap',
    'pricing-comparison-table': 'pricing-table',
    'b2b-survey': 'b2b-survey',
    'b2c-survey': 'b2c-survey',
    'coherent-quadrant': 'coherent-quadrant',
  }

  useEffect(() => {
    const first = visibleCharts[0]
    // Survey groups own their tab outright — honour the selection before the
    // market-data fallbacks below, which would otherwise pull focus away.
    if (first === 'b2b-survey' || first === 'b2c-survey' || first === 'coherent-quadrant') {
      setActiveTab(first)
      return
    }
    if (!hasMarketData && hasCustomerWorkbook) {
      setActiveTab('customer-intelligence')
      return
    }
    if (first && chartIdToTab[first]) setActiveTab(chartIdToTab[first])
  }, [selectedChartGroup, hasMarketData, hasCustomerWorkbook])

  useEffect(() => {
    if (filters.viewMode === 'matrix' && isChartVisible('heatmap')) {
      setActiveTab('heatmap')
    }
  }, [filters.viewMode])

  // ── Intelligence-only mode ──────────────────────────────────────────────
  // Also covers survey-only dashboards: without market data the full dashboard
  // below has no KPIs or filters to render, so standalone datasets get their own
  // lightweight shell with a tab per available dataset.
  if (!hasMarketData && (hasCustomerWorkbook || hasDistributorWorkbook || hasAnySurvey)) {
    const typeLabel =
      intelligenceType === 'distributor'
        ? 'Distributor'
        : intelligenceType === 'both'
        ? 'Customer & Distributor'
        : 'Customer'

    const hasWorkbook = hasCustomerWorkbook || hasDistributorWorkbook
    // Panels available in this cut-down shell, in display order.
    const standalonePanels: { key: string; label: string }[] = [
      ...(hasWorkbook ? [{ key: 'intelligence', label: `${typeLabel} Intelligence` }] : []),
      ...(hasB2bSurvey ? [{ key: 'b2b-survey', label: 'Voice of Customer - B2B' }] : []),
      ...(hasB2cSurvey ? [{ key: 'b2c-survey', label: 'Voice of Customer - B2C' }] : []),
      ...(hasQuadrant ? [{ key: 'coherent-quadrant', label: 'Vendor Intelligence (Coherent Quadrant)' }] : []),
    ]
    const activePanel = standalonePanels.some((p) => p.key === standaloneTab)
      ? standaloneTab
      : standalonePanels[0]?.key
    const headingLabel = hasWorkbook
      ? `${typeLabel} Intelligence`
      : hasB2bSurvey && hasB2cSurvey
      ? 'Voice of Customer'
      : hasB2bSurvey
      ? 'Voice of Customer - B2B'
      : hasB2cSurvey
      ? 'Voice of Customer - B2C'
      : 'Coherent Quadrant'

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="container mx-auto px-6 py-6 flex-1">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex-shrink-0">
              <a href="https://www.coherentmarketinsights.com" target="_blank" rel="noopener noreferrer" title="coherentmarketinsights.com">
                <Image src={logoChoice === 'wmr' ? '/wmr-logo.png' : logoChoice === 'mi' ? '/mi-logo.png' : '/logo.png'} alt={logoChoice === 'wmr' ? 'Worldwide Market Reports Logo' : logoChoice === 'mi' ? 'Coherent MI Logo' : 'Coherent Market Insights Logo'} width={150} height={60} unoptimized className="h-auto w-auto max-w-[150px]" priority />
              </a>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="text-center">
                <h1 className="text-xl lg:text-2xl font-bold text-black leading-snug">{dashboardName || headingLabel}</h1>
                {suiteSubtitle(hasB2bSurvey) && (
                  <p className="mt-1 text-xs lg:text-sm text-gray-600">{suiteSubtitle(hasB2bSurvey)}</p>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              {!readOnly && (
                <button
                  onClick={() => router.push('/dashboard-builder')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-sm font-medium">Dashboard Builder</span>
                </button>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm">
            {standalonePanels.length > 1 && (
              <div className="flex flex-wrap border-b border-gray-200 px-2">
                {standalonePanels.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setStandaloneTab(p.key)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activePanel === p.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-black hover:border-gray-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <div className="p-6">
              <CountryGate>
              {activePanel === 'intelligence' && <IntelligenceDatabaseViews />}
              {activePanel === 'b2b-survey' && <BuyerSurveyView kind="b2b" />}
              {activePanel === 'b2c-survey' && <BuyerSurveyView kind="b2c" />}
              {activePanel === 'coherent-quadrant' && <QuadrantView />}
              </CountryGate>
            </div>
          </div>
        </div>
        <WhyCoherentSection />
        <CredibilitySection />
        <AccoladesSection />
        <Footer />
      </div>
    )
  }

  // ── Full dashboard ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="container mx-auto px-6 py-6 flex-1">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex-shrink-0">
            <a href="https://www.coherentmarketinsights.com" target="_blank" rel="noopener noreferrer" title="coherentmarketinsights.com">
              <Image src={logoChoice === 'wmr' ? '/wmr-logo.png' : logoChoice === 'mi' ? '/mi-logo.png' : '/logo.png'} alt={logoChoice === 'wmr' ? 'Worldwide Market Reports Logo' : logoChoice === 'mi' ? 'Coherent MI Logo' : 'Coherent Market Insights Logo'} width={150} height={60} unoptimized className="h-auto w-auto max-w-[150px]" priority />
            </a>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="text-center">
              <h1 className="text-xl lg:text-2xl font-bold text-black leading-snug">{headingTitle}</h1>
              {headingSubtitle && (
                <p className="mt-1 text-xs lg:text-sm text-gray-600">{headingSubtitle}</p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 flex items-center">
            {!readOnly && (
              <button
                onClick={() => router.push('/dashboard-builder')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                title="Open Dashboard Builder to upload Excel/CSV files"
              >
                <Settings className="h-4 w-4" />
                <span className="text-sm font-medium">Dashboard Builder</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards — market analysis only; the other views are not filtered
            by geography/segment so the KPI row would not match what they show. */}
        {showSidebar && (
          <div className="mb-6">
            {showDemoNote && <DemoDataNote className="mb-3 mx-1" />}
            <GlobalKPICards />
          </div>
        )}

        {/* Chart View moves onto a full-width strip once a survey is loaded, so
            the views that hide the sidebar can still be switched from the top. */}
        {hasAnySurvey && (
          <div className="mb-6">
            <ChartGroupSelector orientation="horizontal" />
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          {showSidebar && (
          <aside className={`transition-all duration-300 ${sidebarCollapsed ? 'col-span-12 lg:col-span-1' : 'col-span-12 lg:col-span-3'}`}>
            {sidebarCollapsed ? (
              <div className="sticky top-6">
                <div className="bg-white rounded-lg shadow-sm p-2 space-y-4">
                  <button
                    onClick={() => { setShowInsights(false); setSidebarCollapsed(false) }}
                    className="w-full flex flex-col items-center gap-1 py-2 hover:bg-gray-50 rounded"
                    title="Expand Filters"
                  >
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                    <span className="text-xs text-black">Filters</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="sticky top-6 self-start">
                <div className="max-h-[calc(100vh-6rem)] relative">
                  <CustomScrollbar containerRef={sidebarScrollRef}>
                    <div ref={sidebarScrollRef} className="overflow-y-auto pr-6 space-y-3 sidebar-scroll max-h-[calc(100vh-6rem)]">
                      {!hasAnySurvey && <ChartGroupSelector />}
                      <FilterPresets />
                      <EnhancedFilterPanel />
                    </div>
                  </CustomScrollbar>
                </div>
              </div>
            )}
          </aside>
          )}

          {/* Main content */}
          <main className={`transition-all duration-300 ${
            !showSidebar
              ? showInsights ? 'col-span-12 lg:col-span-9' : 'col-span-12'
              : sidebarCollapsed
              ? showInsights ? 'col-span-12 lg:col-span-8' : 'col-span-12 lg:col-span-11'
              : showInsights ? 'col-span-12 lg:col-span-6' : 'col-span-12 lg:col-span-9'
          } space-y-6`}>

            {/* Every view except Market Analysis is country-scoped. */}
            <MaybeCountryGate key={selectedChartGroup} enabled={isCountryScoped} countries={countryOptions}>

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <nav className="flex items-center -mb-px">
                    <div className="flex gap-1 mr-4 ml-4 py-2">
                      <button onClick={() => setViewMode('tabs')} className={`p-1.5 rounded ${viewMode === 'tabs' ? 'bg-blue-100 text-blue-600' : 'text-black hover:text-black'}`} title="Tab View">
                        <Layers className="h-4 w-4" />
                      </button>
                      <button onClick={() => setViewMode('vertical')} className={`p-1.5 rounded ${viewMode === 'vertical' ? 'bg-blue-100 text-blue-600' : 'text-black hover:text-black'}`} title="Vertical View (All Charts)">
                        <LayoutGrid className="h-4 w-4" />
                      </button>
                    </div>

                    {viewMode === 'tabs' && (
                      <>
                        {isChartVisible('taxonomy') && <button onClick={() => setActiveTab('taxonomy')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'taxonomy' ? 'border-blue-500 text-blue-600' : 'border-transparent text-black hover:text-black hover:border-gray-300'}`}>Taxonomy</button>}
                        {isChartVisible('grouped-bar') && <button onClick={() => setActiveTab('bar')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'bar' ? 'border-blue-500 text-blue-600' : 'border-transparent text-black hover:text-black hover:border-gray-300'}`}>Grouped Bar Chart</button>}
                        {isChartVisible('multi-line') && <button onClick={() => setActiveTab('line')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'line' ? 'border-blue-500 text-blue-600' : 'border-transparent text-black hover:text-black hover:border-gray-300'}`}>Line Chart</button>}
                        {isChartVisible('heatmap') && <button onClick={() => setActiveTab('heatmap')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'heatmap' ? 'border-blue-500 text-blue-600' : 'border-transparent text-black hover:text-black hover:border-gray-300'}`}>Heatmap</button>}
                        {isChartVisible('comparison-table') && <button onClick={() => setActiveTab('table')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'table' ? 'border-blue-500 text-blue-600' : 'border-transparent text-black hover:text-black hover:border-gray-300'}`}>Table</button>}
                        {isChartVisible('waterfall') && <button onClick={() => setActiveTab('waterfall')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'waterfall' ? 'border-blue-500 text-blue-600' : 'border-transparent text-black hover:text-black hover:border-gray-300'}`}>Waterfall</button>}
                        {isChartVisible('bubble') && <button onClick={() => setActiveTab('bubble')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'bubble' ? 'border-blue-500 text-blue-600' : 'border-transparent text-black hover:text-black hover:border-gray-300'}`}>Bubble Chart</button>}
                        {isChartVisible('customer-intelligence') && <button onClick={() => setActiveTab('customer-intelligence')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'customer-intelligence' ? 'border-blue-500 text-blue-600' : 'border-transparent text-black hover:text-black hover:border-gray-300'}`}>Customer Intelligence</button>}
                        {isChartVisible('distributor-intelligence') && <button onClick={() => setActiveTab('distributor-intelligence')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'distributor-intelligence' ? 'border-blue-500 text-blue-600' : 'border-transparent text-black hover:text-black hover:border-gray-300'}`}>Distributor Intelligence</button>}
                        {isChartVisible('pricing-grouped-bar') && <button onClick={() => setActiveTab('pricing-bar')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pricing-bar' ? 'border-blue-500 text-blue-600' : 'border-transparent text-black hover:text-black hover:border-gray-300'}`}>Pricing Bar</button>}
                        {isChartVisible('pricing-multi-line') && <button onClick={() => setActiveTab('pricing-line')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pricing-line' ? 'border-blue-500 text-blue-600' : 'border-transparent text-black hover:text-black hover:border-gray-300'}`}>Pricing Line</button>}
                        {isChartVisible('pricing-heatmap') && <button onClick={() => setActiveTab('pricing-heatmap')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pricing-heatmap' ? 'border-blue-500 text-blue-600' : 'border-transparent text-black hover:text-black hover:border-gray-300'}`}>Pricing Heatmap</button>}
                        {isChartVisible('pricing-comparison-table') && <button onClick={() => setActiveTab('pricing-table')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pricing-table' ? 'border-blue-500 text-blue-600' : 'border-transparent text-black hover:text-black hover:border-gray-300'}`}>Pricing Table</button>}
                        {isChartVisible('b2b-survey') && <button onClick={() => setActiveTab('b2b-survey')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'b2b-survey' ? 'border-blue-500 text-blue-600' : 'border-transparent text-black hover:text-black hover:border-gray-300'}`}>Voice of Customer - B2B</button>}
                        {isChartVisible('b2c-survey') && <button onClick={() => setActiveTab('b2c-survey')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'b2c-survey' ? 'border-blue-500 text-blue-600' : 'border-transparent text-black hover:text-black hover:border-gray-300'}`}>Voice of Customer - B2C</button>}
                        {isChartVisible('coherent-quadrant') && <button onClick={() => setActiveTab('coherent-quadrant')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'coherent-quadrant' ? 'border-blue-500 text-blue-600' : 'border-transparent text-black hover:text-black hover:border-gray-300'}`}>Vendor Intelligence (Coherent Quadrant)</button>}
                      </>
                    )}
                  </nav>

                  <div className="flex gap-2 px-4">
                    <button
                      onClick={() => { setShowInsights(!showInsights); setSidebarCollapsed(!showInsights) }}
                      className={`flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors ${showInsights ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'text-black hover:text-black hover:bg-gray-100'}`}
                    >
                      <Lightbulb className="h-4 w-4" />
                      Insights
                    </button>
                  </div>
                </div>
              </div>

              {/* Chart Content */}
              <div className="p-6">
                {viewMode === 'tabs' ? (
                  <>
                    {activeTab === 'taxonomy' && <div id="taxonomy-view"><TaxonomyView /></div>}
                    {activeTab === 'bar' && <div id="grouped-bar-chart" className="relative">{showDemoNote && <DemoBadge />}<GroupedBarChart title="Comparative Analysis - Grouped Bars" height={450} /></div>}
                    {activeTab === 'line' && <div id="line-chart" className="relative">{showDemoNote && <DemoBadge />}<MultiLineChart title="Trend Analysis - Multiple Series" height={450} /></div>}
                    {activeTab === 'heatmap' && <div id="heatmap-chart" className="relative">{showDemoNote && <DemoBadge />}<MatrixHeatmap title="Matrix View - Geography x Segment" height={450} /></div>}
                    {activeTab === 'table' && <div id="comparison-table">{showDemoNote && <DemoBadge />}<ComparisonTable title="Data Comparison Table" height={500} /></div>}
                    {activeTab === 'waterfall' && <div id="waterfall-chart" className="relative">{showDemoNote && <DemoBadge />}<WaterfallChart title="Contribution Analysis - Waterfall Chart" height={450} /></div>}
                    {activeTab === 'bubble' && isChartVisible('bubble') && <div id="bubble-chart" className="relative"><D3BubbleChartIndependent title="Coherent Opportunity Matrix" height={500} /></div>}
                    {activeTab === 'competitive-intelligence' && <div id="competitive-intelligence-chart" className="relative"><CompetitiveIntelligence height={600} /></div>}
                    {activeTab === 'customer-intelligence' && (
                      <div id="customer-intelligence-chart" className="relative">
                        
                        <IntelligenceDatabaseViews preferredSource="customer" />
                      </div>
                    )}
                    {activeTab === 'distributor-intelligence' && (
                      <div id="distributor-intelligence-chart" className="relative">
                        
                        <IntelligenceDatabaseViews preferredSource="distributor" />
                      </div>
                    )}
                    {activeTab === 'pricing-bar' && <div id="pricing-bar-chart" className="relative"><PricingAnalysisView activeTab="bar" /></div>}
                    {activeTab === 'pricing-line' && <div id="pricing-line-chart" className="relative"><PricingAnalysisView activeTab="line" /></div>}
                    {activeTab === 'pricing-heatmap' && <div id="pricing-heatmap-chart" className="relative"><PricingAnalysisView activeTab="heatmap" /></div>}
                    {activeTab === 'pricing-table' && <div id="pricing-table-chart" className="relative"><PricingAnalysisView activeTab="table" /></div>}
                    {activeTab === 'b2b-survey' && <div id="b2b-survey-view" className="relative"><BuyerSurveyView kind="b2b" /></div>}
                    {activeTab === 'b2c-survey' && <div id="b2c-survey-view" className="relative"><BuyerSurveyView kind="b2c" /></div>}
                    {activeTab === 'coherent-quadrant' && <div id="coherent-quadrant-view" className="relative"><QuadrantView /></div>}
                  </>
                ) : (
                  <div className="space-y-8">
                    {isChartVisible('taxonomy') && <div className="border-b pb-8"><TaxonomyView /></div>}
                    {isChartVisible('grouped-bar') && <div className="border-b pb-8 relative">{showDemoNote && <DemoBadge />}<h3 className="text-lg font-semibold text-black mb-4">Grouped Bar Chart</h3><GroupedBarChart title="Comparative Analysis - Grouped Bars" height={400} /></div>}
                    {isChartVisible('multi-line') && <div className="border-b pb-8 relative">{showDemoNote && <DemoBadge />}<h3 className="text-lg font-semibold text-black mb-4">Line Chart</h3><MultiLineChart title="Trend Analysis - Multiple Series" height={400} /></div>}
                    {isChartVisible('heatmap') && <div className="border-b pb-8 relative">{showDemoNote && <DemoBadge />}<h3 className="text-lg font-semibold text-black mb-4">Heatmap</h3><MatrixHeatmap title="Matrix View - Geography x Segment" height={400} /></div>}
                    {isChartVisible('comparison-table') && <div className="border-b pb-8">{showDemoNote && <DemoBadge />}<h3 className="text-lg font-semibold text-black mb-4">Data Table</h3><ComparisonTable title="Data Comparison Table" height={400} /></div>}
                    {isChartVisible('waterfall') && <div className="border-b pb-8 relative">{showDemoNote && <DemoBadge />}<h3 className="text-lg font-semibold text-black mb-4">Waterfall Chart</h3><WaterfallChart title="Contribution Analysis - Waterfall Chart" height={400} /></div>}
                    {isChartVisible('bubble') && <div className="border-b pb-8 relative"><h3 className="text-lg font-semibold text-black mb-4">Bubble Chart</h3><D3BubbleChartIndependent title="Coherent Opportunity Matrix" height={450} /></div>}
                    {isChartVisible('competitive-intelligence') && <div className="border-b pb-8 relative"><CompetitiveIntelligence height={600} /></div>}
                    {(isChartVisible('customer-intelligence') ||
                      isChartVisible('distributor-intelligence')) && (
                      <div className="border-b pb-8 relative">
                        
                        <IntelligenceDatabaseViews />
                      </div>
                    )}
                    {isChartVisible('pricing-grouped-bar') && <div className="border-b pb-8 relative"><PricingAnalysisView activeTab="bar" /></div>}
                    {isChartVisible('b2b-survey') && <div className="border-b pb-8 relative"><BuyerSurveyView kind="b2b" /></div>}
                    {isChartVisible('b2c-survey') && <div className="border-b pb-8 relative"><BuyerSurveyView kind="b2c" /></div>}
                    {isChartVisible('coherent-quadrant') && <div className="border-b pb-8 relative"><QuadrantView /></div>}
                  </div>
                )}
              </div>
            </div>

            </MaybeCountryGate>
          </main>

          {/* Insights Panel */}
          {showInsights && (
            <aside className="col-span-12 lg:col-span-3 transition-all duration-300">
              <div className="sticky top-6">
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="bg-yellow-50 px-4 py-3 border-b border-yellow-200 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-black flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        Key Insights
                      </h2>
                      <button onClick={() => { setShowInsights(false); setSidebarCollapsed(false) }} className="rounded-md text-black hover:text-black focus:outline-none">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="text-xs text-black mt-1">Auto-generated analysis</p>
                  </div>
                  <div className="px-4 py-3 overflow-y-auto sidebar-scroll" style={{ maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto', minHeight: 'auto' }} id="insights-panel">
                    <InsightsPanel />
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      <WhyCoherentSection />
      <CredibilitySection />
      <AccoladesSection />
      <Footer />
    </div>
  )
}
