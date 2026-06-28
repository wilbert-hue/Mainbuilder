import { NextRequest, NextResponse } from 'next/server'
import { convertExcelFiles } from '@excel-upload-tool/lib/excel-processor'
import { loadAndProcessJsonFiles } from '@/lib/json-processor'
import {
  createStageTimer,
  ingestTimingsExposed,
  logIngestTimings,
} from '@/lib/server-ingest-timings'
import { createDashboard } from '@/lib/dashboard-mongo'
import { assignPartition } from '@/lib/partition'
import { cacheSet } from '@/lib/slave-cache'
import * as fs from 'fs/promises'
import * as path from 'path'
import { writeFile } from 'fs/promises'
import type { GeographyHierarchyConfig } from '@/lib/types'

// Increase timeout for large file processing (5 minutes)
export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Check if a key is a year key (4-digit number)
 */
function isYearKey(key: string): boolean {
  return /^\d{4}$/.test(key)
}

/**
 * Parse CAGR value to number
 */
function parseCagr(cagrValue: any): number | null {
  if (cagrValue === null || cagrValue === undefined) return null
  if (typeof cagrValue === 'number') return cagrValue
  if (typeof cagrValue === 'string') {
    const cleaned = cagrValue.replace(/%/g, '').trim()
    const parsed = parseFloat(cleaned)
    if (!isNaN(parsed)) return parsed
  }
  return null
}

/**
 * Recursively calculate aggregations at each level.
 * Works bottom-up: aggregates children into parent nodes.
 * Similar to the Python script's calculate_aggregations function.
 */
function calculateAggregations(rootNode: any): any {
  if (!rootNode || typeof rootNode !== 'object' || Array.isArray(rootNode)) {
    return rootNode
  }

  // Use a stack instead of recursion - prevents call stack overflow
  // Stack contains: { node, parent, key, level }
  const stack: Array<{ node: any; parent: any; key: string | null; level: number }> = []
  const visited = new WeakSet<any>() // Use WeakSet to prevent circular references
  
  // Start with root node
  stack.push({ node: rootNode, parent: null, key: null, level: 1 })
  
  // Process nodes in reverse order (post-order traversal)
  // This ensures children are processed before parents
  const processedNodes: Array<{ node: any; parent: any; key: string | null; level: number }> = []
  
  while (stack.length > 0) {
    const { node, parent, key, level } = stack.pop()!
    
    // Skip if already visited (circular reference protection)
    if (visited.has(node)) {
      console.warn('Circular reference detected in calculateAggregations')
      continue
    }
    visited.add(node)
    
    // Find child nodes
    const childNodes: Record<string, any> = {}
    for (const [childKey, value] of Object.entries(node)) {
      if (
        !isYearKey(childKey) &&
        childKey !== 'CAGR' &&
        childKey !== '_aggregated' &&
        childKey !== '_level' &&
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        childNodes[childKey] = value
      }
    }
    
    // If no children, mark as leaf and add to processed list
    if (Object.keys(childNodes).length === 0) {
      const hasYearData = Object.keys(node).some(k => isYearKey(k))
      if (hasYearData) {
        node._aggregated = false
        node._level = level
      }
      processedNodes.push({ node, parent, key, level })
    } else {
      // Has children - add to processed list first, then push children
      processedNodes.push({ node, parent, key, level })
      
      // Push children onto stack (in reverse order for correct processing)
      const childEntries = Object.entries(childNodes).reverse()
      for (const [childKey, childNode] of childEntries) {
        stack.push({ node: childNode, parent: node, key: childKey, level: level + 1 })
      }
    }
  }
  
  // Now process nodes in reverse order (post-order) to aggregate from children to parents
  while (processedNodes.length > 0) {
    const { node, parent, key, level } = processedNodes.pop()!
    
    // Find child nodes again (they're already processed)
    const childNodes: Record<string, any> = {}
    for (const [childKey, value] of Object.entries(node)) {
      if (
        !isYearKey(childKey) &&
        childKey !== 'CAGR' &&
        childKey !== '_aggregated' &&
        childKey !== '_level' &&
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        childNodes[childKey] = value
      }
    }
    
    // If has children, aggregate from them
    if (Object.keys(childNodes).length > 0) {
      const aggregatedYears: Record<string, number> = {}
      const cagrValues: number[] = []
      
      for (const [childKey, childNode] of Object.entries(childNodes)) {
        // Aggregate year values from child
        for (const [k, v] of Object.entries(childNode)) {
          if (isYearKey(k)) {
            if (v !== null && v !== undefined) {
              const numValue = typeof v === 'number' ? v : parseFloat(String(v))
              if (!isNaN(numValue)) {
                aggregatedYears[k] = (aggregatedYears[k] || 0) + numValue
              }
            }
          } else if (k === 'CAGR') {
            const cagr = parseCagr(v)
            if (cagr !== null) {
              cagrValues.push(cagr)
            }
          }
        }
      }
      
      // Add aggregated data to this node
      if (Object.keys(aggregatedYears).length > 0) {
        for (const [year, total] of Object.entries(aggregatedYears)) {
          node[year] = total
        }
        node._aggregated = true
        node._level = level
        
        if (cagrValues.length > 0) {
          const avgCagr = cagrValues.reduce((sum, val) => sum + val, 0) / cagrValues.length
          node.CAGR = `${avgCagr.toFixed(1)}%`
        } else if (!('CAGR' in node)) {
          node.CAGR = null
        }
      }
    }
  }
  
  return rootNode
}

/**
 * Calculate aggregations for the entire JSON structure
 */
function addAggregationsToData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  const result: any = {}
  
  // Process each geography
  for (const [geography, geographyData] of Object.entries(data)) {
    if (!geographyData || typeof geographyData !== 'object' || Array.isArray(geographyData)) {
      result[geography] = geographyData
      continue
    }

    result[geography] = {}
    
    // Process each segment type
    for (const [segmentType, segmentData] of Object.entries(geographyData as any)) {
      if (!segmentData || typeof segmentData !== 'object' || Array.isArray(segmentData)) {
        result[geography][segmentType] = segmentData
        continue
      }

      // Calculate aggregations for this segment type
      result[geography][segmentType] = calculateAggregations(segmentData)
    }
  }

  return result
}

/**
 * API Route to process Excel/CSV files and return ComparisonData
 * 
 * Accepts multipart/form-data with:
 * - valueFile: Excel or CSV file for value data (required)
 * - volumeFile: Excel or CSV file for volume data (optional)
 * - volumeUnit: "million-units" | "units" | "th-units" | "tons" — display label for volume (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const timer = createStageTimer()
    const formData = await request.formData()
    const valueFile = formData.get('valueFile') as File | null
    const volumeFile = formData.get('volumeFile') as File | null
    const volumeUnitRaw = (formData.get('volumeUnit') as string | null)?.trim().toLowerCase()
    const volumeUnitLabel =
      volumeUnitRaw === 'million-units'
        ? 'Million units'
        : volumeUnitRaw === 'th-units'
          ? 'Th units'
          : volumeUnitRaw === 'tons'
            ? 'Tons'
            : 'Units'
    const hierarchyConfigStr = formData.get('hierarchyConfig') as string | null
    
    // Parse hierarchy configuration
    let hierarchyConfig: GeographyHierarchyConfig = {}
    if (hierarchyConfigStr) {
      try {
        hierarchyConfig = JSON.parse(hierarchyConfigStr)
      } catch (e) {
        console.warn('Failed to parse hierarchy config:', e)
      }
    }

    timer.lap('parseFormDataMs')
    
    if (!valueFile) {
      return NextResponse.json(
        { error: 'valueFile is required' },
        { status: 400 }
      )
    }
    
    // Validate file types
    const valueFileName = valueFile.name.toLowerCase()
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const hasValidExtension = validExtensions.some(ext => valueFileName.endsWith(ext))
    
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: 'valueFile must be an Excel file (.xlsx, .xls) or CSV file (.csv)' },
        { status: 400 }
      )
    }
    
    if (volumeFile) {
      const volumeFileName = volumeFile.name.toLowerCase()
      const hasValidVolumeExtension = validExtensions.some(ext => volumeFileName.endsWith(ext))
      
      if (!hasValidVolumeExtension) {
        return NextResponse.json(
          { error: 'volumeFile must be an Excel file (.xlsx, .xls) or CSV file (.csv)' },
          { status: 400 }
        )
      }
    }
    
    // Convert files to buffers
    const valueBuffer = Buffer.from(await valueFile.arrayBuffer())
    const volumeBuffer = volumeFile ? Buffer.from(await volumeFile.arrayBuffer()) : undefined

    timer.lap('readFileBuffersMs')
    
    // Detect file types
    const isValueCsv = valueFileName.endsWith('.csv')
    const isVolumeCsv = volumeFile ? volumeFile.name.toLowerCase().endsWith('.csv') : false
    
    // Convert Excel/CSV to JSON
    console.log('Converting Excel/CSV files to JSON...')
    const { value: valueJson, volume: volumeJson } = convertExcelFiles(
      valueBuffer,
      volumeBuffer,
      isValueCsv,
      isVolumeCsv
    )

    timer.lap('spreadsheetToJsonMs')
    
    // Apply hierarchy configuration: Remove aggregation regions from data
    // Aggregation regions are parent regions that should be calculated as sums, not treated as data points
    const getAggregationRegions = (config: GeographyHierarchyConfig): Set<string> => {
      const aggregationRegions = new Set<string>()
      Object.values(config).forEach(levelConfig => {
        Object.keys(levelConfig).forEach(parentRegion => {
          aggregationRegions.add(parentRegion)
        })
      })
      return aggregationRegions
    }
    
    const removeAggregationRegions = (data: any, aggregationRegions: Set<string>): any => {
      if (typeof data !== 'object' || data === null) {
        return data
      }
      
      const result: any = {}
      for (const [key, value] of Object.entries(data)) {
        // Skip aggregation regions (parent regions in hierarchy)
        if (aggregationRegions.has(key)) {
          console.log(`Skipping aggregation region: ${key}`)
          continue
        }
        
        if (typeof value === 'object' && value !== null) {
          result[key] = removeAggregationRegions(value, aggregationRegions)
        } else {
          result[key] = value
        }
      }
      return result
    }
    
    const aggregationRegions = getAggregationRegions(hierarchyConfig)
    if (aggregationRegions.size > 0) {
      console.log(`Removing ${aggregationRegions.size} aggregation regions from data:`, Array.from(aggregationRegions))
    }
    
    // Remove aggregation regions from value and volume data
    const filteredValueJson = removeAggregationRegions(valueJson, aggregationRegions)
    const filteredVolumeJson = volumeJson ? removeAggregationRegions(volumeJson, aggregationRegions) : undefined
    
    // Calculate aggregations for value and volume data
    // This is critical - without this, aggregation levels won't have calculated values
    console.log('Calculating aggregations for value data...')
    const valueJsonWithAggregations = addAggregationsToData(filteredValueJson)
    
    let volumeJsonWithAggregations: any = undefined
    if (filteredVolumeJson) {
      console.log('Calculating aggregations for volume data...')
      volumeJsonWithAggregations = addAggregationsToData(filteredVolumeJson)
    }
    
    // Log sample of converted data for debugging
    console.log('Sample of converted value JSON:', JSON.stringify(valueJsonWithAggregations, null, 2).substring(0, 500))
    
    // Create temporary JSON files for processing
    // Use /tmp in serverless environments (Vercel, AWS Lambda) which is the only writable directory
    // /tmp is guaranteed to exist in serverless environments, so we don't need to create it
    const os = require('os')
    const tempDir = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? '/tmp' : os.tmpdir()
    
    const tempValuePath = path.join(tempDir, `value_${Date.now()}.json`)
    const tempVolumePath = volumeJson ? path.join(tempDir, `volume_${Date.now()}.json`) : null
    const tempSegmentationPath = path.join(tempDir, `segmentation_${Date.now()}.json`)
    
    // Write JSON files (using data with aggregations calculated)
    await writeFile(tempValuePath, JSON.stringify(valueJsonWithAggregations, null, 2), 'utf-8')
    if (tempVolumePath && volumeJsonWithAggregations) {
      await writeFile(tempVolumePath, JSON.stringify(volumeJsonWithAggregations, null, 2), 'utf-8')
    }
    
    // Create segmentation structure (without data, just structure)
    // Use data with aggregations but remove year data for structure reference
    // IMPORTANT: Preserve the nested structure including all segment levels
    const segmentationJson = JSON.parse(JSON.stringify(valueJsonWithAggregations))
    // Remove year data from segmentation structure but preserve structure and metadata
    const removeYearData = (rootObj: any): any => {
      if (typeof rootObj !== 'object' || rootObj === null || Array.isArray(rootObj)) {
        return rootObj
      }

      // Use iterative approach with stack - no recursion, no max depth needed
      const stack: Array<{ obj: any; result: any; key: string | null }> = []
      const visited = new WeakSet<any>()
      
      // Create root result object
      const rootResult: any = {}
      stack.push({ obj: rootObj, result: rootResult, key: null })
      
      while (stack.length > 0) {
        const { obj, result, key } = stack.pop()!
        
        // Circular reference protection
        if (visited.has(obj)) {
          console.warn('Circular reference detected in removeYearData')
          continue
        }
        visited.add(obj)
        
        // Process all keys in this object
        for (const [k, value] of Object.entries(obj)) {
          // Skip year keys and CAGR
          if (/^\d{4}$/.test(k) || k === 'CAGR') {
            continue
          }
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Create new result object for nested value
            const nestedResult: any = {}
            result[k] = nestedResult
            // Push onto stack for processing
            stack.push({ obj: value, result: nestedResult, key: k })
          } else {
            // Copy non-object values directly (including metadata like _aggregated, _level)
            result[k] = value
          }
        }
      }
      
      return rootResult
    }
    
    const segmentationStructure = removeYearData(segmentationJson)
    await writeFile(tempSegmentationPath, JSON.stringify(segmentationStructure, null, 2), 'utf-8')

    timer.lap('aggregationAndArtifactWriteMs')
    
    // Process JSON files through existing pipeline
    console.log('Processing JSON files through pipeline...')
    console.log('File paths:', {
      value: tempValuePath,
      volume: tempVolumePath,
      segmentation: tempSegmentationPath
    })
    
    const comparisonData = await loadAndProcessJsonFiles(
      tempValuePath,
      tempVolumePath,
      tempSegmentationPath,
      { volumeUnit: volumeUnitLabel }
    )

    timer.lap('jsonPipelineMs')
    
    console.log('Processed data structure:', {
      hasData: !!comparisonData,
      hasDimensions: !!comparisonData?.dimensions,
      hasDataData: !!comparisonData?.data,
      hasValueMatrix: !!comparisonData?.data?.value?.geography_segment_matrix,
      hasVolumeMatrix: !!comparisonData?.data?.volume?.geography_segment_matrix,
      valueMatrixLength: comparisonData?.data?.value?.geography_segment_matrix?.length || 0,
      volumeMatrixLength: comparisonData?.data?.volume?.geography_segment_matrix?.length || 0,
      geographies: comparisonData?.dimensions?.geographies?.all_geographies || [],
      segmentTypes: comparisonData?.dimensions?.segments ? Object.keys(comparisonData.dimensions.segments) : []
    })
    
    // Clean up temporary files
    try {
      await fs.unlink(tempValuePath)
      if (tempVolumePath) {
        await fs.unlink(tempVolumePath)
      }
      await fs.unlink(tempSegmentationPath)
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary files:', cleanupError)
    }

    // ── Cross Value / Cross Volume processing ────────────────────────────────
    // These are optional extra files with an additional "Sub-segment 1" column
    // that adds a cross-tabulated segment type on top of the main dataset.
    const crossValueFile = formData.get('crossValueFile') as File | null
    const crossVolumeFile = formData.get('crossVolumeFile') as File | null

    if (crossValueFile) {
      try {
        console.log('Processing cross value/volume files...')
        const isCrossValueCsv = crossValueFile.name.toLowerCase().endsWith('.csv')
        const crossValueBuffer = Buffer.from(await crossValueFile.arrayBuffer())
        const crossVolumeBuffer = crossVolumeFile
          ? Buffer.from(await crossVolumeFile.arrayBuffer())
          : undefined
        const isCrossVolumeCsv = crossVolumeFile
          ? crossVolumeFile.name.toLowerCase().endsWith('.csv')
          : false

        const { value: crossValueJson, volume: crossVolumeJson } = convertExcelFiles(
          crossValueBuffer,
          crossVolumeBuffer,
          isCrossValueCsv,
          isCrossVolumeCsv
        )

        const crossValueJsonWithAggs = addAggregationsToData(crossValueJson)
        const crossVolumeJsonWithAggs = crossVolumeJson
          ? addAggregationsToData(crossVolumeJson)
          : undefined

        const tempCrossValuePath = path.join(tempDir, `cross_value_${Date.now()}.json`)
        const tempCrossVolumePath = crossVolumeJson
          ? path.join(tempDir, `cross_volume_${Date.now()}.json`)
          : null
        const tempCrossSegPath = path.join(tempDir, `cross_seg_${Date.now()}.json`)

        await writeFile(tempCrossValuePath, JSON.stringify(crossValueJsonWithAggs, null, 2), 'utf-8')
        if (tempCrossVolumePath && crossVolumeJsonWithAggs) {
          await writeFile(tempCrossVolumePath, JSON.stringify(crossVolumeJsonWithAggs, null, 2), 'utf-8')
        }
        const crossSegStructure = removeYearData(JSON.parse(JSON.stringify(crossValueJsonWithAggs)))
        await writeFile(tempCrossSegPath, JSON.stringify(crossSegStructure, null, 2), 'utf-8')

        const crossData = await loadAndProcessJsonFiles(
          tempCrossValuePath,
          tempCrossVolumePath,
          tempCrossSegPath,
          { volumeUnit: volumeUnitLabel }
        )

        // Clean up cross temp files
        try {
          await fs.unlink(tempCrossValuePath)
          if (tempCrossVolumePath) await fs.unlink(tempCrossVolumePath)
          await fs.unlink(tempCrossSegPath)
        } catch {}

        // Merge segment types from cross data into main dataset
        for (const [segType, segDim] of Object.entries(crossData.dimensions.segments)) {
          comparisonData.dimensions.segments[segType] = segDim
          console.log(`Merged cross segment type: "${segType}"`)
        }

        // Merge geographies (cross file may introduce region/country geographies)
        const existingGeoSet = new Set(comparisonData.dimensions.geographies.all_geographies)
        const newGeos = crossData.dimensions.geographies.all_geographies.filter(g => !existingGeoSet.has(g))
        if (newGeos.length > 0) {
          comparisonData.dimensions.geographies.all_geographies.push(...newGeos)
          const existingRegionSet = new Set(comparisonData.dimensions.geographies.regions)
          crossData.dimensions.geographies.regions
            .filter(r => !existingRegionSet.has(r))
            .forEach(r => comparisonData.dimensions.geographies.regions.push(r))
          for (const [region, countries] of Object.entries(crossData.dimensions.geographies.countries)) {
            if (!comparisonData.dimensions.geographies.countries[region]) {
              comparisonData.dimensions.geographies.countries[region] = countries
            }
          }
          if (crossData.dimensions.geographies.geography_hierarchy) {
            if (!comparisonData.dimensions.geographies.geography_hierarchy) {
              comparisonData.dimensions.geographies.geography_hierarchy = {}
            }
            for (const [parent, children] of Object.entries(crossData.dimensions.geographies.geography_hierarchy)) {
              if (!comparisonData.dimensions.geographies.geography_hierarchy[parent]) {
                comparisonData.dimensions.geographies.geography_hierarchy[parent] = children
              }
            }
          }
          console.log(`Added ${newGeos.length} new geographies from cross data: ${newGeos.join(', ')}`)
        }

        // Merge records into the value matrix
        comparisonData.data.value.geography_segment_matrix.push(
          ...crossData.data.value.geography_segment_matrix
        )
        console.log(`Merged ${crossData.data.value.geography_segment_matrix.length} cross value records`)

        // Merge records into the volume matrix (if cross volume data exists)
        if (crossData.data.volume.geography_segment_matrix.length > 0) {
          comparisonData.data.volume.geography_segment_matrix.push(
            ...crossData.data.volume.geography_segment_matrix
          )
          comparisonData.metadata.has_volume = true
          console.log(`Merged ${crossData.data.volume.geography_segment_matrix.length} cross volume records`)
        }
      } catch (crossError) {
        console.error('Failed to process cross files (continuing without them):', crossError)
      }
    }
    // ── End cross processing ─────────────────────────────────────────────────

    console.log('Excel/CSV processing completed successfully')

    const timingResult = timer.done({
      valueBytes: valueBuffer.length,
      volumeBytes: volumeBuffer?.length ?? 0,
    })

    logIngestTimings('process-excel', {
      ...timingResult.stages,
      totalMs: timingResult.totalMs,
      valueBytes: timingResult.valueBytes,
      volumeBytes: timingResult.volumeBytes,
    })

    // ── Master: assign partition + save to MongoDB + pre-warm slave cache ────
    // This is the MASTER write path. A failure here is non-fatal — the
    // dashboard still loads in the browser, the user just won't have a
    // shareable link yet.
    let _dashboardId: string | undefined
    try {
      // 1. Master picks the least-loaded partition (even load distribution)
      const partitionKey = await assignPartition()

      // 2. Master saves to MongoDB with the assigned partition
      _dashboardId = await createDashboard({
        name: 'Untitled Dashboard',
        currency: 'USD',
        partitionKey,
        data: comparisonData,
        intelligenceType: null,
        rawIntelligenceData: null,
        proposition2Data: null,
        proposition3Data: null,
        distributorRawIntelligenceData: null,
        distributorProposition2Data: null,
        distributorProposition3Data: null,
        pricingAnalysisData: null,
        showDemoNote: false,
      })

      // 3. Master pre-warms the slave cache for this partition so the first
      //    client who opens the shared link gets a cache hit, not a DB round-trip
      cacheSet(_dashboardId, partitionKey, {
        _id: _dashboardId,
        name: 'Untitled Dashboard',
        currency: 'USD',
        partitionKey,
        readCount: 0,
        data: comparisonData,
        intelligenceType: null,
        rawIntelligenceData: null,
        proposition2Data: null,
        proposition3Data: null,
        distributorRawIntelligenceData: null,
        distributorProposition2Data: null,
        distributorProposition3Data: null,
        pricingAnalysisData: null,
        showDemoNote: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      console.log(`[process-excel] Saved to MongoDB (partition ${partitionKey}): ${_dashboardId}`)
    } catch (mongoErr) {
      console.error('[process-excel] MongoDB save failed (non-fatal):', mongoErr)
    }
    // ── End master write path ─────────────────────────────────────────────────

    if (ingestTimingsExposed()) {
      return NextResponse.json({
        ...comparisonData,
        _dashboardId,
        _ingestMetrics: {
          ...timingResult.stages,
          totalMs: timingResult.totalMs,
          valueBytes: timingResult.valueBytes,
          volumeBytes: timingResult.volumeBytes,
        },
      })
    }

    return NextResponse.json({ ...comparisonData, _dashboardId })
  } catch (error) {
    console.error('Error processing Excel/CSV files:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorDetails = error instanceof Error && error.stack ? error.stack : String(error)
    
    // Provide more detailed error information
    let userFriendlyMessage = errorMessage
    if (errorMessage.includes('Invalid file format')) {
      userFriendlyMessage = `File format error: ${errorMessage}`
    } else if (errorMessage.includes('Could not detect')) {
      userFriendlyMessage = `Column detection error: ${errorMessage}. Please ensure your file has the correct headers (Region, Segment, Sub-segment, and year columns).`
    } else if (errorMessage.includes('no data rows')) {
      userFriendlyMessage = `File is empty or has no data rows. Please check your file.`
    }
    
    return NextResponse.json(
      {
        error: 'Failed to process Excel/CSV files',
        details: userFriendlyMessage,
        debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    )
  }
}

