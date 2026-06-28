import type { DataRecord, FilterState, ChartDataPoint, HeatmapCell, ComparisonTableRow } from './types'

/**
 * Automatically determine the appropriate aggregation level based on selected segments
 * This hides the complexity from users - they just select segments, we figure out the level
 */
export function determineAggregationLevel(
  records: DataRecord[],
  selectedSegments: string[],
  segmentType: string
): number | null {
  if (selectedSegments.length === 0) {
    // No segments selected - show leaf level (most granular)
    return null // null means "show all levels, prefer leaf records"
  }

  // Analyze the hierarchy depth of selected segments
  const selectedRecords = records.filter(r => 
    r.segment_type === segmentType && 
    selectedSegments.includes(r.segment)
  )

  if (selectedRecords.length === 0) {
    return null
  }

  // Check if selected segments are all at the same level
  const levels = new Set(selectedRecords.map(r => r.aggregation_level))
  const aggregatedLevels = selectedRecords
    .filter(r => r.is_aggregated)
    .map(r => r.aggregation_level)

  // If all selected segments have aggregated records at the same level, use that
  if (aggregatedLevels.length > 0) {
    const mostCommonLevel = aggregatedLevels.reduce((a, b, _, arr) =>
      arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
    )
    return mostCommonLevel ?? null
  }

  // Otherwise, determine level based on hierarchy depth
  // Find the deepest level that contains all selected segments
  const levelsArray = Array.from(levels).filter((l): l is number => l !== null && l !== undefined)
  const maxDepth = levelsArray.length > 0 ? Math.max(...levelsArray) : 0
  
  // If segments are at different levels, prefer showing leaf records (null)
  // This allows mixing levels in one view
  if (levels.size > 1) {
    return null // Show all levels together
  }

  return maxDepth
}

/**
 * Filter data records based on current filter state
 * Now with automatic aggregation level detection
 */
export function filterData(
  data: DataRecord[],
  filters: FilterState & { advancedSegments?: any[] }
): DataRecord[] {
  // AUTOMATIC LEVEL DETECTION: Determine level based on selected segments
  // Hide aggregation level complexity from users
  let effectiveAggregationLevel = filters.aggregationLevel
  
  // If aggregationLevel is explicitly set to null or undefined, use automatic detection
  if (effectiveAggregationLevel === null || effectiveAggregationLevel === undefined) {
    const selectedSegments = filters.segments || []
    if (selectedSegments.length > 0) {
      effectiveAggregationLevel = determineAggregationLevel(
        data,
        selectedSegments,
        filters.segmentType
      )
    }
  }
  
  console.log('🔍 filterData called with aggregationLevel:', filters.aggregationLevel, 'effectiveLevel:', effectiveAggregationLevel)
  console.log('🔍 Total records:', data.length)
  if (effectiveAggregationLevel !== null && effectiveAggregationLevel !== undefined) {
    const recordsAtLevel = data.filter(r => r.aggregation_level === effectiveAggregationLevel)
    const leafRecordsAtLevel = data.filter(r => r.is_aggregated === false && r.aggregation_level === effectiveAggregationLevel)
    console.log(`🔍 Records at level ${effectiveAggregationLevel}:`, {
      total: recordsAtLevel.length,
      aggregated: recordsAtLevel.filter(r => r.is_aggregated === true).length,
      leaf: leafRecordsAtLevel.length,
      sample: recordsAtLevel.slice(0, 3).map(r => ({
        geo: r.geography,
        segment: r.segment,
        level: r.aggregation_level,
        isAgg: r.is_aggregated,
        hierarchy: r.segment_hierarchy
      }))
    })
  }
  
  const filtered = data.filter((record) => {
    // 1. Geography filter - must match first
    const geoMatch = filters.geographies.length === 0 ||
      filters.geographies.includes(record.geography)
    
    if (!geoMatch) {
      return false
    }
    
    // 2. Aggregation level filter - CRITICAL: Prevent double-counting
    // Use effectiveAggregationLevel (automatically determined or user-selected)
    // BUT: In geography-mode, skip this check - we want ALL records for the geography
    // and will handle aggregation in prepareIntelligentMultiLevelData
    if (filters.viewMode === 'geography-mode') {
      // Skip aggregation level filtering in geography-mode
      // We'll handle record selection in prepareIntelligentMultiLevelData
    } else if (effectiveAggregationLevel !== undefined && effectiveAggregationLevel !== null) {
      // When a specific level is selected, show records at that level
      const recordLevel = record.aggregation_level
      
      // Direct match: record is at the selected level (aggregated record at that level)
      if (recordLevel === effectiveAggregationLevel) {
        // Allow it through - this is an aggregated record at the selected level
      } else if (record.is_aggregated === false) {
        // For leaf records, check if their hierarchy has a segment at the selected level
        // This allows leaf records to be shown when filtering by parent levels
        // Level 2 -> check if level_1 exists, Level 3 -> check if level_2 exists, etc.
        const hierarchy = record.segment_hierarchy
        let hasSegmentAtLevel = false
        
        // The hierarchy level index is (aggregationLevel - 1) because:
        // - Level 2 aggregates by level_1 (first segment)
        // - Level 3 aggregates by level_2 (second segment)
        // - etc.
        const hierarchyLevelIndex = effectiveAggregationLevel - 1
        
        if (effectiveAggregationLevel === 2 && hierarchy.level_1 && hierarchy.level_1.trim() !== '') {
          hasSegmentAtLevel = true
        } else if (effectiveAggregationLevel === 3 && hierarchy.level_2 && hierarchy.level_2.trim() !== '') {
          hasSegmentAtLevel = true
        } else if (effectiveAggregationLevel === 4 && hierarchy.level_3 && hierarchy.level_3.trim() !== '') {
          hasSegmentAtLevel = true
        } else if (effectiveAggregationLevel === 5 && hierarchy.level_4 && hierarchy.level_4.trim() !== '') {
          hasSegmentAtLevel = true
        } else if (effectiveAggregationLevel === 6 && hierarchy.level_5 && hierarchy.level_5.trim() !== '') {
          hasSegmentAtLevel = true
        }
        
        // If the leaf record doesn't have a segment at the selected level, exclude it
        if (!hasSegmentAtLevel) {
          return false
        }
      } else {
        // Record is aggregated but not at the selected level - exclude it
        return false
      }
    } else {
      // When aggregationLevel is null (showing "All Levels"), prevent double-counting
      // Strategy:
      // - If segments are selected: Allow aggregated records that match selected segments
      // - If no segments selected in geography-mode: Show Level 1 aggregated records (totals)
      // - If no segments selected in segment-mode: Only show leaf records (to avoid double-counting)
      const hasSegmentFilter = (filters.advancedSegments && filters.advancedSegments.length > 0) ||
                               (filters.segments && filters.segments.length > 0)

      if (record.is_aggregated === true) {
        // Handle aggregated records to prevent double-counting
        // Note: geography-mode is handled at line 111 and skips this block entirely
        if (!hasSegmentFilter) {
          // No segments selected - exclude aggregated records to prevent double-counting
          return false
        } else {
          // Segments are selected - check if this aggregated record matches a selected segment
          let matchesSelectedSegment = false

          if (filters.advancedSegments && filters.advancedSegments.length > 0) {
            matchesSelectedSegment = filters.advancedSegments.some(seg =>
              seg.type === record.segment_type && seg.segment === record.segment
            )
          } else if (filters.segments && filters.segments.length > 0) {
            matchesSelectedSegment = filters.segments.includes(record.segment)
          }

          // Only include aggregated record if it matches a selected segment
          if (!matchesSelectedSegment) {
            return false
          }
        }
      } else {
        // This is a leaf record
        // If segments are selected and this leaf's parent segment is selected,
        // we need to check if an aggregated record for that parent exists
        // For now, include all leaf records - the segment filter will handle matching
        // (The segment filter already checks hierarchy, so it will match correctly)
      }
    }
    
    // 3. Segment type filter - must match (but relaxed in geography-mode)
    // In geography-mode, we want to show geography totals regardless of segment type
    // This allows users to see total market value per geography without being restricted to one segment type
    if (filters.viewMode === 'geography-mode') {
      // In geography-mode, accept records from ANY segment type
      // This gives us the complete picture for each geography
      // We'll aggregate across all segment types in prepareIntelligentMultiLevelData
    } else {
      // In other modes, require segment type to match
      const segTypeMatch = record.segment_type === filters.segmentType
      if (!segTypeMatch) {
        return false
      }
    }
    
    // 4. Business type filter - only apply if the record actually has B2B/B2C in its hierarchy
    let businessTypeMatch = true
    const recordBusinessType = record.segment_hierarchy?.level_1
    if (recordBusinessType === 'B2B' || recordBusinessType === 'B2C') {
      businessTypeMatch = recordBusinessType === filters.businessType
    }
    
    if (!businessTypeMatch) {
      return false
    }
    
    // 5. Segment filter - handle both advancedSegments and regular segments
    let segmentMatch = true
    
    // Check if we're using advancedSegments (multi-type selection)
    if (filters.advancedSegments && filters.advancedSegments.length > 0) {
      // Special case: Level 1 uses '__ALL_SEGMENTS__' marker
      if (effectiveAggregationLevel === 1) {
        // Level 1 represents all segments aggregated - don't filter by individual segments
        segmentMatch = true
      } else if (filters.viewMode === 'geography-mode') {
        // In geography-mode, allow all records through - we aggregate by geography
        segmentMatch = true
      } else {
        // Check if this record matches any of the selected segment+type combinations
        segmentMatch = filters.advancedSegments.some(seg => {
          if (seg.type !== record.segment_type) {
            return false
          }
          
          // Direct match - exact segment name
          if (seg.segment === record.segment) {
            return true
          }
          
          // When aggregation level is set, we should still check hierarchy
          // because the selected segment might be at a different level than the record's segment
          // For example: User selects Level 2 and "Home Furnishing"
          // Record might be a Level 2 record with segment="Home Furnishing" (direct match above)
          // OR it might be a leaf record where "Home Furnishing" is in the hierarchy
          if (effectiveAggregationLevel !== null) {
            // When a specific level is selected, check if the selected segment matches
            // the segment at that level in the record's hierarchy
            const hierarchy = record.segment_hierarchy
            
            // For Level 2, check level_1 (first segment level)
            // For Level 3, check level_2 (second segment level)
            // etc.
            if (effectiveAggregationLevel === 2 && hierarchy.level_1 === seg.segment) {
              return true
            }
            if (effectiveAggregationLevel === 3 && hierarchy.level_2 === seg.segment) {
              return true
            }
            if (effectiveAggregationLevel === 4 && hierarchy.level_3 === seg.segment) {
              return true
            }
            if (effectiveAggregationLevel === 5 && hierarchy.level_4 === seg.segment) {
              return true
            }
            if (effectiveAggregationLevel === 6 && hierarchy.level_5 === seg.segment) {
              return true
            }
          }
          
          // If aggregation level is null, check if the selected segment exists in the record's hierarchy
          // This handles cases where user selects a parent segment but aggregationLevel is not set
          if (effectiveAggregationLevel === null) {
            const hierarchy = record.segment_hierarchy
            // Check if the selected segment is at any level in this record's hierarchy
            return (
              hierarchy.level_1 === seg.segment ||
              hierarchy.level_2 === seg.segment ||
              hierarchy.level_3 === seg.segment ||
              hierarchy.level_4 === seg.segment ||
              (hierarchy.level_5 && hierarchy.level_5 === seg.segment)
            )
          }
          
          return false
        })
      }
    } else {
      // Regular segment filter (single-type selection)
      if (effectiveAggregationLevel === 1) {
        // Level 1 represents all segments aggregated - don't filter by individual segments
        segmentMatch = true
      } else if (filters.viewMode === 'geography-mode') {
        // In geography-mode, allow all records through - we aggregate by geography
        segmentMatch = true
      } else if (filters.segments.length === 0) {
        // No segments selected - include all
        segmentMatch = true
      } else {
        // Check if any selected segment matches
        segmentMatch = filters.segments.some(selectedSegment => {
          // Direct match
          if (selectedSegment === record.segment) {
            return true
          }
          
          // If aggregation level is null, check if the selected segment exists in the record's hierarchy
          // This handles cases where user selects a parent segment but aggregationLevel is not set
          if (effectiveAggregationLevel === null) {
            const hierarchy = record.segment_hierarchy
            // Check if the selected segment is at any level in this record's hierarchy
            return (
              hierarchy.level_1 === selectedSegment ||
              hierarchy.level_2 === selectedSegment ||
              hierarchy.level_3 === selectedSegment ||
              hierarchy.level_4 === selectedSegment ||
              (hierarchy.level_5 && hierarchy.level_5 === selectedSegment)
            )
          }
          
          return false
        })
      }
    }
    
    return segmentMatch
  })
  
  // Enhanced debug logging
  if (typeof window !== 'undefined') {
    const sampleRecord = data[0]
    if (sampleRecord) {
      const geoMatch = filters.geographies.length === 0 || filters.geographies.includes(sampleRecord.geography)
      const segTypeMatch = sampleRecord.segment_type === filters.segmentType
      const levelMatch = effectiveAggregationLevel === null || sampleRecord.aggregation_level === effectiveAggregationLevel
      
      // Check segment match
      let segmentMatchCheck = true
      if (filters.advancedSegments && filters.advancedSegments.length > 0) {
        if (effectiveAggregationLevel === 1) {
          segmentMatchCheck = true
        } else {
          segmentMatchCheck = filters.advancedSegments.some(seg => 
            seg.type === sampleRecord.segment_type && seg.segment === sampleRecord.segment
          )
        }
      } else {
        if (effectiveAggregationLevel === 1) {
          segmentMatchCheck = true
        } else {
          segmentMatchCheck = filters.segments.length === 0 || filters.segments.includes(sampleRecord.segment)
        }
      }
      
      console.log('🔍 Filter Debug:', {
        totalRecords: data.length,
        filteredRecords: filtered.length,
        filters: {
          geographies: filters.geographies,
          segments: filters.segments,
          segmentType: filters.segmentType,
          aggregationLevel: filters.aggregationLevel,
          advancedSegments: filters.advancedSegments?.map(s => ({ type: s.type, segment: s.segment }))
        },
        sampleRecord: {
          geography: sampleRecord.geography,
          segment: sampleRecord.segment,
          segment_type: sampleRecord.segment_type,
          aggregation_level: sampleRecord.aggregation_level,
          is_aggregated: sampleRecord.is_aggregated
        },
        sampleRecordMatches: {
          geoMatch,
          segTypeMatch,
          levelMatch,
          segmentMatch: segmentMatchCheck
        },
        // Show records at selected level
        recordsAtSelectedLevel: effectiveAggregationLevel !== null 
          ? data
              .filter(r => {
                // First check aggregation level
                if (r.aggregation_level !== effectiveAggregationLevel) {
                  return false
                }
                // Then check segment type
                if (r.segment_type !== filters.segmentType) {
                  return false
                }
                // Then check geography if selected
                if (filters.geographies.length > 0 && !filters.geographies.includes(r.geography)) {
                  return false
                }
                return true
              })
              .slice(0, 10)
              .map(r => ({
                geography: r.geography,
                segment: r.segment,
                segment_type: r.segment_type,
                aggregation_level: r.aggregation_level
              }))
          : [],
        // Show records matching geography and segment type
        recordsMatchingGeoAndType: data
          .filter(r => 
            (filters.geographies.length === 0 || filters.geographies.includes(r.geography)) &&
            r.segment_type === filters.segmentType
          )
          .slice(0, 10)
          .map(r => ({
            geography: r.geography,
            segment: r.segment,
            aggregation_level: r.aggregation_level
          }))
      })
    }
    
    // Additional debug: Log first few records that match aggregation level
    if (effectiveAggregationLevel !== null) {
      const matchingLevelRecords = data.filter(r => 
        r.aggregation_level === effectiveAggregationLevel &&
        r.segment_type === filters.segmentType &&
        (filters.geographies.length === 0 || filters.geographies.includes(r.geography))
      ).slice(0, 5)
      
      console.log('🔍 Records at selected level:', {
        level: effectiveAggregationLevel,
        count: matchingLevelRecords.length,
        samples: matchingLevelRecords.map(r => ({
          geo: r.geography,
          segment: r.segment,
          segType: r.segment_type,
          level: r.aggregation_level
        })),
        selectedSegments: filters.advancedSegments?.map(s => s.segment) || filters.segments
      })
    }
    
    // Enhanced debug for Level 1
    if (effectiveAggregationLevel === 1) {
      console.log('🔍 Level 1 Filter Debug:', {
        totalRecords: data.length,
        filteredRecords: filtered.length,
        filters: {
          geographies: filters.geographies,
          segmentType: filters.segmentType,
          aggregationLevel: effectiveAggregationLevel
        },
        filteredRecordsDetails: filtered.slice(0, 5).map(r => ({
          geo: r.geography,
          segment: r.segment,
          level: r.aggregation_level,
          isAggregated: r.is_aggregated
        })),
        allLevel1Records: data.filter(r => r.aggregation_level === 1).length,
        level1WithCorrectSegmentType: data.filter(r => 
          r.aggregation_level === 1 && r.segment_type === filters.segmentType
        ).length
      })
    }
  }
  
  return filtered
}

/**
 * Prepare data for grouped bar chart (Recharts format) with stacking support
 */
export function prepareGroupedBarData(
  records: DataRecord[],
  filters: FilterState & { advancedSegments?: any[] }
): ChartDataPoint[] {
  const { yearRange, viewMode, geographies, segments, aggregationLevel } = filters
  const [startYear, endYear] = yearRange
  
  // Generate year range
  const years: number[] = []
  for (let year = startYear; year <= endYear; year++) {
    years.push(year)
  }
  
  // Special handling for Level 1: Show total aggregation, not individual segments
  // When Level 1 is selected, all records should have segment === '__ALL_SEGMENTS__'
  // We should group by geography (or show a single total) instead of by segment
  const isLevel1 = aggregationLevel === 1
  
  // Determine if we need stacked bars
  const needsStacking = (viewMode === 'segment-mode' && geographies.length > 1) ||
                        (viewMode === 'geography-mode' && segments.length > 1)
  
  // Transform into Recharts format
  return years.map(year => {
    const dataPoint: ChartDataPoint = { year }
    
    // Special case: Level 1 aggregation
    if (isLevel1) {
      // For Level 1, group by geography (or show single total)
      // All records have segment === '__ALL_SEGMENTS__', so grouping by segment makes no sense
      const aggregatedData: Record<string, number> = {}
      
      records.forEach(record => {
        // Group by geography for Level 1
        const key = record.geography
        if (!aggregatedData[key]) {
          aggregatedData[key] = 0
        }
        aggregatedData[key] += record.time_series[year] || 0
      })
      
      Object.entries(aggregatedData).forEach(([key, value]) => {
        dataPoint[key] = value
      })
      
      return dataPoint
    }
    
    if (needsStacking) {
      // Stacked bar chart logic
      if (viewMode === 'segment-mode') {
        // Stack geographies within each segment bar
        // Primary grouping: segments (each becomes a bar)
        // Secondary grouping: geographies (stacked within each bar)
        
        // When aggregationLevel is null, prevent double-counting by preferring aggregated records
        const segmentAggregatedMap = new Map<string, Set<string>>() // segment -> set of geographies with aggregated records
        if (aggregationLevel === null) {
          records.forEach(record => {
            if (record.is_aggregated === true) {
              if (!segmentAggregatedMap.has(record.segment)) {
                segmentAggregatedMap.set(record.segment, new Set())
              }
              segmentAggregatedMap.get(record.segment)!.add(record.geography)
            }
          })
        }
        
        const segmentMap = new Map<string, Map<string, number>>()
    
    records.forEach(record => {
          const segment = record.segment
          const geography = record.geography
          
          // Prevent double-counting: if this segment+geography has an aggregated record, skip leaf records
          if (aggregationLevel === null && segmentAggregatedMap.has(segment)) {
            const geoSet = segmentAggregatedMap.get(segment)!
            if (geoSet.has(geography) && record.is_aggregated === false) {
              return // Skip this leaf record, use the aggregated one instead
            }
          }
          
          if (!segmentMap.has(segment)) {
            segmentMap.set(segment, new Map())
          }
          
          const geoMap = segmentMap.get(segment)!
          const currentValue = geoMap.get(geography) || 0
          const recordValue = record.time_series[year] || 0
          geoMap.set(geography, currentValue + recordValue)
        })
        
        // Create stacked data keys: segment_geography
        segmentMap.forEach((geoMap, segment) => {
          geoMap.forEach((value, geography) => {
            const key = `${segment}::${geography}`
            dataPoint[key] = value
          })
        })
        
      } else if (viewMode === 'geography-mode') {
        // Stack segments within each geography bar
        // Primary grouping: geographies (each becomes a bar)
        // Secondary grouping: segments (stacked within each bar)
        
        // When aggregationLevel is null, prevent double-counting by preferring aggregated records
        const geoSegmentAggregatedMap = new Map<string, Set<string>>() // geography -> set of segments with aggregated records
        if (aggregationLevel === null) {
          records.forEach(record => {
            if (record.is_aggregated === true) {
              if (!geoSegmentAggregatedMap.has(record.geography)) {
                geoSegmentAggregatedMap.set(record.geography, new Set())
              }
              geoSegmentAggregatedMap.get(record.geography)!.add(record.segment)
            }
          })
        }
        
        const geoMap = new Map<string, Map<string, number>>()
        
        records.forEach(record => {
          const geography = record.geography
          const segment = record.segment
          
          // Prevent double-counting: if this geography+segment has an aggregated record, skip leaf records
          if (aggregationLevel === null && geoSegmentAggregatedMap.has(geography)) {
            const segmentSet = geoSegmentAggregatedMap.get(geography)!
            if (segmentSet.has(segment) && record.is_aggregated === false) {
              return // Skip this leaf record, use the aggregated one instead
            }
          }
          
          if (!geoMap.has(geography)) {
            geoMap.set(geography, new Map())
          }
          
          const segmentMap = geoMap.get(geography)!
          const currentValue = segmentMap.get(segment) || 0
          const recordValue = record.time_series[year] || 0
          segmentMap.set(segment, currentValue + recordValue)
          })
          
        // Create stacked data keys: geography_segment
        geoMap.forEach((segmentMap, geography) => {
          segmentMap.forEach((value, segment) => {
            const key = `${geography}::${segment}`
            dataPoint[key] = value
          })
        })
          }
        } else {
      // Original non-stacked logic
      const aggregatedData: Record<string, number> = {}
      
      // When aggregationLevel is null and grouping by segment, prevent double-counting
      // by preferring aggregated records over leaf records for the same segment
      const segmentAggregatedMap = new Map<string, boolean>()
      if (aggregationLevel === null && viewMode === 'segment-mode') {
        // First pass: identify which segments have aggregated records
        records.forEach(record => {
          if (record.is_aggregated === true) {
            segmentAggregatedMap.set(record.segment, true)
          }
        })
      }
      
      records.forEach(record => {
        let key: string
        
        // For Level 1, always group by geography (total aggregation per geography)
        if (isLevel1) {
          key = record.geography
        } else if (viewMode === 'segment-mode') {
          key = record.segment
          
          // Prevent double-counting: if this segment has an aggregated record, skip leaf records
          if (aggregationLevel === null && segmentAggregatedMap.has(key) && record.is_aggregated === false) {
            return // Skip this leaf record, use the aggregated one instead
          }
        } else if (viewMode === 'geography-mode') {
          key = record.geography
        } else if (viewMode === 'matrix') {
          key = `${record.geography}::${record.segment}`
        } else {
          key = record.geography
        }
        
        if (!aggregatedData[key]) {
          aggregatedData[key] = 0
        }
        aggregatedData[key] += record.time_series[year] || 0
      })
      
      Object.entries(aggregatedData).forEach(([key, value]) => {
        dataPoint[key] = value
      })
    }
    
    return dataPoint
  })
}

/**
 * Prepare data for line chart (multi-series)
 */
export function prepareLineChartData(
  records: DataRecord[],
  filters: FilterState
): ChartDataPoint[] {
  const { yearRange, viewMode } = filters
  const [startYear, endYear] = yearRange
  
  // Generate year range
  const years: number[] = []
  for (let year = startYear; year <= endYear; year++) {
    years.push(year)
  }
  
  // Transform into Recharts format for line charts
  // Line charts always aggregate data by the primary dimension
  return years.map(year => {
    const dataPoint: ChartDataPoint = { year }
    
    // Group data by the dimension we want to show as lines
    const aggregated = new Map<string, number>()
    
    records.forEach(record => {
      let key: string
      
      if (viewMode === 'segment-mode') {
        // Lines represent segments (aggregate across geographies)
        key = record.segment
      } else if (viewMode === 'geography-mode') {
        // Lines represent geographies (aggregate across segments)
        key = record.geography
      } else if (viewMode === 'matrix') {
        // Lines represent geography-segment combinations
        key = `${record.geography}::${record.segment}`
      } else {
        // Default to geography
        key = record.geography
      }
      
      const currentValue = aggregated.get(key) || 0
      const recordValue = record.time_series[year] || 0
      aggregated.set(key, currentValue + recordValue)
    })
    
    // Add aggregated values to dataPoint
    aggregated.forEach((value, key) => {
      dataPoint[key] = value
    })
    
    return dataPoint
  })
}

/**
 * Prepare data for heatmap
 */
export function prepareHeatmapData(
  records: DataRecord[],
  year: number
): HeatmapCell[] {
  const cells: HeatmapCell[] = []
  
  records.forEach(record => {
    // time_series uses number keys (years as numbers)
    const value = record.time_series[year] || 0
    
    cells.push({
      geography: record.geography,
      segment: record.segment,
      value,
      displayValue: value.toFixed(2)
    })
  })
  
  return cells
}

/**
 * Prepare data for comparison table
 */
export function prepareTableData(
  records: DataRecord[],
  filters: FilterState
): ComparisonTableRow[] {
  const { yearRange } = filters
  const [startYear, endYear] = yearRange
  
  return records.map(record => {
    // time_series uses number keys (years as numbers)
    const baseValue = record.time_series[filters.yearRange[0]] || 0
    const forecastValue = record.time_series[filters.yearRange[1]] || 0
    const growth = baseValue > 0 
      ? ((forecastValue - baseValue) / baseValue) * 100
      : 0
    
    // Extract time series for sparkline
    const timeSeries: number[] = []
    for (let year = startYear; year <= endYear; year++) {
      timeSeries.push(record.time_series[year] || 0)
    }
    
    return {
      geography: record.geography,
      segment: record.segment,
      baseYear: baseValue,
      forecastYear: forecastValue,
      cagr: record.cagr,
      growth,
      timeSeries
    }
  })
}

/**
 * Get unique geographies from filtered data
 */
export function getUniqueGeographies(records: DataRecord[]): string[] {
  const geos = new Set<string>()
  records.forEach(record => geos.add(record.geography))
  return Array.from(geos)
}

/**
 * Get unique segments from filtered data
 * Returns only parent segments if they exist, otherwise returns leaf segments
 */
export function getUniqueSegments(records: DataRecord[]): string[] {
  const segments = new Set<string>()
  const parentSegments = new Set<string>()
  const childSegments = new Map<string, string[]>() // parent -> children mapping
  
  // First pass: identify all parent and leaf segments
  records.forEach(record => {
    if (record.segment_level === 'parent') {
      parentSegments.add(record.segment)
    } else {
      // Check if this leaf has a parent in the hierarchy
      const parentInHierarchy = record.segment_hierarchy.level_2
      if (parentInHierarchy && parentInHierarchy !== record.segment) {
        if (!childSegments.has(parentInHierarchy)) {
          childSegments.set(parentInHierarchy, [])
        }
        childSegments.get(parentInHierarchy)!.push(record.segment)
      }
    }
  })
  
  // Second pass: add segments to the result
  records.forEach(record => {
    // If this is a parent segment, always include it
    if (record.segment_level === 'parent') {
      segments.add(record.segment)
    } else {
      // For leaf segments, only add if their parent is NOT in the parent segments set
      const parentInHierarchy = record.segment_hierarchy.level_2
      if (!parentSegments.has(parentInHierarchy)) {
        segments.add(record.segment)
      }
    }
  })
  
  return Array.from(segments)
}

/**
 * Prepare data for waterfall chart
 * Shows contribution breakdown from start to end value
 */
export function prepareWaterfallData(
  records: DataRecord[],
  filters: FilterState
): Array<{ name: string; value: number; type: 'start' | 'positive' | 'negative' | 'end' }> {
  const [startYear, endYear] = filters.yearRange
  
  // Group records by the dimension we're analyzing
  const groupKey = filters.viewMode === 'segment-mode' ? 'segment' : 'geography'
  
  // Calculate starting total
  let startTotal = 0
  records.forEach(record => {
    startTotal += record.time_series[startYear] || 0
  })
  
  // Group and calculate contributions
  const grouped = new Map<string, number>()
  records.forEach(record => {
    const key = record[groupKey]
    const startValue = record.time_series[startYear] || 0
    const endValue = record.time_series[endYear] || 0
    const change = endValue - startValue
    
    grouped.set(key, (grouped.get(key) || 0) + change)
  })
  
  // Build waterfall data
  const waterfallData: Array<{ name: string; value: number; type: 'start' | 'positive' | 'negative' | 'end' }> = []
  
  // Starting value
  waterfallData.push({
    name: `Start (${startYear})`,
    value: startTotal,
    type: 'start'
  })
  
  // Sort contributions by absolute value (largest first)
  const sortedContributions = Array.from(grouped.entries())
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  
  // Add positive contributions
  sortedContributions.forEach(([name, change]) => {
    if (change > 0) {
      waterfallData.push({
        name,
        value: change,
        type: 'positive'
      })
    }
  })
  
  // Add negative contributions
  sortedContributions.forEach(([name, change]) => {
    if (change < 0) {
      waterfallData.push({
        name,
        value: Math.abs(change),
        type: 'negative'
      })
    }
  })
  
  // Calculate ending total
  let endTotal = 0
  records.forEach(record => {
    endTotal += record.time_series[endYear] || 0
  })
  
  // Ending value
  waterfallData.push({
    name: `End (${endYear})`,
    value: endTotal,
    type: 'end'
  })
  
  return waterfallData
}

/**
 * Prepare data for charts with multiple aggregation levels
 * Shows the most granular level available for each segment without double-counting
 * This allows displaying data from different levels together on one graph
 */
export function prepareMultiLevelChartData(
  records: DataRecord[],
  filters: FilterState
): ChartDataPoint[] {
  const { yearRange, viewMode } = filters
  const [startYear, endYear] = yearRange
  
  const years: number[] = []
  for (let year = startYear; year <= endYear; year++) {
    years.push(year)
  }

  return years.map(year => {
    const dataPoint: ChartDataPoint = { year }
    
    // Group records by their display key (segment or geography)
    const displayMap = new Map<string, {
      bestRecord: DataRecord | null
      bestLevel: number
      allRecords: DataRecord[]
    }>()
    
    records.forEach(record => {
      // Determine display key based on view mode
      const displayKey = viewMode === 'segment-mode' 
        ? record.segment 
        : record.geography
      
      if (!displayMap.has(displayKey)) {
        displayMap.set(displayKey, {
          bestRecord: null,
          bestLevel: Infinity,
          allRecords: []
        })
      }
      
      const group = displayMap.get(displayKey)!
      group.allRecords.push(record)
      
      // Prefer leaf records (most granular) over aggregated records
      // If multiple records exist, use the one with the lowest aggregation level
      // (lower level = more granular = better for display)
      const recordLevel = record.aggregation_level ?? 0
      if (record.is_aggregated === false) {
        // Leaf record - always prefer this
        if (!group.bestRecord || (group.bestLevel ?? 0) > recordLevel) {
          group.bestRecord = record
          group.bestLevel = recordLevel
        }
      } else {
        // Aggregated record - only use if no leaf record exists
        if (!group.bestRecord && (group.bestLevel ?? 0) > recordLevel) {
          group.bestRecord = record
          group.bestLevel = recordLevel
        }
      }
    })
    
    // Build data point from best records
    displayMap.forEach((group, key) => {
      if (group.bestRecord) {
        dataPoint[key] = group.bestRecord.time_series[year] || 0
      } else if (group.allRecords.length > 0) {
        // Fallback: sum all records if no best record found
        const sum = group.allRecords.reduce((acc, r) => 
          acc + (r.time_series[year] || 0), 0
        )
        dataPoint[key] = sum
      }
    })
    
    return dataPoint
  })
}

/**
 * Enhanced version that allows mixing levels intelligently
 * Shows aggregated data when segments are selected at parent level,
 * Shows leaf data when segments are selected at leaf level
 * This is the recommended function for displaying multiple levels together
 */
export function prepareIntelligentMultiLevelData(
  records: DataRecord[],
  filters: FilterState
): ChartDataPoint[] {
  const { yearRange, viewMode, segments } = filters
  const [startYear, endYear] = yearRange

  const years: number[] = []
  for (let year = startYear; year <= endYear; year++) {
    years.push(year)
  }

  // Group records by segment (or geography) and find the best representation
  const segmentGroups = new Map<string, DataRecord[]>()

  records.forEach(record => {
    const key = viewMode === 'segment-mode' ? record.segment : record.geography
    if (!segmentGroups.has(key)) {
      segmentGroups.set(key, [])
    }
    segmentGroups.get(key)!.push(record)
  })

  return years.map(year => {
    const dataPoint: ChartDataPoint = { year }

    segmentGroups.forEach((groupRecords, key) => {
      // Special case for geography-mode: Get total market value per geography
      // Since we may have records from multiple segment types (to support different data structures),
      // we need to avoid double-counting by using only ONE segment type's data per geography
      // Priority order:
      // 1. Use the first segment type that has data for this geography
      // 2. Prefer leaf records over aggregated records
      // 3. If no leaf records, use Level 1 aggregated record or lowest level aggregates
      if (viewMode === 'geography-mode') {
        // Group records by segment type to avoid double-counting across segment types
        const recordsBySegmentType = new Map<string, DataRecord[]>()
        groupRecords.forEach(r => {
          const segType = r.segment_type
          if (!recordsBySegmentType.has(segType)) {
            recordsBySegmentType.set(segType, [])
          }
          recordsBySegmentType.get(segType)!.push(r)
        })

        // Use the first segment type that has records (they all represent the same underlying data)
        const firstSegmentTypeRecords = recordsBySegmentType.values().next().value as DataRecord[] || []

        const leafRecords = firstSegmentTypeRecords.filter(r => !r.is_aggregated)
        if (leafRecords.length > 0) {
          // Sum all leaf records for this geography (from one segment type)
          dataPoint[key] = leafRecords.reduce((sum, r) =>
            sum + (r.time_series[year] || 0), 0
          )
        } else {
          // No leaf records - check for Level 1 (total) record first
          const level1Record = firstSegmentTypeRecords.find(r => r.aggregation_level === 1)
          if (level1Record) {
            // Use the Level 1 total record
            dataPoint[key] = level1Record.time_series[year] || 0
          } else if (firstSegmentTypeRecords.length > 0) {
            // Find the lowest aggregation level (most detailed) and sum those
            // This avoids double-counting nested aggregations
            const minLevel = Math.min(...firstSegmentTypeRecords.map(r => r.aggregation_level || 999))
            const lowestLevelRecords = firstSegmentTypeRecords.filter(r =>
              (r.aggregation_level || 999) === minLevel
            )
            dataPoint[key] = lowestLevelRecords.reduce((sum, r) =>
              sum + (r.time_series[year] || 0), 0
            )
          } else {
            dataPoint[key] = 0
          }
        }
        return
      }

      // For segment-mode: Use the most appropriate record for this segment
      // 1. If leaf record exists, use it (most accurate)
      // 2. If only aggregated records exist, use the one that matches selected segments
      // 3. If multiple aggregated records, prefer the one at the level of selected segments

      const leafRecord = groupRecords.find(r => !r.is_aggregated)

      if (leafRecord) {
        // Use leaf record - most granular and accurate
        dataPoint[key] = leafRecord.time_series[year] || 0
      } else {
        // No leaf record - find best aggregated record
        // If segments are selected, prefer aggregated records that match
        let bestRecord: DataRecord | null = null
        
        if (segments.length > 0) {
          // Find aggregated record that matches selected segment level
          const selectedSegmentLevel = determineAggregationLevel(
            records,
            segments,
            filters.segmentType
          )
          
          if (selectedSegmentLevel !== null) {
            bestRecord = groupRecords.find(r => 
              r.aggregation_level === selectedSegmentLevel
            ) || null
          }
        }
        
        // Fallback: use the most granular aggregated record
        if (!bestRecord) {
          bestRecord = groupRecords.reduce((best, current) => {
            if (!best) return current
            // Prefer lower aggregation level (more granular)
            const currentLevel = current.aggregation_level ?? 0
            const bestLevel = best.aggregation_level ?? 0
            return currentLevel < bestLevel ? current : best
          }, null as DataRecord | null)
        }
        
        if (bestRecord) {
          dataPoint[key] = bestRecord.time_series[year] || 0
        } else {
          // Last resort: sum all records
          dataPoint[key] = groupRecords.reduce((sum, r) => 
            sum + (r.time_series[year] || 0), 0
          )
        }
      }
    })
    
    return dataPoint
  })
}

/**
 * Calculate aggregated totals
 */
export function calculateTotals(
  records: DataRecord[],
  year: number
): { total: number; count: number; average: number } {
  let total = 0
  let count = 0
  
  records.forEach(record => {
    const value = record.time_series[year] || 0
    total += value
    count++
  })
  
  return {
    total,
    count,
    average: count > 0 ? total / count : 0
  }
}

/**
 * Find top performers
 */
export function findTopPerformers(
  records: DataRecord[],
  year: number,
  limit: number = 5
): Array<{ name: string; value: number }> {
  const performers = records.map(record => ({
    name: `${record.geography} - ${record.segment}`,
    value: record.time_series[year] || 0
  }))
  
  return performers
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

/**
 * Find fastest growing
 */
export function findFastestGrowing(
  records: DataRecord[],
  limit: number = 5
): Array<{ name: string; cagr: number }> {
  const growing = records.map(record => ({
    name: `${record.geography} - ${record.segment}`,
    cagr: record.cagr
  }))
  
  return growing
    .sort((a, b) => b.cagr - a.cagr)
    .slice(0, limit)
}


