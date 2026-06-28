'use client'

import { useMemo, useState } from 'react'
import { useDashboardStore } from '@/lib/store'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Filter } from 'lucide-react'

// Color palette for charts
const COLORS = [
  '#52B69A', '#34A0A4', '#168AAD', '#1A759F', '#1E6091',
  '#184E77', '#2D6A4F', '#40916C', '#74C69D', '#95D5B2'
]

interface PricingAnalysisViewProps {
  activeTab: 'bar' | 'line' | 'heatmap' | 'table'
}

export function PricingAnalysisView({ activeTab }: PricingAnalysisViewProps) {
  const {
    pricingAnalysisData,
    pricingFilters,
    updatePricingFilters
  } = useDashboardStore()

  const [showFilters, setShowFilters] = useState(true)

  // Get available options from data
  const geographies = useMemo(() => {
    return pricingAnalysisData?.dimensions?.geographies?.all_geographies || []
  }, [pricingAnalysisData])

  const segmentTypes = useMemo(() => {
    return Object.keys(pricingAnalysisData?.dimensions?.segments || {})
  }, [pricingAnalysisData])

  const segments = useMemo(() => {
    const currentSegmentType = pricingFilters.segmentType
    if (!currentSegmentType || !pricingAnalysisData?.dimensions?.segments[currentSegmentType]) {
      return []
    }
    return pricingAnalysisData.dimensions.segments[currentSegmentType].items || []
  }, [pricingAnalysisData, pricingFilters.segmentType])

  const years = useMemo((): number[] => {
    return pricingAnalysisData?.dimensions?.time?.years || []
  }, [pricingAnalysisData])

  // Define chart data type
  type ChartDataPoint = { year: string; [key: string]: string | number }

  // Filter and prepare chart data
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!pricingAnalysisData?.data?.value?.geography_segment_matrix) {
      return []
    }

    const matrix = pricingAnalysisData.data.value.geography_segment_matrix as any[]
    const selectedGeographies = pricingFilters.geographies.length > 0
      ? pricingFilters.geographies
      : geographies.slice(0, 1)
    const selectedSegments = pricingFilters.segments.length > 0
      ? pricingFilters.segments
      : segments.slice(0, 5)
    const [startYear, endYear] = pricingFilters.yearRange

    // Filter records
    const filteredRecords = matrix.filter((record: any) => {
      const geoMatch = selectedGeographies.includes(record.geography)
      const segmentMatch = selectedSegments.length === 0 || selectedSegments.includes(record.segment)
      const segmentTypeMatch = !pricingFilters.segmentType || record.segment_type === pricingFilters.segmentType
      return geoMatch && segmentMatch && segmentTypeMatch
    })

    // Group by year for bar/line charts
    const yearData: Record<string, Record<string, number>> = {}
    for (let year = startYear; year <= endYear; year++) {
      yearData[year.toString()] = {}
    }

    for (const record of filteredRecords) {
      for (let year = startYear; year <= endYear; year++) {
        const yearStr = year.toString()
        if (record.time_series && record.time_series[yearStr] !== undefined) {
          const key = `${record.geography} - ${record.segment}`
          yearData[yearStr][key] = record.time_series[yearStr]
        }
      }
    }

    // Convert to array format for charts
    const result: ChartDataPoint[] = Object.entries(yearData).map(([year, data]) => ({
      year,
      ...data
    }))

    return result
  }, [pricingAnalysisData, pricingFilters, geographies, segments])

  // Get unique series keys for the chart
  const seriesKeys = useMemo(() => {
    if (chartData.length === 0) return []
    const keys = new Set<string>()
    for (const dataPoint of chartData) {
      Object.keys(dataPoint).forEach(key => {
        if (key !== 'year') keys.add(key)
      })
    }
    return Array.from(keys)
  }, [chartData])

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!pricingAnalysisData?.data?.value?.geography_segment_matrix) {
      return { avgPrice: 0, minPrice: 0, maxPrice: 0, avgGrowth: 0 }
    }

    const matrix = pricingAnalysisData.data.value.geography_segment_matrix as any[]
    const selectedGeographies = pricingFilters.geographies.length > 0
      ? pricingFilters.geographies
      : geographies.slice(0, 1)

    const filteredRecords = matrix.filter((record: any) =>
      selectedGeographies.includes(record.geography) &&
      (!pricingFilters.segmentType || record.segment_type === pricingFilters.segmentType)
    )

    const [, endYear] = pricingFilters.yearRange
    const endYearStr = endYear.toString()

    const prices: number[] = filteredRecords
      .map((r: any) => r.time_series?.[endYearStr])
      .filter((p: any): p is number => p !== undefined && p !== null && typeof p === 'number')

    const cagrs: number[] = filteredRecords
      .map((r: any) => r.cagr)
      .filter((c: any): c is number => c !== null && c !== undefined && typeof c === 'number')

    return {
      avgPrice: prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      avgGrowth: cagrs.length > 0 ? cagrs.reduce((a: number, b: number) => a + b, 0) / cagrs.length : 0
    }
  }, [pricingAnalysisData, pricingFilters, geographies])

  if (!pricingAnalysisData) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-black font-medium mb-2">No Pricing Analysis Data Available</p>
        <p className="text-sm text-gray-600">
          Upload pricing analysis data in the Dashboard Builder to view pricing trends.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-black">Pricing Analysis</h2>
          <p className="text-sm text-gray-600">Average selling price trends and analysis</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Geography Select */}
            <div>
              <label className="block text-xs font-medium text-black mb-1">Geography</label>
              <select
                value={pricingFilters.geographies[0] || ''}
                onChange={(e) => updatePricingFilters({ geographies: e.target.value ? [e.target.value] : [] })}
                className="w-full px-3 py-2 text-sm text-black border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="" className="text-black">Select Geography</option>
                {geographies.map((geo: string) => (
                  <option key={geo} value={geo} className="text-black">{geo}</option>
                ))}
              </select>
            </div>

            {/* Segment Type Select */}
            <div>
              <label className="block text-xs font-medium text-black mb-1">Segment Type</label>
              <select
                value={pricingFilters.segmentType}
                onChange={(e) => updatePricingFilters({ segmentType: e.target.value, segments: [] })}
                className="w-full px-3 py-2 text-sm text-black border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="" className="text-black">All Segment Types</option>
                {segmentTypes.map(type => (
                  <option key={type} value={type} className="text-black">{type}</option>
                ))}
              </select>
            </div>

            {/* Segments Dropdown */}
            <div>
              <label className="block text-xs font-medium text-black mb-1">Segments</label>
              <select
                value={pricingFilters.segments[0] || ''}
                onChange={(e) => updatePricingFilters({ segments: e.target.value ? [e.target.value] : [] })}
                className="w-full px-3 py-2 text-sm text-black border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="" className="text-black">All Segments</option>
                {segments.map((segment: string) => (
                  <option key={segment} value={segment} className="text-black">{segment}</option>
                ))}
              </select>
            </div>

            {/* Year Range */}
            <div>
              <label className="block text-xs font-medium text-black mb-1">Year Range</label>
              <div className="flex items-center gap-2">
                <select
                  value={pricingFilters.yearRange[0]}
                  onChange={(e) => updatePricingFilters({ yearRange: [parseInt(e.target.value), pricingFilters.yearRange[1]] })}
                  className="flex-1 px-2 py-2 text-sm text-black border border-gray-300 rounded-md"
                >
                  {years.map(year => (
                    <option key={year} value={year} className="text-black">{year}</option>
                  ))}
                </select>
                <span className="text-black">-</span>
                <select
                  value={pricingFilters.yearRange[1]}
                  onChange={(e) => updatePricingFilters({ yearRange: [pricingFilters.yearRange[0], parseInt(e.target.value)] })}
                  className="flex-1 px-2 py-2 text-sm text-black border border-gray-300 rounded-md"
                >
                  {years.map(year => (
                    <option key={year} value={year} className="text-black">{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-500">Average Price</span>
          </div>
          <p className="text-xl font-bold text-black">${kpis.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-500">Min Price</span>
          </div>
          <p className="text-xl font-bold text-black">${kpis.minPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-500">Max Price</span>
          </div>
          <p className="text-xl font-bold text-black">${kpis.maxPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            {kpis.avgGrowth >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className="text-xs text-gray-500">Avg CAGR</span>
          </div>
          <p className={`text-xl font-bold ${kpis.avgGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {kpis.avgGrowth.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {activeTab === 'bar' && (
          <div>
            <h3 className="text-lg font-semibold text-black mb-4">Price Comparison by Year</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: '#374151', fontSize: 12 }}
                    tickLine={{ stroke: '#9CA3AF' }}
                  />
                  <YAxis
                    tick={{ fill: '#374151', fontSize: 12 }}
                    tickLine={{ stroke: '#9CA3AF' }}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {seriesKeys.slice(0, 5).map((key, index) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      fill={COLORS[index % COLORS.length]}
                      name={key}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'line' && (
          <div>
            <h3 className="text-lg font-semibold text-black mb-4">Price Trends Over Time</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: '#374151', fontSize: 12 }}
                    tickLine={{ stroke: '#9CA3AF' }}
                  />
                  <YAxis
                    tick={{ fill: '#374151', fontSize: 12 }}
                    tickLine={{ stroke: '#9CA3AF' }}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {seriesKeys.slice(0, 5).map((key, index) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name={key}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'table' && (
          <div>
            <h3 className="text-lg font-semibold text-black mb-4">Pricing Data Table</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                    {seriesKeys.slice(0, 10).map(key => (
                      <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {chartData.map((row, index) => (
                    <tr key={row.year} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.year}</td>
                      {seriesKeys.slice(0, 10).map(key => (
                        <td key={key} className="px-4 py-3 text-sm text-gray-500">
                          {row[key] !== undefined ? `$${row[key].toLocaleString()}` : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'heatmap' && (
          <div>
            <h3 className="text-lg font-semibold text-black mb-4">Price Heatmap</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-black bg-gray-100">Segment</th>
                    {chartData.map(row => (
                      <th key={row.year} className="px-3 py-2 text-center text-xs font-medium text-black bg-gray-100">
                        {row.year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {seriesKeys.slice(0, 10).map((key, keyIndex) => {
                    // Calculate min and max for this segment
                    const values = chartData.map(row => row[key]).filter(v => v !== undefined) as number[]
                    const minVal = Math.min(...values)
                    const maxVal = Math.max(...values)
                    const range = maxVal - minVal || 1

                    return (
                      <tr key={key}>
                        <td className="px-3 py-2 text-xs font-medium text-black bg-gray-50 whitespace-nowrap">
                          {key}
                        </td>
                        {chartData.map((row) => {
                          const value = row[key] as number | undefined
                          if (value === undefined || typeof value !== 'number') {
                            return <td key={row.year} className="px-3 py-2 text-center text-xs text-black bg-gray-100">-</td>
                          }
                          // Calculate intensity (0-1)
                          const intensity = (value - minVal) / range
                          // Generate color (light to dark green with better contrast)
                          const bgColor = `rgba(82, 182, 154, ${0.15 + intensity * 0.45})`
                          return (
                            <td
                              key={row.year}
                              className="px-3 py-2 text-center text-xs font-semibold text-black"
                              style={{ backgroundColor: bgColor }}
                            >
                              ${value.toLocaleString()}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PricingAnalysisView
