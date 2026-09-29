'use client'

import { useEffect } from 'react'
import { useDashboardStore } from '@/lib/store'
import { CHART_GROUPS, type ChartGroupId } from '@/lib/chart-groups'
import { BarChart3, Target, Trophy, Users, Building2, DollarSign, Factory, ShoppingCart, Grid2x2, ListTree } from 'lucide-react'

// Icon mapping for each chart group
const iconMap: Record<string, any> = {
  taxonomy: ListTree,
  'market-analysis': BarChart3,
  'coherent-opportunity': Target,
  'competitive-intelligence': Trophy,
  'customer-intelligence': Users,
  'distributor-intelligence': Building2,
  'pricing-analysis': DollarSign,
  'b2b-survey': Factory,
  'b2c-survey': ShoppingCart,
  'coherent-quadrant': Grid2x2,
}

interface ChartGroupSelectorProps {
  /**
   * "vertical"   — the sidebar list (default).
   * "horizontal" — a full-width strip above the dashboard, used when a buyer
   *                survey is loaded so views are switched from the top.
   */
  orientation?: 'vertical' | 'horizontal'
}

export function ChartGroupSelector({ orientation = 'vertical' }: ChartGroupSelectorProps = {}) {
  const {
    data,
    selectedChartGroup,
    setSelectedChartGroup,
    rawIntelligenceData,
    proposition2Data,
    proposition3Data,
    distributorRawIntelligenceData,
    distributorProposition2Data,
    distributorProposition3Data,
    customerIntelligenceData,
    distributorIntelligenceData,
    competitiveIntelligenceData,
    pricingAnalysisData,
    b2bSurveyData,
    b2cSurveyData,
    quadrantData,
  } = useDashboardStore()

  const hasMarketData = !!data

  const hasCustomerWorkbookRows = !!(
    rawIntelligenceData?.rows?.length ||
    proposition2Data?.rows?.length ||
    proposition3Data?.rows?.length
  )
  const hasDistributorWorkbookRows = !!(
    distributorRawIntelligenceData?.rows?.length ||
    distributorProposition2Data?.rows?.length ||
    distributorProposition3Data?.rows?.length
  )

  const hasCustomerIntelligenceData = !!(
    hasCustomerWorkbookRows ||
    customerIntelligenceData?.length
  )

  const hasDistributorIntelligenceData = !!(
    hasDistributorWorkbookRows ||
    distributorIntelligenceData?.length
  )

  // Check if competitive intelligence data exists
  const hasCompetitiveIntelligenceData = !!(
    competitiveIntelligenceData?.rows?.length
  )

  // Check if pricing analysis data exists
  const hasPricingAnalysisData = !!(
    pricingAnalysisData?.data?.value?.geography_segment_matrix?.length
  )

  // Buyer survey reports (uploaded as JSON in the builder)
  const hasB2bSurveyData = !!b2bSurveyData?.segments?.length
  const hasB2cSurveyData = !!b2cSurveyData?.segments?.length
  const hasQuadrantData = !!(quadrantData?.charted?.length || quadrantData?.others?.length)

  // Auto-switch to a valid chart group if the currently selected one has no data
  useEffect(() => {
    const isCurrentGroupInvalid =
      (selectedChartGroup === 'taxonomy' && !(hasMarketData && hasB2bSurveyData)) ||
      (selectedChartGroup === 'coherent-opportunity' && (hasB2bSurveyData || hasB2cSurveyData)) ||
      (selectedChartGroup === 'customer-intelligence' && !hasCustomerIntelligenceData) ||
      (selectedChartGroup === 'distributor-intelligence' && !hasDistributorIntelligenceData) ||
      (selectedChartGroup === 'competitive-intelligence' && !hasCompetitiveIntelligenceData) ||
      (selectedChartGroup === 'pricing-analysis' && !hasPricingAnalysisData) ||
      (selectedChartGroup === 'b2b-survey' && !hasB2bSurveyData) ||
      (selectedChartGroup === 'b2c-survey' && !hasB2cSurveyData) ||
      (selectedChartGroup === 'coherent-quadrant' && !hasQuadrantData)

    if (isCurrentGroupInvalid) {
      // Switch to market-analysis as the default fallback
      setSelectedChartGroup('market-analysis')
    }
  }, [
    selectedChartGroup,
    hasMarketData,
    hasCustomerIntelligenceData,
    hasDistributorIntelligenceData,
    hasCompetitiveIntelligenceData,
    hasPricingAnalysisData,
    hasB2bSurveyData,
    hasB2cSurveyData,
    hasQuadrantData,
    setSelectedChartGroup
  ])

  // Groups whose backing dataset is actually present. Shared by both layouts so
  // visibility rules live in exactly one place.
  const availableGroups = CHART_GROUPS.filter((group) => {
    if (group.id === 'taxonomy') return hasMarketData && hasB2bSurveyData
    // Market views need the value/volume workbook behind them.
    if (group.id === 'market-analysis') return hasMarketData
    // B2B findings supersede the Opportunity Matrix: when that survey is
    // loaded, hide the matrix rather than presenting two competing reads of
    // the same opportunity question.
    if (group.id === 'coherent-opportunity') return hasMarketData && !hasB2bSurveyData
    if (group.id === 'customer-intelligence') return hasCustomerIntelligenceData
    if (group.id === 'distributor-intelligence') return hasDistributorIntelligenceData
    if (group.id === 'competitive-intelligence') return hasCompetitiveIntelligenceData
    if (group.id === 'pricing-analysis') return hasPricingAnalysisData
    if (group.id === 'b2b-survey') return hasB2bSurveyData
    if (group.id === 'b2c-survey') return hasB2cSurveyData
    if (group.id === 'coherent-quadrant') return hasQuadrantData
    return true
  })

  if (orientation === 'horizontal') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-1 text-xs font-semibold text-black">Chart View</h3>
          {availableGroups.map((group) => {
            const Icon = iconMap[group.id] || BarChart3
            const isSelected = selectedChartGroup === group.id
            return (
              <button
                key={group.id}
                onClick={() => setSelectedChartGroup(group.id)}
                className={`
                  flex items-center gap-2 rounded-md px-3 py-2 transition-all duration-200
                  ${isSelected
                    ? 'bg-gradient-to-r from-[#52B69A] to-[#34A0A4] text-white shadow-sm'
                    : 'text-black hover:bg-gray-50'
                  }
                `}
                title={group.description}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-black'}`} />
                <span className="whitespace-nowrap text-xs font-medium">{group.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <h3 className="text-xs font-semibold text-black mb-2">Chart View</h3>

      <div className="space-y-1">
        {availableGroups.map((group) => {
          const Icon = iconMap[group.id] || BarChart3
          const isSelected = selectedChartGroup === group.id

          return (
            <button
              key={group.id}
              onClick={() => setSelectedChartGroup(group.id)}
              className={`
                w-full text-left px-2 py-1.5 rounded transition-all duration-200
                flex items-center space-x-2
                ${isSelected 
                  ? 'bg-gradient-to-r from-[#52B69A] to-[#34A0A4] text-white shadow-sm' 
                  : 'hover:bg-gray-50 text-black hover:text-black'
                }
              `}
              title={group.description}
            >
              <Icon 
                className={`w-3 h-3 flex-shrink-0 ${isSelected ? 'text-white' : 'text-black'}`} 
              />
              <span className="text-xs font-medium leading-tight">
                {group.label === 'Coherent Opportunity Matrix' 
                  ? <span>Coherent Opportunity<br/>Matrix</span>
                  : group.label === 'Distributor Intelligence'
                    ? <span>Distributor<br/>Intelligence</span>
                    : group.label}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100">
        <p className="text-[10px] text-black leading-tight">
          {CHART_GROUPS.find(g => g.id === selectedChartGroup)?.description || 'Select a view to see related charts'}
        </p>
      </div>
    </div>
  )
}
