'use client'

import { useMemo } from 'react'
import { useDashboardStore } from '@/lib/store'
import { TrendingUp, DollarSign, Calendar, Activity } from 'lucide-react'
import { formatIndianNumber, formatIndianNumberWithCommas, formatCurrencyValue, formatLargeNumber } from '@/lib/utils'
import { METRICS_END_YEAR, METRICS_START_YEAR, calculateCAGRFromTimeSeries } from '@/lib/metrics-calculator'

export function GlobalKPICards() {
  const { data, filters, currency } = useDashboardStore()

  const kpiData = useMemo(() => {
    if (!data) return null

    // Get year range from filters (use actual years from data)
    const [startYear, endYear] = filters.yearRange || [2024, 2032]

    // Use current filters to determine what to show
    // Get target geography from filters - use all selected geographies or use all geographies
    const allGeographies = data.dimensions.geographies.all_geographies || []
    // If no geographies are selected, we'll use all geographies (empty array means no filter)
    let selectedGeographies = filters.geographies.length > 0
      ? filters.geographies // Use all selected geographies
      : [] // Empty array means we'll show data for all geographies

    // Get segment type from filters (or use first segment type)
    const segmentTypes = Object.keys(data.dimensions.segments)
    const targetSegmentType = filters.segmentType || segmentTypes[0] || null

    // If no segment type is set, can't calculate KPIs
    if (!targetSegmentType) {
      return null
    }

    // Get the appropriate dataset based on data type filter
    const dataset = filters.dataType === 'value'
      ? data.data.value.geography_segment_matrix
      : data.data.volume.geography_segment_matrix

    if (!dataset || dataset.length === 0) {
      console.warn('KPI: No dataset available')
      return null
    }

    // Filter records based on selected geographies and segment type
    // In geography-mode, relax segment type filter to get complete geography totals
    const isGeographyMode = filters.viewMode === 'geography-mode'

    let globalRecords = dataset.filter(record => {
      // Filter by geography - include records from any selected geography
      if (selectedGeographies.length > 0 && !selectedGeographies.includes(record.geography)) {
        return false
      }
      // Filter by segment type (CRITICAL: prevents double-counting across segment types)
      // BUT: In geography-mode, accept records from any segment type
      if (!isGeographyMode && targetSegmentType && record.segment_type !== targetSegmentType) {
        return false
      }
      return true
    })

    // In geography-mode with multiple segment types, we need to avoid double-counting
    // by using records from only ONE segment type per geography
    if (isGeographyMode && globalRecords.length > 0) {
      // Group records by geography
      const recordsByGeography = new Map<string, typeof globalRecords>()
      globalRecords.forEach(record => {
        if (!recordsByGeography.has(record.geography)) {
          recordsByGeography.set(record.geography, [])
        }
        recordsByGeography.get(record.geography)!.push(record)
      })

      // For each geography, use only records from one segment type to avoid double-counting
      const deduplicatedRecords: typeof globalRecords = []
      recordsByGeography.forEach((geoRecords, geography) => {
        // Group by segment type
        const bySegmentType = new Map<string, typeof globalRecords>()
        geoRecords.forEach(r => {
          if (!bySegmentType.has(r.segment_type)) {
            bySegmentType.set(r.segment_type, [])
          }
          bySegmentType.get(r.segment_type)!.push(r)
        })

        // Use first segment type's records
        const firstSegTypeRecords = bySegmentType.values().next().value || []

        // Prefer leaf records, then Level 1, then lowest level
        let recordsToUse = firstSegTypeRecords.filter((r: any) => !r.is_aggregated)
        if (recordsToUse.length === 0) {
          recordsToUse = firstSegTypeRecords.filter((r: any) => r.aggregation_level === 1)
        }
        if (recordsToUse.length === 0 && firstSegTypeRecords.length > 0) {
          const minLevel = Math.min(...firstSegTypeRecords.map((r: any) => r.aggregation_level || 999))
          recordsToUse = firstSegTypeRecords.filter((r: any) => (r.aggregation_level || 999) === minLevel)
        }

        deduplicatedRecords.push(...recordsToUse)
      })

      globalRecords = deduplicatedRecords
    }

    // In geography-mode, the de-duplication above already selected the best records
    // So we can use globalRecords directly
    let leafRecords: typeof globalRecords

    if (isGeographyMode) {
      // Already de-duplicated and smart-selected above
      leafRecords = globalRecords
    } else {
      // Try to use leaf records first to prevent double-counting
      leafRecords = globalRecords.filter(record => record.is_aggregated === false)

      // If no leaf records, try using level 1 aggregated records (top-level totals)
      if (leafRecords.length === 0) {
        leafRecords = globalRecords.filter(record => record.aggregation_level === 1)
      }

      // If still no records, use all records but deduplicate by taking highest aggregation level
      if (leafRecords.length === 0) {
        // Get unique geography combinations and use their aggregated values
        const geoMap = new Map()
        globalRecords.forEach(record => {
          const key = `${record.geography}::${record.segment_type}`
          const existing = geoMap.get(key)
          if (!existing || (record.aggregation_level && record.aggregation_level < (existing.aggregation_level || 999))) {
            geoMap.set(key, record)
          }
        })
        leafRecords = Array.from(geoMap.values())
      }
    }

    // If no records match the current filters, try a fallback approach
    if (leafRecords.length === 0 && selectedGeographies.length > 0) {
      // Try with all geographies for this segment type
      const allRecordsForSegmentType = dataset.filter(record => {
        return record.segment_type === targetSegmentType
      })

      let fallbackRecords = allRecordsForSegmentType.filter(record => record.is_aggregated === false)
      if (fallbackRecords.length === 0) {
        fallbackRecords = allRecordsForSegmentType.filter(record => record.aggregation_level === 1)
      }
      if (fallbackRecords.length === 0) {
        fallbackRecords = allRecordsForSegmentType
      }

      if (fallbackRecords.length > 0) {
        leafRecords = fallbackRecords
        selectedGeographies = []
      }
    }

    // If still no records, return null (no data available for this segment type)
    if (leafRecords.length === 0) {
      console.warn('No KPI data available for segment type:', targetSegmentType)
      return null
    }

    // Get available years from the first record to ensure we're using correct keys
    const sampleTimeSeries = leafRecords[0]?.time_series || {}
    const availableYears = Object.keys(sampleTimeSeries).map(y => parseInt(y)).filter(y => !isNaN(y)).sort((a, b) => a - b)

    // Use the actual start and end years from data if available
    const actualStartYear = availableYears.length > 0 ? Math.min(...availableYears) : startYear
    const actualEndYear = availableYears.length > 0 ? Math.max(...availableYears) : endYear

    // KPI market size uses filter year range; CAGR uses standard 2026–2033 when those years exist
    const cagrStartYear = availableYears.includes(METRICS_START_YEAR)
      ? METRICS_START_YEAR
      : actualStartYear
    const cagrEndYear = availableYears.includes(METRICS_END_YEAR)
      ? METRICS_END_YEAR
      : actualEndYear

    let marketSizeStart = 0
    let marketSizeEnd = 0
    let marketSizeCagrStart = 0
    let marketSizeCagrEnd = 0

    leafRecords.forEach(record => {
      const startValue = record.time_series[actualStartYear] ?? 0
      const endValue = record.time_series[actualEndYear] ?? 0
      marketSizeStart += startValue
      marketSizeEnd += endValue
      marketSizeCagrStart += record.time_series[cagrStartYear] ?? 0
      marketSizeCagrEnd += record.time_series[cagrEndYear] ?? 0
    })

    const aggregatedCagrSeries: Record<number, number> = {
      [cagrStartYear]: marketSizeCagrStart,
      [cagrEndYear]: marketSizeCagrEnd,
    }
    const cagr = calculateCAGRFromTimeSeries(aggregatedCagrSeries, cagrStartYear, cagrEndYear)

    // Calculate absolute growth
    const absoluteGrowth = marketSizeEnd - marketSizeStart
    const growthPercentage = marketSizeStart > 0
      ? ((marketSizeEnd - marketSizeStart) / marketSizeStart) * 100
      : 0

    // Get currency preference
    const selectedCurrency = currency || data.metadata.currency || 'USD'
    const isINR = selectedCurrency === 'INR'

    // Values in time_series are ALREADY in the unit specified by metadata (e.g., Million)
    // So if value_unit is "Million", the values like 213361.24 mean "213,361.24 Million USD"
    // We should NOT divide by 1,000,000 - the data is already in the correct unit
    const unit = filters.dataType === 'value'
      ? (data.metadata.value_unit || 'Million')
      : (data.metadata.volume_unit || 'Units')

    // No conversion needed - data is already in the stated unit
    // Just use the values directly
    const marketSizeStartDisplay = marketSizeStart
    const marketSizeEndDisplay = marketSizeEnd
    const absoluteGrowthDisplay = absoluteGrowth

    // Build descriptive labels
    // Note: selectedGeographies might be empty if we fell back to showing all geographies
    const actualSelectedGeographies = filters.geographies.length > 0 ? filters.geographies : []
    const dataTypeLabel = filters.dataType === 'value' ? 'Market Size' : 'Market Volume'
    const geographyLabel = actualSelectedGeographies.length === 0
      ? 'All Geographies'
      : actualSelectedGeographies.length === 1
      ? actualSelectedGeographies[0]
      : `${actualSelectedGeographies.length} Geographies (${actualSelectedGeographies.slice(0, 2).join(', ')}${actualSelectedGeographies.length > 2 ? '...' : ''})`
    const segmentTypeLabel = targetSegmentType || 'All Segments'

    return {
      marketSizeStart: marketSizeStartDisplay,
      marketSizeEnd: marketSizeEndDisplay,
      startYear: actualStartYear,
      endYear: actualEndYear,
      cagrStartYear,
      cagrEndYear,
      cagr,
      absoluteGrowth: absoluteGrowthDisplay,
      growthPercentage,
      currency: selectedCurrency,
      unit: isINR ? '' : (unit || 'Million'),
      dataTypeLabel,
      geographyLabel,
      segmentTypeLabel,
      dataType: filters.dataType,
      isINR
    }
  }, [data, filters, currency])

  if (!kpiData) return null

  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-y border-gray-200">
      <div className="container mx-auto px-6 py-3">
        {/* Descriptive Header */}
        <div className="mb-3 pb-2 border-b border-gray-300">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">{kpiData.dataTypeLabel}</span>
            {' for '}
            <span className="font-semibold">{kpiData.geographyLabel}</span>
            {kpiData.segmentTypeLabel && (
              <>
                {' | '}
                <span className="font-semibold">{kpiData.segmentTypeLabel}</span>
              </>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {/* Market Size Start Year */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded">
              {kpiData.currency === 'INR' ? (
                <span className="text-blue-600 font-bold text-lg">₹</span>
              ) : (
                <DollarSign className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <div>
              <p className="text-[10px] text-black uppercase tracking-wider font-semibold">
                {kpiData.dataTypeLabel} {kpiData.startYear}
              </p>
              <p className="text-base font-bold text-black leading-tight">
                {kpiData.dataType === 'value' && kpiData.isINR
                  ? `₹ ${kpiData.marketSizeStart.toFixed(2)} Cr.`
                  : kpiData.dataType === 'value'
                  ? `$ ${formatLargeNumber(kpiData.marketSizeStart, 1)} ${kpiData.unit}`
                  : `${formatLargeNumber(kpiData.marketSizeStart, 1)} ${kpiData.unit}`}
              </p>
            </div>
          </div>

          {/* Market Size End Year */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-100 rounded">
              <Calendar className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] text-black uppercase tracking-wider font-semibold">
                {kpiData.dataTypeLabel} {kpiData.endYear}
              </p>
              <p className="text-base font-bold text-black leading-tight">
                {kpiData.dataType === 'value' && kpiData.isINR
                  ? `₹ ${kpiData.marketSizeEnd.toFixed(2)} Cr.`
                  : kpiData.dataType === 'value'
                  ? `$ ${formatLargeNumber(kpiData.marketSizeEnd, 1)} ${kpiData.unit}`
                  : `${formatLargeNumber(kpiData.marketSizeEnd, 1)} ${kpiData.unit}`}
              </p>
            </div>
          </div>

          {/* CAGR */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] text-black uppercase tracking-wider font-semibold">
                CAGR ({kpiData.cagrStartYear}-{kpiData.cagrEndYear})
              </p>
              <p className="text-base font-bold text-black leading-tight">
                {kpiData.cagr.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Absolute Growth */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-100 rounded">
              <Activity className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-[10px] text-black uppercase tracking-wider font-semibold">
                Absolute Growth ({kpiData.startYear}-{kpiData.endYear})
              </p>
              <p className="text-base font-bold text-black leading-tight">
                {kpiData.dataType === 'value' && kpiData.isINR
                  ? `₹ ${kpiData.absoluteGrowth.toFixed(2)} Cr.`
                  : kpiData.dataType === 'value'
                  ? `$ ${formatLargeNumber(kpiData.absoluteGrowth, 1)} ${kpiData.unit}`
                  : `${formatLargeNumber(kpiData.absoluteGrowth, 1)} ${kpiData.unit}`}
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                +{kpiData.growthPercentage.toFixed(1)}% increase
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
