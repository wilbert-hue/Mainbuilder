'use client'

import { useEffect, useState } from 'react'
import { CompetitiveDashboard } from './CompetitiveDashboard'
import { MarketShareAnalysis } from './MarketShareAnalysis'
import { loadCompetitiveIntelligenceData, calculateMarketConcentration } from '@/lib/competitive-intelligence-data'

interface CompetitiveIntelligenceProps {
  height?: number
}

export function CompetitiveIntelligence({ height = 600 }: CompetitiveIntelligenceProps) {
  const [insights, setInsights] = useState<{
    marketLeader: string
    marketLeaderShare: number
    concentration: string
    totalCompanies: number
  } | null>(null)

  useEffect(() => {
    const abortController = new AbortController()
    let isMounted = true
    
    async function loadInsights() {
      if (!isMounted || abortController.signal.aborted) return
      
      const data = await loadCompetitiveIntelligenceData()
      
      // Only update state if component is still mounted and not aborted
      if (isMounted && !abortController.signal.aborted && data && data.companies.length > 0) {
        // Find market leader
        const sorted = [...data.companies].sort((a, b) => b.marketShare - a.marketShare)
        const leader = sorted[0]
        
        // Calculate concentration
        const top3Share = sorted.slice(0, 3).reduce((sum, c) => sum + c.marketShare, 0)
        const concentration = top3Share >= 75 ? 'Highly Concentrated' : 
                             top3Share >= 50 ? 'Moderately Concentrated' : 'Competitive'
        
        setInsights({
          marketLeader: leader.name,
          marketLeaderShare: leader.marketShare,
          concentration,
          totalCompanies: data.companies.length
        })
      }
    }
    
    loadInsights()
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [])

  return (
    <div className="w-full space-y-6">
      {/* Main Header - Subtle enterprise style */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-[#52B69A] to-[#168AAD] rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-black">Competitive Intelligence 2024</h2>
            <p className="text-sm text-black mt-0.5">
              Market landscape analysis and competitive positioning
            </p>
          </div>
        </div>
      </div>

      {/* Market Share Analysis Section */}
      <div>
        <h3 className="text-lg font-semibold text-black mb-4">
          Company Market Share Analysis 2024
        </h3>
        <MarketShareAnalysis year={2024} />
      </div>

      {/* Competitive Dashboard Section */}
      <div>
        <CompetitiveDashboard />
      </div>

      {/* Key Insights */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-black mb-1">Market Concentration</div>
            <div className="text-lg font-bold text-black">
              {insights?.concentration || 'Loading...'}
            </div>
            <div className="text-xs text-black mt-1">
              {insights ? `${insights.totalCompanies} companies analyzed` : 'Calculating...'}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-black mb-1">Market Leader</div>
            <div className="text-lg font-bold text-black">
              {insights?.marketLeader || 'Loading...'}
            </div>
            <div className="text-xs text-black mt-1">
              {insights ? `${insights.marketLeaderShare.toFixed(1)}% market share` : 'Calculating...'}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-black mb-1">Total Companies</div>
            <div className="text-lg font-bold text-black">
              {insights?.totalCompanies || 'Loading...'}
            </div>
            <div className="text-xs text-black mt-1">
              Key players in India Spices Market
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
