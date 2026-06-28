'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import * as d3 from 'd3'
import { useDashboardStore } from '@/lib/store'
import { getChartColor } from '@/lib/chart-theme'
import { filterData } from '@/lib/data-processor'
import { GeographyMultiSelect } from '@/components/filters/GeographyMultiSelect'
import { AggregationLevelSelector } from '@/components/filters/AggregationLevelSelector'
import { CascadeFilter } from '@/components/filters/CascadeFilter'
import { BusinessTypeFilter } from '@/components/filters/BusinessTypeFilter'
import { Layers, ChevronDown, X, Tag, Plus } from 'lucide-react'
import type { DataRecord } from '@/lib/types'

// Wrapper components for opportunity matrix filters
function OpportunityGeographyMultiSelect() {
  const { data, opportunityFilters, updateOpportunityFilters } = useDashboardStore()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const shouldHide = opportunityFilters.segmentType === 'By Region' || opportunityFilters.segmentType === 'By State'

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const geographyOptions = useMemo(() => {
    if (!data || !data.dimensions?.geographies) return []
    const allGeographies = data.dimensions.geographies.all_geographies || []
    if (!searchTerm) return allGeographies
    const search = searchTerm.toLowerCase()
    return allGeographies.filter(geo => geo.toLowerCase().includes(search))
  }, [data, searchTerm])

  if (shouldHide) return null

  const selectedCount = opportunityFilters.geographies.length

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white flex items-center justify-between"
      >
        <span className="text-black">
          {selectedCount === 0 ? 'Select geographies...' : `${selectedCount} selected`}
        </span>
        <ChevronDown className={`h-4 w-4 text-black transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search geographies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-black"
            />
          </div>
          <div className="p-2 space-y-1">
            {geographyOptions.map(geo => {
              const isSelected = opportunityFilters.geographies.includes(geo)
              return (
                <label key={geo} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const current = opportunityFilters.geographies
                      const updated = e.target.checked
                        ? [...current, geo]
                        : current.filter(g => g !== geo)
                      updateOpportunityFilters({ geographies: updated })
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-black">{geo}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function OpportunityAggregationLevelSelector() {
  const { opportunityFilters, updateOpportunityFilters } = useDashboardStore()

  const handleLevelChange = (level: number | null) => {
    updateOpportunityFilters({ aggregationLevel: level })
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-black flex items-center gap-2">
        <Layers className="h-4 w-4" />
        Aggregation Level
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleLevelChange(null)}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            opportunityFilters.aggregationLevel === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-black hover:bg-gray-200'
          }`}
        >
          All Levels
        </button>
        {[1, 2, 3, 4, 5, 6].map(level => (
          <button
            key={level}
            type="button"
            onClick={() => handleLevelChange(level)}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              opportunityFilters.aggregationLevel === level
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }`}
          >
            Level {level}
          </button>
        ))}
      </div>
    </div>
  )
}

function OpportunityBusinessTypeFilter() {
  const { opportunityFilters, updateOpportunityFilters } = useDashboardStore()

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-black">
        Business Type
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => updateOpportunityFilters({ businessType: undefined })}
          className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
            opportunityFilters.businessType === undefined
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-black hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => updateOpportunityFilters({ businessType: 'B2B' })}
          className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
            opportunityFilters.businessType === 'B2B'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-black hover:bg-gray-200'
          }`}
        >
          B2B
        </button>
        <button
          type="button"
          onClick={() => updateOpportunityFilters({ businessType: 'B2C' })}
          className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
            opportunityFilters.businessType === 'B2C'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-black hover:bg-gray-200'
          }`}
        >
          B2C
        </button>
      </div>
    </div>
  )
}

interface BubbleChartProps {
  title?: string
  height?: number
}

interface BubbleDataPoint {
  name: string
  x: number // Will be overwritten by D3 force simulation with pixel position
  y: number // Will be overwritten by D3 force simulation with pixel position
  z: number // Incremental Opportunity Index for bubble size
  radius: number // Calculated radius for visualization
  geography: string
  segment: string
  segmentType: string
  currentValue: number
  cagr: number
  marketShare: number
  absoluteGrowth: number
  color: string
  // Store original index values separately since D3 will overwrite x,y with pixel positions
  xIndex: number       // CAGR Index (0-100)
  yIndex: number       // Market Share Index (0-100)
  zIndex: number       // Incremental Opportunity Index (0-100)
}

interface SelectedSegmentItem {
  type: string
  segment: string
  id: string
}

export function D3BubbleChartIndependent({ title, height = 500 }: BubbleChartProps) {
  const { data, filters, opportunityFilters, updateFilters, updateOpportunityFilters, selectedChartGroup, currency } = useDashboardStore()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height })
  const [tooltipData, setTooltipData] = useState<BubbleDataPoint | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [maxBubbles, setMaxBubbles] = useState(50) // Slider for bubble count
  
  // Use opportunity filters when in coherent-opportunity mode, otherwise use regular filters
  const isOpportunityMode = selectedChartGroup === 'coherent-opportunity'
  const activeFilters = isOpportunityMode ? opportunityFilters : filters
  const updateActiveFilters = isOpportunityMode ? updateOpportunityFilters : updateFilters
  
  // State for error messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // Debug: Log when component renders with opportunity mode
  useEffect(() => {
    if (isOpportunityMode) {
      const debugData = {
        hasData: !!data,
        hasDataData: !!data?.data,
        hasValueMatrix: !!data?.data?.value?.geography_segment_matrix,
        hasVolumeMatrix: !!data?.data?.volume?.geography_segment_matrix,
        valueMatrixLength: data?.data?.value?.geography_segment_matrix?.length || 0,
        volumeMatrixLength: data?.data?.volume?.geography_segment_matrix?.length || 0,
        activeFilters,
        selectedChartGroup,
        allGeographies: data?.dimensions?.geographies?.all_geographies || [],
        allSegmentTypes: data?.dimensions?.segments ? Object.keys(data.dimensions.segments) : [],
        selectedGeographies: activeFilters.geographies,
        selectedSegmentType: activeFilters.segmentType,
        aggregationLevel: activeFilters.aggregationLevel,
        selectedSegments: activeFilters.segments,
        dataType: activeFilters.dataType
      }
      console.log('🎯 D3BubbleChartIndependent: Opportunity mode active', debugData)
      setDebugInfo(debugData)
    } else {
      setErrorMessage(null)
      setDebugInfo(null)
    }
  }, [isOpportunityMode, data, activeFilters, selectedChartGroup])
  
  // For opportunity mode: Simple geography and segment type selection
  // For regular mode: Keep existing logic
  const selectedGeography = activeFilters.geographies.length > 0 ? activeFilters.geographies[0] : 
    (data?.dimensions?.geographies?.all_geographies?.[0] || '')
  const selectedSegmentType = activeFilters.segmentType || 
    (data?.dimensions?.segments ? Object.keys(data.dimensions.segments)[0] : '')

  // Get hierarchy for cascade filter (for opportunity mode)
  const segmentDimension = data?.dimensions?.segments?.[selectedSegmentType]
  const hasB2BSegmentation = segmentDimension && (
    (segmentDimension.b2b_hierarchy && Object.keys(segmentDimension.b2b_hierarchy).length > 0) ||
    (segmentDimension.b2c_hierarchy && Object.keys(segmentDimension.b2c_hierarchy).length > 0) ||
    (segmentDimension.b2b_items && segmentDimension.b2b_items.length > 0) ||
    (segmentDimension.b2c_items && segmentDimension.b2c_items.length > 0)
  )
  
  let hierarchy = segmentDimension?.hierarchy || {}
  if (hasB2BSegmentation && isOpportunityMode) {
    if (activeFilters.businessType === 'B2B' && segmentDimension?.b2b_hierarchy) {
      hierarchy = segmentDimension.b2b_hierarchy
    } else if (activeFilters.businessType === 'B2C' && segmentDimension?.b2c_hierarchy) {
      hierarchy = segmentDimension.b2c_hierarchy
    }
  }
  
  // Cascade filter state for opportunity mode
  const [cascadePath, setCascadePath] = useState<string[]>([])
  const [selectedSegments, setSelectedSegments] = useState<SelectedSegmentItem[]>([])
  
  // Initialize selectedSegments from store filters when data loads (opportunity mode)
  useEffect(() => {
    if (isOpportunityMode && data && activeFilters.segments && activeFilters.segments.length > 0 && activeFilters.segmentType) {
      const seen = new Set<string>()
      const segmentsFromStore: SelectedSegmentItem[] = []
      
      activeFilters.segments.forEach((segment) => {
        const id = `${activeFilters.segmentType}::${segment}`
        if (!seen.has(id)) {
          seen.add(id)
          segmentsFromStore.push({
            type: activeFilters.segmentType,
            segment: segment,
            id: id
          })
        }
      })
      
      setSelectedSegments(segmentsFromStore)
    }
  }, [data, activeFilters.segments, activeFilters.segmentType, isOpportunityMode])
  
  // Clear segments when segment type or business type changes (opportunity mode)
  useEffect(() => {
    if (isOpportunityMode && hasB2BSegmentation && selectedSegments.length > 0) {
      setSelectedSegments([])
      setCascadePath([])
      updateActiveFilters({ segments: [], advancedSegments: [] } as any)
    }
  }, [activeFilters.businessType, selectedSegmentType, hasB2BSegmentation, isOpportunityMode, selectedSegments.length, updateActiveFilters])
  
  // Handle cascade filter selection (opportunity mode)
  const handleCascadeSelection = (path: string[]) => {
    setCascadePath(path)
  }
  
  // Add segment from cascade (opportunity mode)
  const handleAddSegment = () => {
    if (!isOpportunityMode || cascadePath.length === 0) return
    
    const segmentToAdd = cascadePath[cascadePath.length - 1]
    const id = `${selectedSegmentType}::${segmentToAdd}`
    const exists = selectedSegments.find(s => s.id === id)
    
    if (!exists) {
      const newSegment: SelectedSegmentItem = {
        type: selectedSegmentType,
        segment: segmentToAdd,
        id: id
      }
      const updated = [...selectedSegments, newSegment]
      setSelectedSegments(updated)
      
      updateActiveFilters({ 
        segments: updated.map(s => s.segment) || [],
        advancedSegments: updated || [],
      } as any)
    }
    
    // Clear selections after adding
    setCascadePath([])
  }
  
  // Remove a segment (opportunity mode)
  const handleRemoveSegment = (id: string) => {
    if (!isOpportunityMode) return
    const updated = selectedSegments.filter(s => s.id !== id)
    setSelectedSegments(updated)
    updateActiveFilters({ 
      segments: updated.map(s => s.segment) || [],
      advancedSegments: updated || [],
    } as any)
  }
  
  // Clear all segments (opportunity mode)
  const handleClearAllSegments = () => {
    if (!isOpportunityMode) return
    setSelectedSegments([])
    setCascadePath([])
    updateActiveFilters({ 
      segments: [], 
      advancedSegments: [],
    } as any)
  }

  // Calculate chart data based on selected filters
  const chartData = useMemo(() => {
    if (!data) {
      console.warn('D3BubbleChartIndependent: No data available')
      return { bubbles: [], xLabel: '', yLabel: '', totalBubbles: 0 }
    }
    
    // Check if required data structure exists
    if (!data.data || !data.data.value || !data.data.value.geography_segment_matrix) {
      console.error('D3BubbleChartIndependent: Missing data structure', {
        hasData: !!data,
        hasDataData: !!data.data,
        hasValue: !!data.data?.value,
        hasMatrix: !!data.data?.value?.geography_segment_matrix,
        dataKeys: data ? Object.keys(data) : [],
        dataDataKeys: data.data ? Object.keys(data.data) : []
      })
      return { bubbles: [], xLabel: '', yLabel: '', totalBubbles: 0 }
    }

    // For opportunity mode: Simple Geography x Segment Type matrix using CAGR from JSON
    if (isOpportunityMode) {
      const dataset = activeFilters.dataType === 'value'
        ? (data.data.value?.geography_segment_matrix || [])
        : (data.data.volume?.geography_segment_matrix || [])
      
      if (!dataset || dataset.length === 0) {
        const errorDetails = {
          dataType: activeFilters.dataType,
          hasValueMatrix: !!data.data.value?.geography_segment_matrix,
          hasVolumeMatrix: !!data.data.volume?.geography_segment_matrix,
          valueLength: data.data.value?.geography_segment_matrix?.length || 0,
          volumeLength: data.data.volume?.geography_segment_matrix?.length || 0,
          hasData: !!data,
          hasDataData: !!data?.data,
          dataKeys: data?.data ? Object.keys(data.data) : []
        }
        console.error('❌ D3BubbleChartIndependent: No data in matrix for opportunity mode', errorDetails)
        setErrorMessage(`No ${activeFilters.dataType} data available. Please check your data source.`)
        setDebugInfo(errorDetails)
        return { bubbles: [], xLabel: '', yLabel: '', totalBubbles: 0 }
      }
      
      setErrorMessage(null) // Clear error if we have data

      // Get all geographies and segment types
      const allGeographies = data.dimensions.geographies.all_geographies || []
      const allSegmentTypes = Object.keys(data.dimensions.segments) || []
      
      if (allGeographies.length === 0) {
        console.error('❌ D3BubbleChartIndependent: No geographies found in data dimensions')
        setErrorMessage('No geographies found in data. Please check your data structure.')
        return { bubbles: [], xLabel: '', yLabel: '', totalBubbles: 0 }
      }
      
      if (allSegmentTypes.length === 0) {
        console.error('❌ D3BubbleChartIndependent: No segment types found in data dimensions')
        setErrorMessage('No segment types found in data. Please check your data structure.')
        return { bubbles: [], xLabel: '', yLabel: '', totalBubbles: 0 }
      }
      
      // Use the shared filterData function to ensure consistent filtering logic
      // This handles aggregation levels, geography, segment type, and segments correctly
      console.log('🎯 Opportunity Matrix Debug - Initial State:', {
        datasetLength: dataset.length,
        activeFilters: activeFilters,
        sampleRecord: dataset[0],
        hasAggregationLevel: dataset[0]?.aggregation_level !== undefined,
        aggregationLevelValue: dataset[0]?.aggregation_level,
        hasGeography: dataset[0]?.geography !== undefined,
        hasSegmentType: dataset[0]?.segment_type !== undefined,
        hasSegment: dataset[0]?.segment !== undefined,
        hasCAGR: dataset[0]?.cagr !== undefined,
        cagrValue: dataset[0]?.cagr
      })

      // For Opportunity Matrix: Filter by geography first, segment type is optional
      // This allows showing all data for selected geographies even if they don't have the selected segment type
      let filteredRecords: DataRecord[] = []

      // First, filter by geography only
      const geoFilteredRecords = dataset.filter(record => {
        // Geography filter
        if (activeFilters.geographies.length > 0) {
          if (!activeFilters.geographies.includes(record.geography)) {
            return false
          }
        }
        return true
      })

      // Then try to filter by segment type if specified
      if (activeFilters.segmentType && activeFilters.segmentType !== '') {
        const segmentTypeFiltered = geoFilteredRecords.filter(record =>
          record.segment_type === activeFilters.segmentType
        )

        // If we have records for the selected segment type, use them
        // Otherwise, fall back to all geography-filtered records
        if (segmentTypeFiltered.length > 0) {
          filteredRecords = segmentTypeFiltered
        } else {
          // No data for selected segment type in selected geographies
          // Show all available data for selected geographies
          filteredRecords = geoFilteredRecords
          console.log('🎯 No data for segment type', activeFilters.segmentType, 'in selected geographies, showing all available data')
        }
      } else {
        // No segment type filter, show all geography-filtered records
        filteredRecords = geoFilteredRecords
      }

      // Apply additional filters (segments, business type) using filterData
      // Create a modified filter that doesn't re-apply geography/segment type filtering
      const additionalFilters = {
        ...activeFilters,
        geographies: [], // Already filtered above
        segmentType: filteredRecords.length > 0 ? filteredRecords[0].segment_type : activeFilters.segmentType, // Use actual segment type from records
      }

      // Only apply filterData if we need additional filtering (segments, business type, etc.)
      if ((activeFilters.segments && activeFilters.segments.length > 0) ||
          activeFilters.businessType ||
          activeFilters.aggregationLevel !== null) {
        filteredRecords = filterData(filteredRecords, additionalFilters)
      }

      console.log('🎯 After Opportunity Matrix filtering:', {
        before: dataset.length,
        afterGeoFilter: geoFilteredRecords.length,
        afterFinal: filteredRecords.length,
        filters: {
          geographies: activeFilters.geographies,
          segmentType: activeFilters.segmentType,
          aggregationLevel: activeFilters.aggregationLevel,
          segments: activeFilters.segments
        },
        uniqueGeosInResult: [...new Set(filteredRecords.map(r => r.geography))],
        uniqueSegmentTypesInResult: [...new Set(filteredRecords.map(r => r.segment_type))],
        sampleAfterFilter: filteredRecords[0]
      })

      // filterData already handles all filtering including segments, so no need for additional steps
      
      // Final validation with detailed debugging
      if (filteredRecords.length === 0) {
        // Get unique values for error reporting
        const uniqueGeographies = [...new Set(dataset.map(r => r.geography).filter(g => g))]
        const uniqueSegmentTypes = [...new Set(dataset.map(r => r.segment_type).filter(s => s))]
        const uniqueSegments = [...new Set(dataset.map(r => r.segment).filter(s => s))]
        const uniqueAggregationLevels = [...new Set(dataset.map(r => r.aggregation_level).filter(l => l !== null && l !== undefined))]
        
        // Check what records exist after filterData
        const afterFilterData = filterData(dataset, activeFilters)
        
        const errorDetails = {
          datasetLength: dataset.length,
          afterFilterDataLength: afterFilterData.length,
          activeFilters: {
            geographies: activeFilters.geographies,
            segmentType: activeFilters.segmentType,
            segments: activeFilters.segments,
            aggregationLevel: activeFilters.aggregationLevel,
            dataType: activeFilters.dataType
          },
          availableGeographies: uniqueGeographies,
          availableSegmentTypes: uniqueSegmentTypes,
          availableAggregationLevels: uniqueAggregationLevels,
          availableSegments: uniqueSegments.slice(0, 20),
          sampleRecord: dataset[0],
          sampleAfterFilter: afterFilterData[0]
        }
        console.error('❌ D3BubbleChartIndependent: No records match the filters', errorDetails)
        
        // Provide more specific error message
        let errorMsg = 'No data matches the current filters.\n\n'
        if (afterFilterData.length === 0) {
          if (activeFilters.aggregationLevel !== null && activeFilters.aggregationLevel !== undefined) {
            errorMsg += `❌ No records found for aggregation level ${activeFilters.aggregationLevel}.\n`
            errorMsg += `   Available levels: ${uniqueAggregationLevels.join(', ')}\n`
          }
          if (activeFilters.geographies.length > 0) {
            errorMsg += `❌ No records found for selected geographies: ${activeFilters.geographies.join(', ')}.\n`
            errorMsg += `   Available geographies: ${uniqueGeographies.slice(0, 10).join(', ')}\n`
          }
          if (activeFilters.segmentType) {
            errorMsg += `❌ No records found for selected segment type: ${activeFilters.segmentType}.\n`
            errorMsg += `   Available segment types: ${uniqueSegmentTypes.slice(0, 10).join(', ')}\n`
          }
          if (activeFilters.segments && activeFilters.segments.length > 0) {
            errorMsg += `❌ No records found for selected segments.\n`
            errorMsg += `   Selected: ${activeFilters.segments.slice(0, 5).join(', ')}...\n`
            errorMsg += `   Available: ${uniqueSegments.slice(0, 10).join(', ')}\n`
          }
        }
        errorMsg += '\n💡 Try: Clear filters or adjust Geography/Segment Type/Aggregation Level filters.'
        
        setErrorMessage(errorMsg)
        setDebugInfo(errorDetails)
        return { bubbles: [], xLabel: '', yLabel: '', totalBubbles: 0 }
      }
      
      console.log('✅ Final filtered records after filterData:', {
        count: filteredRecords.length,
        sample: filteredRecords[0],
        geographies: [...new Set(filteredRecords.map(r => r.geography))],
        segmentTypes: [...new Set(filteredRecords.map(r => r.segment_type))],
        segments: [...new Set(filteredRecords.map(r => r.segment))].slice(0, 10)
      })
      
      setErrorMessage(null) // Clear error if we have filtered records

      // Build matrix: Geography x Segment Type with CAGR from JSON
      const bubbles: BubbleDataPoint[] = []
      const [startYear, endYear] = activeFilters.yearRange
      
      // Calculate max and min values for normalization with better spread
      let maxCAGR = 0
      let minCAGR = Infinity
      let maxValue = 0
      let minValue = Infinity

      filteredRecords.forEach(record => {
        const cagr = Math.abs(record.cagr || 0)
        const value = record.time_series[endYear] || 0
        maxCAGR = Math.max(maxCAGR, cagr)
        minCAGR = Math.min(minCAGR, cagr)
        maxValue = Math.max(maxValue, value)
        minValue = Math.min(minValue, value)
      })

      // Ensure we have valid ranges (avoid division by zero)
      if (minCAGR === Infinity) minCAGR = 0
      if (minValue === Infinity) minValue = 0
      const cagrRange = maxCAGR - minCAGR
      const valueRange = maxValue - minValue

      filteredRecords.forEach((record, index) => {
        // Parse CAGR - it might be a string like "9.5%" or a number
        // Note: DataRecord defines cagr as number, but JSON data may have it as string
        let cagr = 0
        if (record.cagr !== null && record.cagr !== undefined) {
          // Type assertion to handle both string and number types
          const cagrValue = record.cagr as unknown as number | string
          if (typeof cagrValue === 'string') {
            // Remove % and parse
            cagr = parseFloat(cagrValue.replace('%', '').trim()) || 0
          } else if (typeof cagrValue === 'number' && !isNaN(cagrValue)) {
            cagr = cagrValue
          }
        }
        
        const value = record.time_series[endYear] || 0
        const baseValue = record.time_series[startYear] || 0

        // Normalize to 10-100 scale with better spread using min-max normalization
        // This ensures bubbles spread across the chart even when values are similar
        // Using 10-100 range instead of 0-100 to keep bubbles away from edges
        const cagrIndex = cagrRange > 0
          ? 10 + ((Math.abs(cagr) - minCAGR) / cagrRange) * 90
          : 50 // Center if all values are the same
        const valueIndex = valueRange > 0
          ? 10 + ((value - minValue) / valueRange) * 90
          : 50 // Center if all values are the same
        
        // For Level 1 with __ALL_SEGMENTS__, use segment_type
        // For other cases, use actual segment name
        const segmentName = (activeFilters.aggregationLevel === 1 && record.segment === '__ALL_SEGMENTS__')
          ? record.segment_type
          : record.segment
        
        // Create bubble name: Geography - Segment
        const bubbleName = segmentName && segmentName !== '__ALL_SEGMENTS__'
          ? `${record.geography} - ${segmentName}`
          : `${record.geography} - ${record.segment_type}`
        
        bubbles.push({
          name: bubbleName,
          x: cagrIndex,
          y: valueIndex,
          z: cagrIndex, // Use CAGR index for bubble size
          radius: 0, // Will be calculated
          geography: record.geography,
          segment: segmentName || record.segment,
          segmentType: record.segment_type,
          currentValue: value,
          cagr: cagr, // CAGR from JSON (parsed)
          marketShare: 0,
          absoluteGrowth: value - baseValue,
          color: getChartColor(index % 10),
          xIndex: cagrIndex,
          yIndex: valueIndex,
          zIndex: cagrIndex
        })
      })

      if (bubbles.length === 0) {
        console.error('❌ D3BubbleChartIndependent: No bubbles created from filtered records', {
          filteredRecordsCount: filteredRecords.length,
          sampleRecord: filteredRecords[0],
          hasCAGR: filteredRecords[0]?.cagr !== undefined,
          hasTimeSeries: filteredRecords[0]?.time_series !== undefined,
          endYear,
          startYear
        })
        setErrorMessage('No bubbles could be created from the filtered data. Check if records have CAGR and time_series data.')
        return { bubbles: [], xLabel: '', yLabel: '', totalBubbles: 0 }
      }
      
      // Apply tiered sizing with 20% reduction between tiers
      const maxBubbleRadius = 60 // Adjust based on chart size
      const minBubbleRadius = 15
      const sizeReductionPercent = 0.20 // 20% reduction per tier
      
      // Sort bubbles by CAGR (z value) in descending order
      const sortedBubbles = [...bubbles].sort((a, b) => b.z - a.z)
      
      // Calculate tier sizes
      const tiers: number[] = []
      let currentSize = maxBubbleRadius
      
      while (currentSize >= minBubbleRadius) {
        tiers.push(currentSize)
        currentSize = currentSize * (1 - sizeReductionPercent)
      }
      
      // Ensure we have at least one tier
      if (tiers.length === 0) {
        tiers.push(maxBubbleRadius)
      }
      
      // Assign tiered sizes based on sorted order
      sortedBubbles.forEach((bubble, index) => {
        const tierIndex = Math.min(index, tiers.length - 1)
        bubble.radius = Math.max(tiers[tierIndex], minBubbleRadius)
      })
      
      // Update original bubbles array with tiered radii
      const radiusMap = new Map(sortedBubbles.map(b => [b.name, b.radius]))
      bubbles.forEach(bubble => {
        bubble.radius = radiusMap.get(bubble.name) || minBubbleRadius
      })
      
      const limitedBubbles = bubbles.slice(0, maxBubbles)
      console.log('✅ Opportunity Matrix: Bubbles created successfully', {
        totalBubbles: bubbles.length,
        displayedBubbles: limitedBubbles.length,
        maxBubbles,
        tiersCreated: tiers.length,
        top5Sizes: sortedBubbles.slice(0, 5).map(b => ({
          name: b.name,
          zValue: b.z.toFixed(1),
          radius: b.radius.toFixed(1)
        })),
        sampleBubble: limitedBubbles[0]
      })
      
      setErrorMessage(null) // Clear error if bubbles were created
      return { 
        bubbles: limitedBubbles, 
        xLabel: 'CAGR Index', 
        yLabel: 'Market Size Index', 
        totalBubbles: bubbles.length 
      }
    }

    // Regular mode: Keep existing logic
    if (!selectedGeography || !selectedSegmentType) {
      return { bubbles: [], xLabel: '', yLabel: '', totalBubbles: 0 }
    }

    const dataset = activeFilters.dataType === 'value'
      ? data.data.value.geography_segment_matrix
      : data.data.volume.geography_segment_matrix

    // Use filterData to apply all filters (geography, segment type, aggregation level, segments, etc.)
    const filteredRecords = filterData(dataset, {
      ...activeFilters,
      geographies: [selectedGeography], // Use single geography for bubble chart
      advancedSegments: activeFilters.advancedSegments || [] as any
    })

    if (filteredRecords.length === 0) {
      return { bubbles: [], xLabel: '', yLabel: '', totalBubbles: 0 }
    }

    // Group records by segment for aggregation
    const segmentGroups = new Map<string, DataRecord[]>()
    
    filteredRecords.forEach(record => {
      const segmentKey = record.segment
      if (!segmentGroups.has(segmentKey)) {
        segmentGroups.set(segmentKey, [])
      }
      segmentGroups.get(segmentKey)!.push(record)
    })
    
    const segmentsToProcess = Array.from(segmentGroups.keys())

    // Calculate metrics for each segment
    const [startYear, endYear] = activeFilters.yearRange
    const forecastYear = endYear
    const baseYear = startYear
    
    // Calculate total market value for market share calculation
    const leafRecords = filteredRecords.filter(record => record.is_aggregated === false)
    let totalMarketValue2024 = 0
    leafRecords.forEach(record => {
      const value = record.time_series[baseYear] || 0
      totalMarketValue2024 += value
    })

    // Calculate metrics for each segment group
    const segmentData: Array<{
      segment: string
      baseValue: number
      forecastValue: number
      cagr: number
      marketShare2024: number
      absoluteGrowth: number
      index: number
    }> = []
    
    segmentsToProcess.forEach((segment, index) => {
      const segmentRecords = segmentGroups.get(segment) || []
      
      if (segmentRecords.length === 0) return
      
      // Aggregate values across all records in this segment group
      let forecastValue = 0
      let baseValue = 0
      
      segmentRecords.forEach(record => {
        const base = record.time_series[baseYear] || 0
        const forecast = record.time_series[forecastYear] || 0
        forecastValue += forecast
        baseValue += base
      })
      
      // Calculate market share based on base year values
      const marketShare2024 = totalMarketValue2024 > 0 ? (baseValue / totalMarketValue2024) * 100 : 0
      
      // Use CAGR from JSON if available (prefer aggregated records)
      let calculatedCAGR = 0
      const aggregatedRecord = segmentRecords.find(r => r.is_aggregated && r.cagr)
      if (aggregatedRecord && aggregatedRecord.cagr !== undefined && aggregatedRecord.cagr !== null) {
        // cagr is defined as number in DataRecord, but JSON might have it as string
        const cagrValue = aggregatedRecord.cagr as unknown as number | string
        if (typeof cagrValue === 'string') {
          calculatedCAGR = parseFloat(cagrValue.replace('%', '').trim()) || 0
        } else if (typeof cagrValue === 'number' && !isNaN(cagrValue)) {
          calculatedCAGR = cagrValue
        }
      } else if (baseValue > 0 && forecastValue > 0) {
        // Fallback: Calculate from aggregated values
        const years = forecastYear - baseYear
        if (years > 0) {
          const growthRatio = Math.min(forecastValue / baseValue, 100)
          calculatedCAGR = (Math.pow(growthRatio, 1 / years) - 1) * 100
          calculatedCAGR = Math.min(calculatedCAGR, 100)
        }
      }
      
      const absoluteGrowth = forecastValue - baseValue
      
      if (forecastValue > 0 && baseValue > 0 && !isNaN(marketShare2024) && !isNaN(calculatedCAGR)) {
        segmentData.push({
          segment,
          baseValue,
          forecastValue,
          cagr: Math.max(0, calculatedCAGR),
          marketShare2024,
          absoluteGrowth,
          index
        })
      }
    })
    
    // Find maximum values for index calculations
    const maxCAGR = Math.max(...segmentData.map(d => d.cagr))
    const maxMarketShare2024 = Math.max(...segmentData.map(d => d.marketShare2024))
    const maxAbsoluteGrowth = Math.max(...segmentData.map(d => d.absoluteGrowth))
    
    // Debug: Log all segment data to understand the values
    console.log('Segment Data for Index Calculation:', segmentData.map(d => ({
      segment: d.segment,
      baseValue: d.baseValue.toFixed(2),
      forecastValue: d.forecastValue.toFixed(2),
      marketShare2024: d.marketShare2024.toFixed(2) + '%',
      absoluteGrowth: d.absoluteGrowth.toFixed(2),
      cagr: d.cagr.toFixed(2) + '%',
      growthMultiple: (d.forecastValue / d.baseValue).toFixed(2) + 'x'
    })))
    
    console.log('Max Values:', {
      maxCAGR: maxCAGR.toFixed(2) + '%',
      maxMarketShare2024: maxMarketShare2024.toFixed(2) + '%',
      maxAbsoluteGrowth: maxAbsoluteGrowth.toFixed(2)
    })
    
    // Check correlation between market share and absolute growth
    const correlationCheck = segmentData.map(d => ({
      segment: d.segment,
      shareRatio: (d.marketShare2024 / maxMarketShare2024).toFixed(3),
      growthRatio: (d.absoluteGrowth / maxAbsoluteGrowth).toFixed(3),
      difference: Math.abs((d.marketShare2024 / maxMarketShare2024) - (d.absoluteGrowth / maxAbsoluteGrowth)).toFixed(4)
    }))
    
    console.log('Correlation Check (Share vs Growth ratios):', correlationCheck)
    
    // Second pass: Calculate indices and create bubble data
    const bubbles: BubbleDataPoint[] = []
    
    segmentData.forEach(data => {
      // Calculate indices (0-100 scale)
      // Cap all indices at 100 to ensure they never exceed the maximum
      const cagrIndex = maxCAGR > 0 ? Math.min(100, (data.cagr / maxCAGR) * 100) : 0
      const marketShareIndex = maxMarketShare2024 > 0 ? Math.min(100, (data.marketShare2024 / maxMarketShare2024) * 100) : 0
      const incrementalOpportunityIndex = maxAbsoluteGrowth > 0 ? Math.min(100, (data.absoluteGrowth / maxAbsoluteGrowth) * 100) : 0
      
      // Debug each segment's indices
      console.log(`Indices for ${data.segment}:`, {
        marketShare: data.marketShare2024.toFixed(2),
        marketShareIndex: marketShareIndex.toFixed(1),
        absoluteGrowth: data.absoluteGrowth.toFixed(2),
        incrementalOpportunityIndex: incrementalOpportunityIndex.toFixed(1),
        cagr: data.cagr.toFixed(2),
        cagrIndex: cagrIndex.toFixed(1)
      })
      
      bubbles.push({
        name: data.segment,
        x: cagrIndex,                        // Will be overwritten by D3
        y: marketShareIndex,                 // Will be overwritten by D3
        z: incrementalOpportunityIndex,      // Incremental Opportunity Index for bubble size
        radius: 0, // Will be calculated later
        geography: selectedGeography,
        segment: data.segment,
        segmentType: selectedSegmentType,
        currentValue: data.forecastValue,
        cagr: data.cagr,                    // Store actual CAGR for tooltip
        marketShare: data.marketShare2024,   // Store actual market share for tooltip
        absoluteGrowth: data.absoluteGrowth, // Store actual growth for tooltip
        color: getChartColor(data.index % 10),
        // Store index values separately
        xIndex: cagrIndex,                   // CAGR Index (0-100)
        yIndex: marketShareIndex,            // Market Share Index (0-100)
        zIndex: incrementalOpportunityIndex  // Incremental Opportunity Index (0-100)
      })
    })
    
    // Sort by incremental opportunity index for better visualization
    bubbles.sort((a, b) => b.z - a.z)
    
    // Limit bubbles based on slider
    const limitedBubbles = bubbles.slice(0, maxBubbles)

    const xLabel = 'CAGR Index'
    const yLabel = 'Market Share Index (2024)'

    return { bubbles: limitedBubbles, xLabel, yLabel, totalBubbles: bubbles.length }
  }, [data, activeFilters, selectedGeography, selectedSegmentType, maxBubbles, isOpportunityMode])

  // Update dimensions on container resize
  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect()
        setDimensions({ width: Math.max(width, 400), height })
      }
    }

    updateDimensions()
    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [height])

  // D3 chart rendering
  useEffect(() => {
    if (!svgRef.current || chartData.bubbles.length === 0) return

    const margin = { top: 20, right: 20, bottom: 60, left: 60 }
    const width = dimensions.width - margin.left - margin.right
    const height = dimensions.height - margin.top - margin.bottom

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Calculate domains - Now working with 0-100 indices
    const xExtent = d3.extent(chartData.bubbles, d => d.x) as [number, number]
    const yExtent = d3.extent(chartData.bubbles, d => d.y) as [number, number]
    const zExtent = d3.extent(chartData.bubbles, d => d.z) as [number, number]

    // Calculate bubble sizes with tiered sizing (minimum 20% reduction between tiers)
    const maxBubbleRadius = Math.min(width, height) / 8
    const minBubbleRadius = 20
    
    // Sort bubbles by z value (CAGR index) in descending order
    const sortedBubbles = [...chartData.bubbles].sort((a, b) => b.z - a.z)
    
    // Assign tiered sizes with minimum 20% reduction between tiers
    const sizeReductionPercent = 0.20 // 20% reduction per tier
    const tiers: number[] = []
    
    // Calculate tier sizes starting from max radius
    let currentSize = maxBubbleRadius
    const minSize = minBubbleRadius
    
    // Create enough tiers for all bubbles
    while (currentSize >= minSize) {
      tiers.push(currentSize)
      currentSize = currentSize * (1 - sizeReductionPercent)
    }
    
    // Ensure we have at least one tier
    if (tiers.length === 0) {
      tiers.push(maxBubbleRadius)
    }
    
    // Assign sizes based on sorted order (largest z = largest bubble)
    sortedBubbles.forEach((bubble, index) => {
      // Use tier index, but ensure we don't go below minimum
      const tierIndex = Math.min(index, tiers.length - 1)
      bubble.radius = Math.max(tiers[tierIndex], minBubbleRadius)
    })
    
    // Update the original bubbles array with new radii
    // Create a map for quick lookup
    const radiusMap = new Map(sortedBubbles.map(b => [b.name, b.radius]))
    chartData.bubbles.forEach(bubble => {
      bubble.radius = radiusMap.get(bubble.name) || minBubbleRadius
    })
    
    // Log size distribution for debugging
    console.log('🎯 Bubble Size Distribution:', {
      totalBubbles: chartData.bubbles.length,
      maxRadius: maxBubbleRadius.toFixed(1),
      minRadius: minBubbleRadius.toFixed(1),
      tiersCreated: tiers.length,
      top5Sizes: sortedBubbles.slice(0, 5).map(b => ({
        name: b.name,
        zValue: b.z.toFixed(1),
        radius: b.radius.toFixed(1)
      }))
    })

    const maxRadius = Math.max(...chartData.bubbles.map(b => b.radius))
    const padding = maxRadius * 0.8

    // X scale - CAGR Index (0-100)
    const xScale = d3.scaleLinear()
      .domain([0, 110]) // Fixed 0-110 for index (with 10% padding)
      .range([padding, width - padding])

    // Y scale - Market Share Index (0-100)
    const yScale = d3.scaleLinear()
      .domain([0, 110]) // Fixed 0-110 for index (with 10% padding)
      .range([height - padding, padding])

    // Add grid lines
    const xGrid = d3.axisBottom(xScale)
      .tickSize(-height + padding * 2)
      .tickFormat(() => '')

    const yGrid = d3.axisLeft(yScale)
      .tickSize(-width + padding * 2)
      .tickFormat(() => '')

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${height - padding})`)
      .call(xGrid)
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.3)

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(${padding},0)`)
      .call(yGrid)
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.3)

    // Add X axis - CAGR Index
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => `${(d as number).toFixed(0)}`)

    const xAxisGroup = g.append('g')
      .attr('transform', `translate(0,${height - padding})`)
      .call(xAxis)

    // Style X axis tick labels with better visibility
    xAxisGroup.selectAll('text')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#1a1a1a')

    // Add X axis label
    xAxisGroup.append('text')
      .attr('x', width / 2)
      .attr('y', 35)
      .attr('fill', '#000000')
      .style('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '500')
      .text(chartData.xLabel)

    // Add Y axis - Market Share Index
    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => `${(d as number).toFixed(0)}`)

    const yAxisGroup = g.append('g')
      .attr('transform', `translate(${padding},0)`)
      .call(yAxis)

    // Style Y axis tick labels with better visibility
    yAxisGroup.selectAll('text')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#1a1a1a')

    // Add Y axis label
    yAxisGroup.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -height / 2)
      .attr('fill', '#000000')
      .style('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '500')
      .text(chartData.yLabel)

    // Create force simulation - use xIndex and yIndex for positioning
    const simulation = d3.forceSimulation(chartData.bubbles as any)
      .force('x', d3.forceX<BubbleDataPoint>(d => xScale(d.xIndex)).strength(1))
      .force('y', d3.forceY<BubbleDataPoint>(d => yScale(d.yIndex)).strength(1))
      .force('collide', d3.forceCollide<BubbleDataPoint>(d => d.radius + 3))
      .stop()

    // Run simulation
    for (let i = 0; i < 120; ++i) {
      simulation.tick()
      
      chartData.bubbles.forEach((d: any) => {
        d.x = Math.max(xScale.range()[0] + d.radius, 
              Math.min(xScale.range()[1] - d.radius, d.x))
        d.y = Math.max(yScale.range()[1] + d.radius,
              Math.min(yScale.range()[0] - d.radius, d.y))
      })
    }

    // Add bubbles
    const bubbles = g.append('g')
      .selectAll('circle')
      .data(chartData.bubbles)
      .enter()
      .append('circle')
      .attr('cx', d => (d as any).x || xScale(d.xIndex))
      .attr('cy', d => (d as any).y || yScale(d.yIndex))
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('fill-opacity', 0.7)
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('fill-opacity', 0.9)
          .attr('stroke-width', 3)

        setTooltipData(d)
        const [mouseX, mouseY] = d3.pointer(event, svg.node())
        setTooltipPosition({ x: mouseX, y: mouseY })
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('fill-opacity', 0.7)
          .attr('stroke-width', 2)

        setTooltipData(null)
      })

    // Add labels for larger bubbles
    const labels = g.append('g')
      .selectAll('text')
      .data(chartData.bubbles.filter(d => d.radius > 25))
      .enter()
      .append('text')
      .attr('x', d => (d as any).x || xScale(d.x))
      .attr('y', d => (d as any).y || yScale(d.y))
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text(d => d.name.length > 15 ? d.name.substring(0, 12) + '...' : d.name)

    // Add legend note
    svg.append('text')
      .attr('x', dimensions.width / 2)
      .attr('y', dimensions.height - 5)
      .style('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', '#000000')
      .style('font-style', 'italic')
      .text(`Bubble size represents 2032 market size in ${selectedGeography} | All values projected to 2032`)

  }, [chartData, dimensions, selectedGeography])

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center max-w-md px-4">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-lg font-semibold text-black mb-2">Loading data...</p>
          <p className="text-sm text-gray-600">Please wait while we load the dashboard data.</p>
        </div>
      </div>
    )
  }

  // Show error message if chart can't render
  if (errorMessage && isOpportunityMode) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg border-2 border-red-200">
        <div className="text-center max-w-2xl px-6">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-red-800 mb-3">Opportunity Matrix Error</h3>
          <p className="text-base text-red-700 mb-4">{errorMessage}</p>
          {debugInfo && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm font-semibold text-red-600 hover:text-red-800 mb-2">
                Debug Information (Click to expand)
              </summary>
              <div className="bg-white p-4 rounded border border-red-200 max-h-64 overflow-y-auto">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            </details>
          )}
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-semibold mb-2">Troubleshooting steps:</p>
            <ul className="list-disc list-inside space-y-1 text-left max-w-md mx-auto">
              <li>Check if data is loaded correctly</li>
              <li>Try selecting different geographies</li>
              <li>Try selecting different segment types</li>
              <li>Try changing the aggregation level</li>
              <li>Check the browser console for detailed logs</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // Show message if no bubbles but no error (edge case)
  if (chartData.bubbles.length === 0 && !errorMessage) {
    return (
      <div className="flex items-center justify-center h-96 bg-yellow-50 rounded-lg border-2 border-yellow-200">
        <div className="text-center max-w-md px-4">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Data to Display</h3>
          <p className="text-sm text-yellow-700 mb-4">
            The Opportunity Matrix has no data to display with the current filters.
          </p>
          <p className="text-xs text-yellow-600">
            Try adjusting your filters or check the console for more details.
          </p>
        </div>
      </div>
    )
  }

  const selectedCurrency = currency || data.metadata.currency || 'USD'
  const isINR = selectedCurrency === 'INR'
  const currencySymbol = isINR ? '₹' : '$'
  const unitText = isINR ? '' : (data.metadata.value_unit || 'Million')
  
  const unit = filters.dataType === 'value'
    ? isINR 
      ? currencySymbol
      : `${selectedCurrency} ${unitText}`
    : data.metadata.volume_unit

  return (
    <div className="w-full min-w-0 overflow-hidden" ref={containerRef}>
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-black">{title}</h3>
      )}
      
      {/* Filters - Same as Market Analysis */}
      <div className="mb-4 space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Geography Filter */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Geography
            </label>
            {isOpportunityMode ? (
              <OpportunityGeographyMultiSelect />
            ) : (
              <GeographyMultiSelect />
            )}
          </div>
          
          {/* Product Type (Segment Type) - Use store filters */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              {isOpportunityMode ? 'Product Type' : 'Segment Type'}
            </label>
            <select
              value={activeFilters.segmentType || ''}
              onChange={(e) => {
                const newSegmentType = e.target.value
                // Clear cascade path and selected segments when segment type changes
                if (isOpportunityMode) {
                  setCascadePath([])
                  setSelectedSegments([])
                  updateActiveFilters({ 
                    segmentType: newSegmentType,
                    segments: [],
                    advancedSegments: []
                  } as any)
                } else {
                  updateActiveFilters({ segmentType: newSegmentType })
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-black"
            >
              {isOpportunityMode && (
                <option value="">All Product Types</option>
              )}
              {data?.dimensions?.segments ? Object.keys(data.dimensions.segments).map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              )) : null}
            </select>
          </div>
        </div>
        
        {/* Data Type - Only for opportunity mode */}
        {isOpportunityMode && (
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Data Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateActiveFilters({ dataType: 'value' })}
                className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                  activeFilters.dataType === 'value'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-black hover:bg-gray-200'
                }`}
              >
                Value
              </button>
              <button
                onClick={() => updateActiveFilters({ dataType: 'volume' })}
                className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                  activeFilters.dataType === 'volume'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-black hover:bg-gray-200'
                }`}
              >
                Volume
              </button>
            </div>
          </div>
        )}
        
        {/* Business Type Filter - Only for opportunity mode with B2B/B2C segmentation */}
        {isOpportunityMode && hasB2BSegmentation && (
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Business Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateActiveFilters({ businessType: 'B2B', segments: [], advancedSegments: [] } as any)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeFilters.businessType === 'B2B'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-black hover:bg-gray-200'
                }`}
              >
                B2B
              </button>
              <button
                onClick={() => updateActiveFilters({ businessType: 'B2C', segments: [], advancedSegments: [] } as any)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeFilters.businessType === 'B2C'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-black hover:bg-gray-200'
                }`}
              >
                B2C
              </button>
            </div>
          </div>
        )}
        
        {/* Cascade Filter - Only for opportunity mode when segment type is selected and has hierarchy */}
        {isOpportunityMode && selectedSegmentType && selectedSegmentType !== '' && Object.keys(hierarchy).length > 0 && (
          <div>
            <label className="block text-sm font-medium text-black mb-2 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Segment Selection (Cascade)
            </label>
            <CascadeFilter
              hierarchy={hierarchy}
              selectedPath={cascadePath}
              onSelectionChange={handleCascadeSelection}
              maxLevels={5}
              placeholder="Select Level 1..."
            />
            
            {/* Add Button - Only show if a path is selected */}
            {cascadePath.length > 0 && (
              <button
                onClick={handleAddSegment}
                className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Selected Segment</span>
              </button>
            )}
            
            {/* Selected Segments Display */}
            {selectedSegments.length > 0 && (
              <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center text-xs font-medium text-blue-900">
                    <Tag className="h-3 w-3 mr-1" />
                    Selected Segments ({selectedSegments.length})
                  </div>
                  <button
                    onClick={handleClearAllSegments}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedSegments.map(seg => (
                    <span
                      key={seg.id}
                      className="inline-flex items-center px-2 py-1 text-xs bg-white text-blue-800 rounded border border-blue-200"
                    >
                      {seg.segment}
                      <button
                        onClick={() => handleRemoveSegment(seg.id)}
                        className="ml-1 hover:text-blue-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Aggregation Level Selector - Hidden from UI but logic preserved in backend */}
        {/* <div>
          {isOpportunityMode ? (
            <OpportunityAggregationLevelSelector />
          ) : (
            <AggregationLevelSelector />
          )}
        </div> */}
        
        {/* Bubble Count Slider */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Maximum Bubbles to Display: {maxBubbles}
          </label>
          <input
            type="range"
            min="10"
            max="200"
            step="10"
            value={maxBubbles}
            onChange={(e) => setMaxBubbles(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-black mt-1">
            <span>10</span>
            <span>200</span>
          </div>
          {chartData.totalBubbles && chartData.totalBubbles > maxBubbles && (
            <p className="text-xs text-amber-600 mt-1">
              Showing {maxBubbles} of {chartData.totalBubbles} bubbles. Increase slider to see more.
            </p>
          )}
        </div>
      </div>

      <div className="relative">
        <svg ref={svgRef} className="w-full" />
        
        {/* Custom Tooltip */}
        {tooltipData && (
          <div
            className="absolute bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-[280px] z-50 pointer-events-none"
            style={{
              left: `${tooltipPosition.x + 10}px`,
              top: `${tooltipPosition.y - 10}px`,
              transform: tooltipPosition.x > dimensions.width / 2 ? 'translateX(-100%)' : 'none'
            }}
          >
            <p className="font-semibold text-black mb-3 pb-2 border-b border-gray-200">
              {tooltipData.name}
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-black">Geography:</span>
                <span className="text-sm font-medium text-black">
                  {tooltipData.geography}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-black">Segment Type:</span>
                <span className="text-sm font-medium text-black">
                  {tooltipData.segmentType}
                </span>
              </div>
              
              {/* Index Values Section */}
              <div className="pt-2 mt-2 border-t border-gray-200">
                <p className="text-xs font-semibold text-black mb-2">INDEX VALUES</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black">CAGR Index:</span>
                  <span className="text-sm font-bold text-purple-600">
                    {tooltipData.xIndex.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black">Market Share Index (2024):</span>
                  <span className="text-sm font-bold text-purple-600">
                    {tooltipData.yIndex.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black">Incremental Opportunity Index:</span>
                  <span className="text-sm font-bold text-purple-600">
                    {tooltipData.zIndex.toFixed(1)}
                  </span>
                </div>
              </div>
              
              {/* Actual Values Section */}
              <div className="pt-2 mt-2 border-t border-gray-200">
                <p className="text-xs font-semibold text-black mb-2">ACTUAL VALUES</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black">Market Size (2032):</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-black">
                      {tooltipData.currentValue.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </span>
                    <span className="text-xs text-black ml-1">{unit}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black">Market Share (2024):</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {tooltipData.marketShare.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black">CAGR (2024-2032):</span>
                  <span className={`text-sm font-semibold ${
                    tooltipData.cagr > 0 ? 'text-green-600' : tooltipData.cagr < 0 ? 'text-red-600' : 'text-black'
                  }`}>
                    {tooltipData.cagr > 0 ? '+' : ''}{tooltipData.cagr.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black">Growth (2024-2032):</span>
                  <span className={`text-sm font-semibold ${
                    tooltipData.absoluteGrowth > 0 ? 'text-green-600' : tooltipData.absoluteGrowth < 0 ? 'text-red-600' : 'text-black'
                  }`}>
                    {tooltipData.absoluteGrowth > 0 ? '+' : ''}
                    {tooltipData.absoluteGrowth.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })} {unit}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-black mb-3">Chart Dimensions (Index Scale 0-100)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-xs">X</span>
              </div>
              <div>
                <p className="text-sm font-medium text-black">CAGR Index</p>
                <p className="text-xs text-black">
                  {isOpportunityMode 
                    ? 'CAGR from JSON (attractiveness indicator)'
                    : 'Growth rate relative to max'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold text-xs">Y</span>
              </div>
              <div>
                <p className="text-sm font-medium text-black">
                  {isOpportunityMode ? 'Market Size Index' : 'Market Share Index (2024)'}
                </p>
                <p className="text-xs text-black">
                  {isOpportunityMode 
                    ? 'Market size relative to max'
                    : 'Current position relative to leader'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold text-xs">S</span>
              </div>
              <div>
                <p className="text-sm font-medium text-black">
                  {isOpportunityMode ? 'CAGR Index (Size)' : 'Incremental Opportunity Index'}
                </p>
                <p className="text-xs text-black">
                  {isOpportunityMode 
                    ? 'Bubble size represents CAGR attractiveness'
                    : 'Absolute growth potential (bubble size)'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-black">
            {isOpportunityMode ? (
              <>
                Showing {chartData.bubbles.length} geography × product type combinations
                {chartData.totalBubbles && chartData.totalBubbles > chartData.bubbles.length && ` (${chartData.totalBubbles} total available)`}
              </>
            ) : (
              <>
                Showing {chartData.bubbles.length} {selectedSegmentType} segments in {selectedGeography}
                {chartData.totalBubbles && chartData.totalBubbles > chartData.bubbles.length && ` (${chartData.totalBubbles} total available)`}
              </>
            )}
          </p>
          <p className="text-xs text-black mt-1">
            {isOpportunityMode 
              ? 'Attractiveness matrix: Geography × Product Type. CAGR values from JSON aggregations. Use aggregation level to view CAGR at different hierarchy levels.'
              : 'Hover over bubbles for detailed metrics'}
          </p>
        </div>
      </div>
    </div>
  )
}
