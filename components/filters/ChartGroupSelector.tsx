'use client'

import { useEffect } from 'react'
import { useDashboardStore } from '@/lib/store'
import { CHART_GROUPS, type ChartGroupId } from '@/lib/chart-groups'
import { BarChart3, Target, Trophy, Users, Building2, DollarSign } from 'lucide-react'

// Icon mapping for each chart group
const iconMap: Record<string, any> = {
  'market-analysis': BarChart3,
  'coherent-opportunity': Target,
  'competitive-intelligence': Trophy,
  'customer-intelligence': Users,
  'distributor-intelligence': Building2,
  'pricing-analysis': DollarSign,
}

export function ChartGroupSelector() {
  const {
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
  } = useDashboardStore()

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

  // Auto-switch to a valid chart group if the currently selected one has no data
  useEffect(() => {
    const isCurrentGroupInvalid =
      (selectedChartGroup === 'customer-intelligence' && !hasCustomerIntelligenceData) ||
      (selectedChartGroup === 'distributor-intelligence' && !hasDistributorIntelligenceData) ||
      (selectedChartGroup === 'competitive-intelligence' && !hasCompetitiveIntelligenceData) ||
      (selectedChartGroup === 'pricing-analysis' && !hasPricingAnalysisData)

    if (isCurrentGroupInvalid) {
      // Switch to market-analysis as the default fallback
      setSelectedChartGroup('market-analysis')
    }
  }, [
    selectedChartGroup,
    hasCustomerIntelligenceData,
    hasDistributorIntelligenceData,
    hasCompetitiveIntelligenceData,
    hasPricingAnalysisData,
    setSelectedChartGroup
  ])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <h3 className="text-xs font-semibold text-black mb-2">Chart View</h3>

      <div className="space-y-1">
        {CHART_GROUPS.map((group) => {
          // Hide customer-intelligence group if no data exists
          if (group.id === 'customer-intelligence' && !hasCustomerIntelligenceData) {
            return null
          }

          if (group.id === 'distributor-intelligence' && !hasDistributorIntelligenceData) {
            return null
          }

          // Hide competitive-intelligence group if no data exists
          if (group.id === 'competitive-intelligence' && !hasCompetitiveIntelligenceData) {
            return null
          }

          // Hide pricing-analysis group if no data exists
          if (group.id === 'pricing-analysis' && !hasPricingAnalysisData) {
            return null
          }

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
