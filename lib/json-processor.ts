/**
 * Dynamic JSON Processor
 * Processes any market JSON structure and converts it to ComparisonData format
 */

import type { ComparisonData, DataRecord, Metadata, GeographyDimension, SegmentDimension, SegmentHierarchy } from './types'
import {
  METRICS_END_YEAR,
  METRICS_START_YEAR,
  applyMetricsToRecords,
  calculateCAGRFromTimeSeries,
} from './metrics-calculator'
import fs from 'fs/promises'
import path from 'path'

interface RawJsonData {
  [geography: string]: {
    [segmentType: string]: {
      [key: string]: any
    }
  }
}

interface YearData {
  [year: string]: number | string | boolean | null | undefined
}

/**
 * Generator function for async path extraction (memory efficient)
 * This version only yields paths that have year data (for value/volume files)
 */
function* extractPathsGenerator(
  obj: any,
  currentPath: string[] = [],
  depth: number = 0
): Generator<{ path: string[]; data?: YearData }> {
  if (depth > 20 || !obj || typeof obj !== 'object') {
    return
  }

  const keys = Object.keys(obj)
  const hasYearData = keys.some(key => /^\d{4}$/.test(key) || key === 'CAGR')
  
  // If this node has year data, yield it (could be a leaf node or an aggregation node)
  if (hasYearData) {
    const yearData: YearData = {}
    keys.forEach(key => {
      if (/^\d{4}$/.test(key) || key === 'CAGR' || key === '_aggregated' || key === '_level') {
        yearData[key] = obj[key]
      }
    })
    yield { path: currentPath, data: yearData }
    
    // IMPORTANT: Don't return here - continue traversing child objects
    // This allows us to extract both aggregation nodes (with year data) AND their child leaf nodes
    // Aggregations have year data at the same level as child objects, so we need to traverse both
  }

  // Continue traversing child objects (non-year, non-metadata keys)
  for (const key of keys) {
    // Skip year keys and metadata keys - we've already processed them above
    if (/^\d{4}$/.test(key) || key === 'CAGR' || key === '_aggregated' || key === '_level') {
      continue
    }
    
    try {
      yield* extractPathsGenerator(obj[key], [...currentPath, key], depth + 1)
    } catch (error) {
      console.error(`Error extracting path at ${currentPath.join(' > ')} > ${key}:`, error)
    }
  }
}

/**
 * Generator function for extracting ALL paths from structure (even empty objects)
 * This is used for segmentation JSON which may have empty objects at leaf nodes
 * IMPORTANT: After aggregations are calculated, parent nodes have year data AND children,
 * so we must continue traversing even when year data is present
 */
function* extractStructurePathsGenerator(
  obj: any,
  currentPath: string[] = [],
  depth: number = 0
): Generator<{ path: string[] }> {
  if (depth > 20 || !obj || typeof obj !== 'object') {
    return
  }

  const keys = Object.keys(obj)
  
  // Check if this is a leaf node (empty object or has year data but no child objects)
  const hasYearData = keys.some(key => /^\d{4}$/.test(key) || key === 'CAGR')
  const isEmptyObject = keys.length === 0
  
  // Check if there are any child objects (non-year, non-metadata keys that are objects)
  const hasChildObjects = keys.some(key => {
    if (/^\d{4}$/.test(key) || key === 'CAGR' || key === '_aggregated' || key === '_level') {
      return false
    }
    const value = obj[key]
    return value && typeof value === 'object' && !Array.isArray(value)
  })
  
  // If it's a leaf node (has year data OR is empty) AND has no child objects, yield the path
  if ((hasYearData || isEmptyObject) && !hasChildObjects) {
    yield { path: currentPath }
    return
  }
  
  // If it has year data but also has child objects, yield this path (it's an aggregation node)
  // but continue traversing to get child paths
  if (hasYearData && hasChildObjects) {
    yield { path: currentPath }
    // Don't return - continue to traverse children
  }

  // Continue traversing for non-leaf nodes (or nodes with both year data and children)
  for (const key of keys) {
    // Skip year keys and metadata keys - we've already processed them above
    if (/^\d{4}$/.test(key) || key === 'CAGR' || key === '_aggregated' || key === '_level') {
      continue
    }
    
    try {
      yield* extractStructurePathsGenerator(obj[key], [...currentPath, key], depth + 1)
    } catch (error) {
      console.error(`Error extracting structure path at ${currentPath.join(' > ')} > ${key}:`, error)
    }
  }
}

/**
 * Async function to collect paths in chunks (yields control periodically)
 */
async function collectPathsAsync(
  generator: Generator<{ path: string[]; data?: YearData }>,
  chunkSize: number = 1000
): Promise<Array<{ path: string[]; data?: YearData }>> {
  const paths: Array<{ path: string[]; data?: YearData }> = []
  let count = 0
  
  for (const path of generator) {
    paths.push(path)
    count++
    
    // Yield control periodically to avoid blocking
    if (count % chunkSize === 0) {
      await new Promise(resolve => setImmediate(resolve))
    }
  }
  
  return paths
}

/**
 * Extract years asynchronously (yields control periodically)
 */
async function extractYearsAsync(data: RawJsonData): Promise<number[]> {
  const years = new Set<number>()
  
  const traverse = async (obj: any, depth: number = 0): Promise<void> => {
    if (depth > 15 || !obj || typeof obj !== 'object') return
    
    const keys = Object.keys(obj)
    
    // Check if this object has year keys directly (leaf node)
    const hasYearKeys = keys.some(key => /^\d{4}$/.test(key))
    if (hasYearKeys) {
      // This is a leaf node with year data - extract all year keys
      keys.forEach(key => {
        if (/^\d{4}$/.test(key)) {
          const year = parseInt(key, 10)
          if (year >= 1900 && year <= 2100) {
            years.add(year)
          }
        }
      })
    }
    
    // Continue traversing child objects
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      
      // Skip year keys and metadata - we've already processed them
      if (/^\d{4}$/.test(key) || key === 'CAGR' || key === '_aggregated' || key === '_level') {
        continue
      }
      
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        await traverse(obj[key], depth + 1)
      }
      
      // Yield control every 100 keys
      if (i % 100 === 0) {
        await new Promise(resolve => setImmediate(resolve))
      }
    }
  }
  
  try {
    console.log('Extracting years from data structure...')
    const geographies = Object.values(data)
    console.log(`Found ${geographies.length} geographies to traverse`)
    
    for (const geography of geographies) {
      if (geography && typeof geography === 'object') {
        const segmentTypes = Object.values(geography)
        for (const segmentType of segmentTypes) {
          if (segmentType && typeof segmentType === 'object') {
            await traverse(segmentType)
          }
        }
      }
    }
    
    console.log(`Extracted ${years.size} unique years:`, Array.from(years).sort((a, b) => a - b))
  } catch (error) {
    console.error('Error extracting years:', error)
    throw new Error(`Failed to extract years: ${error instanceof Error ? error.message : String(error)}`)
  }
  
  const yearArray = Array.from(years).sort((a, b) => a - b)
  if (yearArray.length === 0) {
    // Log the data structure to help debug
    console.error('No years found. Sample data structure:', JSON.stringify(data, null, 2).substring(0, 1000))
    throw new Error('No valid years found in data. Please ensure your file has year columns (e.g., 2018, 2019, 2020) with data.')
  }
  
  return yearArray
}

/**
 * Determine if a path segment is a geography
 */
function isGeography(segment: string, allGeographies: Set<string>): boolean {
  return allGeographies.has(segment)
}

/**
 * Build segment hierarchy from path
 */
function buildSegmentHierarchy(
  path: string[],
  geographyIndex: number,
  segmentTypeIndex: number
): SegmentHierarchy {
  const segmentParts = path.slice(segmentTypeIndex + 1)
  
  return {
    level_1: segmentParts[0] || '',
    level_2: segmentParts[1] || '',
    level_3: segmentParts[2] || '',
    level_4: segmentParts[3] || '',
    level_5: segmentParts[4] || '',
  }
}

/**
 * Determine segment level (parent or leaf)
 */
function getSegmentLevel(
  path: string[],
  allPaths: Array<{ path: string[] }>,
  segmentTypeIndex: number
): 'parent' | 'leaf' {
  const segmentPath = path.slice(segmentTypeIndex + 1)
  
  // Check if any other path has this as a parent
  const hasChildren = allPaths.some(otherPath => {
    if (otherPath.path.length <= path.length) return false
    const otherSegmentPath = otherPath.path.slice(segmentTypeIndex + 1)
    return otherSegmentPath.slice(0, segmentPath.length).join('|') === segmentPath.join('|')
  })
  
  return hasChildren ? 'parent' : 'leaf'
}

/**
 * Create a path index for fast child lookups
 * Maps parent path strings to arrays of child paths
 */
function createPathIndex(allPaths: Array<{ path: string[] }>): Map<string, Array<{ path: string[] }>> {
  const index = new Map<string, Array<{ path: string[] }>>()
  
  if (!allPaths || allPaths.length === 0) {
    return index
  }
  
  // Group paths by their parent path
  for (const pathObj of allPaths) {
    const path = pathObj.path
    if (path.length === 0) continue
    
    // For each path, add it to its parent's children list
    // Parent is path.slice(0, -1)
    if (path.length > 1) {
      const parentPath = path.slice(0, -1)
      const parentKey = parentPath.join('|')
      
      if (!index.has(parentKey)) {
        index.set(parentKey, [])
      }
      index.get(parentKey)!.push({ path })
    }
  }
  
  return index
}

/**
 * Get ALL children paths for a given parent path
 * This is more comprehensive than just checking if children exist
 * Returns direct children only (path.length === parentPath.length + 1)
 * OPTIMIZED: Uses path index for O(1) lookup instead of O(n) filter
 */
function getAllChildrenPaths(
  parentPath: string[],
  allPaths: Array<{ path: string[] }>,
  pathIndex?: Map<string, Array<{ path: string[] }>>,
  structureData?: RawJsonData,
  valueData?: RawJsonData | null,
  volumeData?: RawJsonData | null
): Array<{ path: string[] }> {
  const children: Array<{ path: string[] }> = []
  
  // Strategy 1: Use path index (fastest - O(1) lookup)
  if (pathIndex) {
    const parentKey = parentPath.join('|')
    const indexedChildren = pathIndex.get(parentKey)
    if (indexedChildren && indexedChildren.length > 0) {
      return indexedChildren
    }
  }
  
  // Strategy 2: Use allPaths with optimized filter (fallback if no index)
  if (allPaths && allPaths.length > 0) {
    const parentKey = parentPath.join('|')
    const parentLength = parentPath.length
    
    // Only check paths that could be children (length check first for early exit)
    for (const otherPath of allPaths) {
      const otherPathArray = otherPath.path
      // Quick length check first
      if (otherPathArray.length !== parentLength + 1) {
        continue
      }
      
      // Check prefix match
      let isChild = true
      for (let i = 0; i < parentLength; i++) {
        if (otherPathArray[i] !== parentPath[i]) {
          isChild = false
          break
        }
      }
      
      if (isChild) {
        children.push({ path: otherPathArray })
      }
    }
    
    if (children.length > 0) {
      return children
    }
  }
  
  // Strategy 2: Navigate through data structures (fallback)
  if (parentPath.length < 2) {
    return []
  }
  
  const geography = parentPath[0]
  const segmentType = parentPath[1]
  const segmentPath = parentPath.slice(2)
  
  // Try structure data first
  let current: any = null
  let found = false
  
  const dataSources = [
    { data: structureData, name: 'structure' },
    { data: valueData, name: 'value' },
    { data: volumeData, name: 'volume' }
  ]
  
  for (const source of dataSources) {
    if (!source.data || found) continue
    
    if (source.data[geography]?.[segmentType]) {
      current = source.data[geography][segmentType]
      found = true
      
      // Navigate through segment path
      for (const segmentKey of segmentPath) {
        if (current && typeof current === 'object' && current[segmentKey] !== undefined) {
          current = current[segmentKey]
        } else {
          found = false
          break
        }
      }
      
      if (found) break
    }
  }
  
  if (!found || !current || typeof current !== 'object') {
    return []
  }
  
  // Extract direct children from current node
  const keys = Object.keys(current)
  for (const key of keys) {
    // Skip year keys, CAGR, and metadata keys
    if (/^\d{4}$/.test(key) || key === 'CAGR' || key === '_aggregated' || key === '_level') {
      continue
    }
    
    const value = current[key]
    // Check if it's a non-null object (not array, not null)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      children.push({ path: [...parentPath, key] })
    }
  }
  
  return children
}

/**
 * Recursively get ALL descendant paths (children, grandchildren, etc.)
 */
function getAllDescendantPaths(
  parentPath: string[],
  allPaths: Array<{ path: string[] }>
): Array<{ path: string[] }> {
  const descendants: Array<{ path: string[] }> = []
  
  if (!allPaths || allPaths.length === 0) {
    return descendants
  }
  
  // Find all paths that start with parentPath
  for (const otherPath of allPaths) {
    // Check if otherPath is a descendant of parentPath
    if (otherPath.path.length <= parentPath.length) {
      continue
    }
    
    // Check if otherPath starts with parentPath (exact prefix match)
    let isDescendant = true
    for (let i = 0; i < parentPath.length; i++) {
      if (otherPath.path[i] !== parentPath[i]) {
        isDescendant = false
        break
      }
    }
    
    if (isDescendant) {
      descendants.push({ path: otherPath.path })
    }
  }
  
  return descendants
}

/**
 * Check if a path has children in the structure or value data, or in the list of all paths
 * Used to infer aggregation level when _level is missing
 * Enhanced version that uses getAllChildrenPaths for more reliable detection
 */
function checkIfPathHasChildren(
  structureData: RawJsonData,
  pathArray: string[],
  valueData?: RawJsonData | null,
  volumeData?: RawJsonData | null,
  allPaths?: Array<{ path: string[] }>,
  pathIndex?: Map<string, Array<{ path: string[] }>>
): boolean {
  try {
    // Use getAllChildrenPaths to get actual children (more reliable)
    const children = getAllChildrenPaths(
      pathArray,
      allPaths || [],
      pathIndex,
      structureData,
      valueData,
      volumeData
    )
    
    return children.length > 0
  } catch (error) {
    console.warn('Error checking if path has children:', error, {
      pathArray,
      hasStructureData: !!structureData,
      hasValueData: !!valueData,
      hasVolumeData: !!volumeData,
      allPathsCount: allPaths?.length || 0
    })
    return false
  }
}

/**
 * Process segment type asynchronously
 */
async function processSegmentTypeAsync(
  structureData: RawJsonData,
  valueData: RawJsonData | null,
  volumeData: RawJsonData | null,
  segmentType: string,
  geographies: string[],
  allYears: number[],
  segmentTypeIndex: number,
  geographyHierarchy?: Record<string, string[]> // Optional: pre-built geography hierarchy for "By Region" type
): Promise<{
  segmentDimension: SegmentDimension
  records: DataRecord[]
}> {
  const allPaths: Array<{ path: string[]; data?: YearData }> = []
  
  // Extract paths directly from valueData to capture ALL data nodes including aggregations
  // This ensures we get aggregations that might not be in structure data
  // Also extract from volumeData if available to get complete path coverage
  if (valueData) {
    for (let i = 0; i < geographies.length; i++) {
      const geography = geographies[i]
      
      if (valueData[geography]?.[segmentType]) {
        // Use extractPathsGenerator directly on valueData to get all paths with year data
        // This will capture both leaf nodes and aggregation nodes
        const valueDataGenerator = extractPathsGenerator(
          valueData[geography][segmentType],
          [geography, segmentType]
        )
        
        // Collect all paths with data from valueData
        let count = 0
        for (const pathObj of valueDataGenerator) {
          if (pathObj.data) {
            // Check if path already exists (might be added from volumeData)
            const existingIndex = allPaths.findIndex(p => 
              p.path.length === pathObj.path.length &&
              p.path.every((val, idx) => val === pathObj.path[idx])
            )
            if (existingIndex === -1) {
              allPaths.push(pathObj)
            } else {
              // Merge data if path exists (in case volumeData added it first)
              // Prefer valueData metadata (_aggregated, _level) if present
              if (pathObj.data._aggregated !== undefined || pathObj.data._level !== undefined) {
                allPaths[existingIndex] = pathObj
              }
            }
            count++
            if (count % 1000 === 0) {
              await new Promise(resolve => setImmediate(resolve))
            }
          }
        }
      }
      
      // Also extract from volumeData if available to ensure complete path coverage
      // This helps with child detection when both files are uploaded
      if (volumeData && volumeData[geography]?.[segmentType]) {
        const volumeDataGenerator = extractPathsGenerator(
          volumeData[geography][segmentType],
          [geography, segmentType]
        )
        
        let count = 0
        for (const pathObj of volumeDataGenerator) {
          if (pathObj.data) {
            // Check if path already exists (from valueData)
            const existingIndex = allPaths.findIndex(p => 
              p.path.length === pathObj.path.length &&
              p.path.every((val, idx) => val === pathObj.path[idx])
            )
            if (existingIndex === -1) {
              // Only add if not already present (valueData takes precedence)
              allPaths.push(pathObj)
            }
            count++
            if (count % 1000 === 0) {
              await new Promise(resolve => setImmediate(resolve))
            }
          }
        }
      }
      
      // Yield control every 5 geographies
      if ((i + 1) % 5 === 0) {
        await new Promise(resolve => setImmediate(resolve))
      }
    }
  } else {
    // Fallback: Extract paths from structure data if valueData is not available
    // Then look up actual data from valueData/volumeData
    for (let i = 0; i < geographies.length; i++) {
      const geography = geographies[i]
      
      // Get structure from segmentation data
      if (structureData[geography]?.[segmentType]) {
        // Extract paths from structure using structure generator (handles empty objects)
        const structureGenerator = extractStructurePathsGenerator(
          structureData[geography][segmentType],
          [geography, segmentType]
        )
        // Collect structure paths (handles empty objects at leaf nodes)
        const structurePaths: Array<{ path: string[] }> = []
        let count = 0
        for (const pathObj of structureGenerator) {
          structurePaths.push(pathObj)
          count++
          if (count % 1000 === 0) {
            await new Promise(resolve => setImmediate(resolve))
          }
        }
        
        // For each path from structure, try to find matching data in valueData
        for (const structurePath of structurePaths) {
          // Try to find matching data in valueData using the same path
          let data: YearData | undefined = undefined
          
          if (valueData && valueData[geography]?.[segmentType]) {
            // Navigate to the same path in valueData
            // The path structure is: [geography, segmentType, ...segmentPath]
            // We need to navigate: valueData[geography][segmentType][...segmentPath]
            let currentValueData: any = valueData[geography][segmentType]
            const segmentPath = structurePath.path.slice(segmentTypeIndex + 1) // Remove geography and segmentType
            
            // Navigate through the segment path
            for (const segmentKey of segmentPath) {
              if (currentValueData && typeof currentValueData === 'object' && currentValueData[segmentKey] !== undefined) {
                currentValueData = currentValueData[segmentKey]
              } else {
                currentValueData = null
                break
              }
            }
            
            // If we found the data, extract year values and aggregation metadata
            if (currentValueData && typeof currentValueData === 'object') {
              const keys = Object.keys(currentValueData)
              const hasYearData = keys.some(key => /^\d{4}$/.test(key) || key === 'CAGR')
              if (hasYearData) {
                data = {}
                keys.forEach(key => {
                  if (/^\d{4}$/.test(key) || key === 'CAGR' || key === '_aggregated' || key === '_level') {
                    data![key] = currentValueData[key]
                  }
                })
              }
            }
          }
          
          // Only add paths that have data (skip structure-only paths without numeric data)
          if (data) {
            allPaths.push({ path: structurePath.path, data })
          }
        }
      }
      
      // Yield control every 5 geographies
      if ((i + 1) % 5 === 0) {
        await new Promise(resolve => setImmediate(resolve))
      }
    }
  }
  
  // Build segment hierarchy and records
  // IMPORTANT: Extract segments from structure FIRST (even without data) to populate filter options
  // Also extract from valueData/volumeData if structure doesn't have segments
  const segmentItems: string[] = []
  const hierarchy: Record<string, string[]> = {}
  const b2bHierarchy: Record<string, string[]> = {}
  const b2cHierarchy: Record<string, string[]> = {}
  const b2bItems: string[] = []
  const b2cItems: string[] = []
  const records: DataRecord[] = []
  
  // Helper function to extract segments from a data source
  const extractSegmentsFromSource = async (sourceData: RawJsonData, sourceName: string) => {
    for (let geoIdx = 0; geoIdx < geographies.length; geoIdx++) {
      const geography = geographies[geoIdx]
      if (sourceData[geography]?.[segmentType]) {
        // Use structure generator that handles empty objects and nodes with year data
        const structureGenerator = extractStructurePathsGenerator(
          sourceData[geography][segmentType],
          [geography, segmentType]
        )
        // Collect structure paths (no data, just paths)
        const structurePaths: Array<{ path: string[] }> = []
        let count = 0
        for (const pathObj of structureGenerator) {
          structurePaths.push(pathObj)
          count++
          if (count % 1000 === 0) {
            await new Promise(resolve => setImmediate(resolve))
          }
        }
        
        // Build segment items and hierarchy from structure (not just paths with data)
        structurePaths.forEach(({ path: pathArray }) => {
          const segmentPath = pathArray.slice(segmentTypeIndex + 1)
          
          // Build hierarchy from structure
          segmentPath.forEach((seg, index) => {
            if (seg && seg.trim() !== '') { // Only add non-empty segments
              if (index === 0) {
                if (!segmentItems.includes(seg)) {
                  segmentItems.push(seg) // Add all segments from structure
                }
                if (!hierarchy[seg]) hierarchy[seg] = []
              } else {
                const parent = segmentPath[index - 1]
                if (parent && parent.trim() !== '') {
                  if (!hierarchy[parent]) hierarchy[parent] = []
                  if (!hierarchy[parent].includes(seg)) {
                    hierarchy[parent].push(seg)
                  }
                }
              }
            }
          })
          
          // Check for B2B/B2C
          const level1 = segmentPath[0] || ''
          if (level1 === 'B2B' || level1 === 'B2C') {
            const segment = segmentPath[segmentPath.length - 1] || ''
            if (segment && segment.trim() !== '') {
              if (level1 === 'B2B') {
                const parentKey = segmentPath[1] || ''
                if (parentKey && !b2bHierarchy[parentKey]) {
                  b2bHierarchy[parentKey] = []
                }
                if (!b2bItems.includes(segment)) {
                  b2bItems.push(segment)
                }
              } else {
                const parentKey = segmentPath[1] || ''
                if (parentKey && !b2cHierarchy[parentKey]) {
                  b2cHierarchy[parentKey] = []
                }
                if (!b2cItems.includes(segment)) {
                  b2cItems.push(segment)
                }
              }
            }
          }
        })
        
        console.log(`Extracted ${structurePaths.length} structure paths from ${sourceName} for ${geography} > ${segmentType}`)
        if (structurePaths.length > 0) {
          console.log(`Sample structure paths:`, structurePaths.slice(0, 3).map(p => p.path.join(' > ')))
        }
      }
    }
  }
  
  // First pass: Extract ALL segments from structure (segmentation JSON) to build complete segment list
  // This ensures segments are available in filters even if they don't have matching data in value/volume files
  if (structureData) {
    await extractSegmentsFromSource(structureData, 'structureData')
  }
  
  // If no segments found in structure, try extracting from valueData
  if (segmentItems.length === 0 && valueData) {
    console.log('No segments found in structureData, trying valueData...')
    await extractSegmentsFromSource(valueData, 'valueData')
  }
  
  // If still no segments, try volumeData
  if (segmentItems.length === 0 && volumeData) {
    console.log('No segments found in valueData, trying volumeData...')
    await extractSegmentsFromSource(volumeData, 'volumeData')
  }
  
  // Also extract segments from allPaths if we have them (from valueData/volumeData extraction)
  if (segmentItems.length === 0 && allPaths.length > 0) {
    console.log('Extracting segments from allPaths...')
    const segmentSet = new Set<string>()
    allPaths.forEach(({ path: pathArray }) => {
      const segmentPath = pathArray.slice(segmentTypeIndex + 1)
      segmentPath.forEach(seg => {
        if (seg && seg.trim() !== '') {
          segmentSet.add(seg)
        }
      })
    })
    segmentItems.push(...Array.from(segmentSet))
    console.log(`Extracted ${segmentItems.length} segments from allPaths`)
  }
  
  console.log(`Total segment items extracted: ${segmentItems.length}`)
  console.log(`Sample segment items:`, segmentItems.slice(0, 10))
  console.log(`Hierarchy keys count: ${Object.keys(hierarchy).length}`, Object.keys(hierarchy).slice(0, 10))
  
  // Create path index for fast child lookups (performance optimization)
  // This converts O(n*m) complexity to O(n) for child detection
  console.log('Creating path index for fast child lookups...')
  const pathIndex = createPathIndex(allPaths.map(p => ({ path: p.path })))
  console.log(`Path index created with ${pathIndex.size} parent entries`)
  
  // Second pass: Process paths with data to create records
  const batchSize = 1000
  for (let i = 0; i < allPaths.length; i += batchSize) {
    const batch = allPaths.slice(i, i + batchSize)
    
    for (const { path: pathArray, data } of batch) {
      if (!data) continue // Skip paths without numeric data
      
      const geography = pathArray[0]
      const segmentPath = pathArray.slice(segmentTypeIndex + 1)
      
      // Extract aggregation metadata from JSON first
      // Handle both boolean and string representations of _aggregated
      const hasAggregatedFlag = data._aggregated === true || data._aggregated === 'true'
      let isAggregated = hasAggregatedFlag
      // Handle _level as number or string, and ensure 0 is treated as valid
      let aggregationLevel: number | null = null
      if (data._level !== undefined && data._level !== null && data._level !== '') {
        const levelNum = typeof data._level === 'string' ? parseInt(data._level, 10) : Number(data._level)
        if (!isNaN(levelNum)) {
          aggregationLevel = levelNum
        }
      }
      
      // If _aggregated flag is explicitly set, prioritize it
      // This ensures that pre-calculated aggregations are always recognized
      
      // If _level is missing but _aggregated is true, we need to infer the level
      // Also infer if _level is missing (common when uploading via dashboard builder)
      if (aggregationLevel === null || (isAggregated && aggregationLevel === null)) {
        // Check if this path has children in the structure, value data, or other paths to determine if it's aggregated
        // Pass allPaths and pathIndex for optimized lookup
        const hasChildren = checkIfPathHasChildren(structureData, pathArray, valueData, volumeData, allPaths, pathIndex)
        
        // Debug logging for child detection
        if (process.env.NODE_ENV === 'development' && !hasChildren && hasAggregatedFlag) {
          console.log(`🔍 Child detection for aggregated path [${pathArray.join(' > ')}]:`, {
            hasChildren,
            allPathsCount: allPaths?.length || 0,
            pathArrayLength: pathArray.length,
            hasStructureData: !!structureData,
            hasValueData: !!valueData
          })
        }
        
        // Calculate level based on segment path depth
        // Level 1 = no segments (segmentPath.length = 0) - total aggregation
        // Level 2 = 1 segment (segmentPath.length = 1) - first segment level
        // Level 3 = 2 segments (segmentPath.length = 2) - second segment level
        // etc.
        const calculatedLevel = segmentPath.length + 1
        
        // IMPORTANT: When both value and volume are uploaded, allPaths should contain all paths
        // But if allPaths check fails, also check volumeData if available
        let hasChildrenFinal = hasChildren
        
        // If _aggregated flag is explicitly true, trust it even if hasChildren check fails
        // This handles cases where aggregations were calculated but structure check is incomplete
        if (isAggregated && !hasChildren && pathIndex) {
          // Double-check using path index (fast O(1) lookup)
          const parentKey = pathArray.join('|')
          const indexedChildren = pathIndex.get(parentKey)
          if (indexedChildren && indexedChildren.length > 0) {
            hasChildrenFinal = true
          } else if (isAggregated) {
            // If _aggregated is true but we can't find children, still trust the flag
            // This can happen when aggregations were pre-calculated
            hasChildrenFinal = true
          }
        } else if (!hasChildren && pathIndex) {
          // Double-check using path index (fast O(1) lookup)
          const parentKey = pathArray.join('|')
          const indexedChildren = pathIndex.get(parentKey)
          if (indexedChildren && indexedChildren.length > 0) {
            hasChildrenFinal = true
          }
        }
        
        if (hasChildrenFinal || hasAggregatedFlag) {
          // This path has children OR is marked as aggregated, so it's an aggregated record
          aggregationLevel = calculatedLevel
          isAggregated = true
        } else {
          // This is a leaf record (no children)
          // For leaf records, set aggregation_level to their depth so they can be filtered correctly
          // This allows leaf records to be included when filtering by their level
          aggregationLevel = calculatedLevel
          isAggregated = false
        }
        
        // Debug logging for uploaded data
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 Inferred aggregation level for path [${pathArray.join(' > ')}]:`, {
            segmentPath: segmentPath,
            segmentPathLength: segmentPath.length,
            calculatedLevel,
            hasChildren,
            hasChildrenFinal,
            isAggregated,
            aggregationLevel,
            allPathsCount: allPaths?.length || 0,
            dataHasAggregatedFlag: data._aggregated,
            dataHasLevelFlag: data._level
          })
        }
      } else if (hasAggregatedFlag && aggregationLevel === null) {
        // If _aggregated is true but _level is still null after inference, use calculated level
        // This ensures aggregated nodes always have a level set
        aggregationLevel = segmentPath.length + 1
        isAggregated = true
        console.warn(`⚠️ Aggregated node at path [${pathArray.join(' > ')}] had _aggregated=true but no _level. Using calculated level ${aggregationLevel}`)
      }
      
      // Final safeguard: if _aggregated flag is set, always respect it
      if (hasAggregatedFlag) {
        isAggregated = true
        if (aggregationLevel === null) {
          aggregationLevel = segmentPath.length + 1
        }
      }
      
      // Determine segment name based on aggregation level
      // JSON structure:
      // - Level 1: Path = [geography, segmentType] - no segments (total aggregation)
      // - Level 2: Path = [geography, segmentType, segment1] - first segment level
      // - Level 3: Path = [geography, segmentType, segment1, segment2] - second segment level
      // - etc.
      let segment: string
      if (isAggregated && aggregationLevel !== null && aggregationLevel > 0) {
        if (aggregationLevel === 1) {
          // Level 1: No segments in path, this is the total aggregation
          // Use special marker
          segment = '__ALL_SEGMENTS__'
        } else {
          // Level 2+: segmentPath[0] is Level 2, segmentPath[1] is Level 3, etc.
          // aggregationLevel 2 -> segmentPath[0]
          // aggregationLevel 3 -> segmentPath[1]
          // aggregationLevel N -> segmentPath[N-2]
          const levelIndex = aggregationLevel - 2
          if (levelIndex >= 0 && levelIndex < segmentPath.length && segmentPath[levelIndex]) {
            segment = segmentPath[levelIndex]
          } else if (segmentPath.length > 0) {
            // Fallback: use last segment in path if available
            segment = segmentPath[segmentPath.length - 1] || ''
          } else {
            // If segmentPath is empty, this shouldn't happen but handle it gracefully
            console.warn(`Empty segmentPath for aggregated record at level ${aggregationLevel}, path:`, pathArray)
            segment = ''
          }
        }
      } else {
        // For leaf records (not aggregated), use the last segment in the path
        segment = segmentPath[segmentPath.length - 1] || ''
      }
      
      // Build time series
      const timeSeries: Record<number, number> = {}
      allYears.forEach(year => {
        const yearStr = year.toString()
        timeSeries[year] = data[yearStr] !== null && data[yearStr] !== undefined ? (data[yearStr] as number) : 0
      })
      
      // CAGR always derived from 2026–2033 time series (not sheet CAGR column)
      const cagr = calculateCAGRFromTimeSeries(timeSeries, METRICS_START_YEAR, METRICS_END_YEAR)
      
      records.push({
        geography,
        geography_level: 'country',
        parent_geography: null,
        segment_type: segmentType,
        segment,
        segment_level: getSegmentLevel(pathArray, allPaths, segmentTypeIndex),
        segment_hierarchy: buildSegmentHierarchy(pathArray, 0, segmentTypeIndex),
        time_series: timeSeries,
        cagr,
        market_share: 0,
        is_aggregated: isAggregated,
        aggregation_level: aggregationLevel
      })
    }
    
    // Yield control between batches
    await new Promise(resolve => setImmediate(resolve))
  }
  
  // If geographyHierarchy is provided (for "By Region" type), use it instead of the extracted hierarchy
  // This ensures the cascade filter shows Region → Countries
  let finalHierarchy = hierarchy
  let finalItems = segmentItems

  if (geographyHierarchy && Object.keys(geographyHierarchy).length > 0) {
    console.log('Using provided geography hierarchy for segment type:', segmentType)
    finalHierarchy = geographyHierarchy
    // Build items from hierarchy: all keys (regions) and all values (countries)
    const itemsSet = new Set<string>()
    Object.keys(geographyHierarchy).forEach(region => {
      itemsSet.add(region)
      geographyHierarchy[region].forEach(country => itemsSet.add(country))
    })
    finalItems = Array.from(itemsSet)
  }

  return {
    segmentDimension: {
      type: 'hierarchical',
      items: finalItems,
      hierarchy: finalHierarchy,
      b2b_hierarchy: Object.keys(b2bHierarchy).length > 0 ? b2bHierarchy : undefined,
      b2c_hierarchy: Object.keys(b2cHierarchy).length > 0 ? b2cHierarchy : undefined,
      b2b_items: b2bItems.length > 0 ? b2bItems : undefined,
      b2c_items: b2cItems.length > 0 ? b2cItems : undefined,
    },
    records
  }
}

/**
 * Process raw JSON data into ComparisonData format (Async version)
 */
export type ProcessJsonOptions = {
  /** Display label for volume axis/KPIs (e.g. "Million units", "Units") */
  volumeUnit?: string
}

export async function processJsonDataAsync(
  valueData: RawJsonData,
  volumeData: RawJsonData | null,
  segmentationData: RawJsonData | null,
  options?: ProcessJsonOptions
): Promise<ComparisonData> {
  try {
    console.log('Starting async processJsonData...')
    
    // Use segmentationData for structure (geographies and segments)
    // Use valueData/volumeData for numeric data (years, values, CAGR)
    const structureData = segmentationData || valueData
    
    if (!structureData) {
      throw new Error('No structure data available (need segmentation or value data)')
    }
    
    // Extract all years asynchronously from value data (or volume if value not available)
    console.log('Extracting years...')
    const dataForYears = valueData || volumeData
    let allYears: number[] = []
    if (dataForYears) {
      allYears = await extractYearsAsync(dataForYears)
    }
    if (allYears.length === 0) {
      // Fallback: try to extract from structure data
      console.warn('No years found in value/volume data, trying structure data...')
      allYears = await extractYearsAsync(structureData)
    }
    if (allYears.length === 0) {
      throw new Error('No years found in any data source')
    }
    const startYear = Math.min(...allYears)
    const forecastYear = Math.max(...allYears)
    const baseYear = startYear + 5
    console.log(`Years: ${startYear} to ${forecastYear}, base: ${baseYear}`)
    
    // Extract geographies from segmentation data (first level keys)
    // This is truly dynamic - works with any structure (global, country, region, etc.)
    console.log('Extracting geographies from segmentation data...')
    let geographies: string[] = []
    
    if (structureData && typeof structureData === 'object') {
      geographies = Object.keys(structureData).filter(key => {
        // Filter out any non-string keys or invalid entries
        const value = structureData[key]
        return value && typeof value === 'object' && !Array.isArray(value)
      })
    }
    
    if (geographies.length === 0) {
      // Fallback: try to extract from value data if segmentation doesn't have geographies
      console.warn('No geographies found in segmentation data, trying value data...')
      if (valueData && typeof valueData === 'object') {
        geographies = Object.keys(valueData).filter(key => {
          const value = valueData[key]
          return value && typeof value === 'object' && !Array.isArray(value)
        })
      }
    }
    
    if (geographies.length === 0) {
      throw new Error('No geographies found in any data source. Please check your JSON structure.')
    }
    
    console.log(`Found ${geographies.length} geographies:`, geographies)
    const geographySet = new Set(geographies)
    
    // Extract segment types from segmentation data (second level keys)
    console.log('Extracting segment types from segmentation data...')
    const segmentTypes = new Set<string>()
    Object.values(structureData).forEach(geography => {
      if (geography && typeof geography === 'object') {
        Object.keys(geography).forEach(segType => {
          segmentTypes.add(segType)
        })
      }
    })
    if (segmentTypes.size === 0) {
      throw new Error('No segment types found in segmentation data')
    }
    console.log(`Found ${segmentTypes.size} segment types:`, Array.from(segmentTypes))
    
    // Build geography dimension - truly dynamic, no assumptions about structure
    // All geographies go into all_geographies, regardless of whether they're global, regions, or countries
    const geographyDimension: GeographyDimension = {
      global: geographies.length === 1 ? geographies : [], // If only one geography, treat as global
      regions: [], // Will be populated dynamically if needed
      countries: {}, // Will be populated dynamically if needed
      all_geographies: geographies, // All geographies from the data
      geography_hierarchy: {} // Will be populated if "By Region" or similar segment type exists
    }

    // Country to Region mapping for automatic grouping
    const countryToRegionMap: Record<string, string> = {
      // North America
      'U.S.': 'North America', 'USA': 'North America', 'United States': 'North America',
      'Canada': 'North America', 'Mexico': 'North America',
      // Europe
      'Germany': 'Europe', 'UK': 'Europe', 'U.K.': 'Europe', 'United Kingdom': 'Europe', 'France': 'Europe',
      'Italy': 'Europe', 'Spain': 'Europe', 'Russia': 'Europe', 'Netherlands': 'Europe',
      'Sweden': 'Europe', 'Switzerland': 'Europe', 'Belgium': 'Europe', 'Austria': 'Europe',
      'Poland': 'Europe', 'Norway': 'Europe', 'Denmark': 'Europe', 'Finland': 'Europe',
      'Ireland': 'Europe', 'Portugal': 'Europe', 'Greece': 'Europe', 'Czech Republic': 'Europe',
      'Romania': 'Europe', 'Hungary': 'Europe', 'Rest of Europe': 'Europe',
      // Asia Pacific
      'China': 'Asia Pacific', 'India': 'Asia Pacific', 'Japan': 'Asia Pacific',
      'South Korea': 'Asia Pacific', 'Australia': 'Asia Pacific', 'ASEAN': 'Asia Pacific',
      'Singapore': 'Asia Pacific', 'Malaysia': 'Asia Pacific', 'Thailand': 'Asia Pacific',
      'Indonesia': 'Asia Pacific', 'Philippines': 'Asia Pacific', 'Vietnam': 'Asia Pacific',
      'Taiwan': 'Asia Pacific', 'Hong Kong': 'Asia Pacific', 'New Zealand': 'Asia Pacific',
      'Rest of Asia Pacific': 'Asia Pacific', 'Rest of Asia': 'Asia Pacific',
      // Latin America
      'Brazil': 'Latin America', 'Argentina': 'Latin America', 'Chile': 'Latin America',
      'Colombia': 'Latin America', 'Peru': 'Latin America', 'Venezuela': 'Latin America',
      'Rest of Latin America': 'Latin America', 'Rest of South America': 'Latin America',
      // Middle East & Africa (also handles files that use "Middle East" without Africa)
      'Saudi Arabia': 'Middle East & Africa', 'UAE': 'Middle East & Africa',
      'United Arab Emirates': 'Middle East & Africa',
      'Israel': 'Middle East & Africa', 'South Africa': 'Middle East & Africa',
      'Egypt': 'Middle East & Africa', 'Turkey': 'Middle East & Africa',
      'Iran': 'Middle East & Africa', 'Iraq': 'Middle East & Africa',
      'Rest of Middle East': 'Middle East & Africa', 'Rest of Africa': 'Middle East & Africa',
      'North Africa': 'Middle East & Africa', 'Central Africa': 'Middle East & Africa',
      'Rest of Middle East & Africa': 'Middle East & Africa',
      // GCC
      'GCC': 'Middle East & Africa', 'Qatar': 'Middle East & Africa', 'Kuwait': 'Middle East & Africa',
      'Oman': 'Middle East & Africa', 'Bahrain': 'Middle East & Africa',
    }

    // Check for geography-related segment types and extract hierarchy
    const geographySegmentPatterns = [/^by\s*region$/i, /^region$/i, /^by\s*geography$/i, /^geography$/i]
    let geographySegmentType: string | null = null

    for (const segType of segmentTypes) {
      if (geographySegmentPatterns.some(pattern => pattern.test(segType))) {
        geographySegmentType = segType
        break
      }
    }

    // Also detect "By Country" segment type (used in multi-geography CSVs)
    const countrySegmentPatterns = [/^by\s*country$/i, /^country$/i]
    let countrySegmentType: string | null = null

    for (const segType of segmentTypes) {
      if (countrySegmentPatterns.some(pattern => pattern.test(segType))) {
        countrySegmentType = segType
        break
      }
    }

    if (countrySegmentType) {
      console.log(`Found country segment type: ${countrySegmentType}`)
    }

    // If we found a geography segment type, extract the hierarchy from it
    if (geographySegmentType) {
      console.log(`Found geography segment type: ${geographySegmentType}, extracting geography hierarchy...`)
      const geographyHierarchy: Record<string, string[]> = {}
      const allGeoItems: string[] = []

      // Extract hierarchy from structure data
      for (const geo of geographies) {
        const segTypeData = structureData[geo]?.[geographySegmentType]
        if (segTypeData && typeof segTypeData === 'object') {
          // First level children - could be regions OR countries
          const firstLevelItems = Object.keys(segTypeData).filter(key => {
            // Skip year keys and metadata
            return !/^\d{4}$/.test(key) && key !== 'CAGR' && key !== '_aggregated' && key !== '_level'
          })

          // Check if first level items are countries (using our mapping)
          const areCountries = firstLevelItems.some(item => countryToRegionMap[item] !== undefined)

          if (areCountries) {
            // First level items are countries - auto-group them into regions
            console.log('Detected countries at first level, auto-grouping into regions...')

            for (const country of firstLevelItems) {
              const regionName = countryToRegionMap[country] || 'Other'

              // Add region to hierarchy if not exists
              if (!geographyHierarchy[regionName]) {
                geographyHierarchy[regionName] = []
                if (!allGeoItems.includes(regionName)) {
                  allGeoItems.push(regionName)
                }
              }

              // Add country under its region
              if (!geographyHierarchy[regionName].includes(country)) {
                geographyHierarchy[regionName].push(country)
              }
              if (!allGeoItems.includes(country)) {
                allGeoItems.push(country)
              }
            }
          } else {
            // First level items are regions (original logic)
            for (const region of firstLevelItems) {
              if (!allGeoItems.includes(region)) {
                allGeoItems.push(region)
              }

              const regionData = segTypeData[region]
              if (regionData && typeof regionData === 'object') {
                // Second level children are countries/sub-regions
                const countries = Object.keys(regionData).filter(key => {
                  // Skip year keys, metadata, and self-references
                  return !/^\d{4}$/.test(key) && key !== 'CAGR' && key !== '_aggregated' && key !== '_level' && key !== region
                })

                if (countries.length > 0) {
                  if (!geographyHierarchy[region]) {
                    geographyHierarchy[region] = []
                  }

                  for (const country of countries) {
                    // Skip self-references (region name equals country name)
                    if (country === region) continue

                    if (!geographyHierarchy[region].includes(country)) {
                      geographyHierarchy[region].push(country)
                    }
                    if (!allGeoItems.includes(country)) {
                      allGeoItems.push(country)
                    }

                    // Check for third level (sub-countries/states)
                    const countryData = regionData[country]
                    if (countryData && typeof countryData === 'object') {
                      const subRegions = Object.keys(countryData).filter(key => {
                        // Skip year keys, metadata, and self-references
                        return !/^\d{4}$/.test(key) && key !== 'CAGR' && key !== '_aggregated' && key !== '_level' && key !== country
                      })

                      if (subRegions.length > 0) {
                        if (!geographyHierarchy[country]) {
                          geographyHierarchy[country] = []
                        }

                        for (const subRegion of subRegions) {
                          // Skip self-references
                          if (subRegion === country) continue

                          if (!geographyHierarchy[country].includes(subRegion)) {
                            geographyHierarchy[country].push(subRegion)
                          }
                          if (!allGeoItems.includes(subRegion)) {
                            allGeoItems.push(subRegion)
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Clean up empty hierarchy entries (regions with no actual children)
      const cleanedGeographyHierarchy: Record<string, string[]> = {}
      for (const [key, children] of Object.entries(geographyHierarchy)) {
        if (children && children.length > 0) {
          cleanedGeographyHierarchy[key] = children
        }
      }

      if (Object.keys(cleanedGeographyHierarchy).length > 0) {
        geographyDimension.geography_hierarchy = cleanedGeographyHierarchy
        // IMPORTANT: Do NOT add "By Region" segment items to all_geographies
        // all_geographies should only contain actual top-level geography keys from the data
        // The hierarchy is used for SEGMENT cascade filter, not geography filter
        // Only update all_geographies if the actual geographies (first-level keys) ARE the regions
        // Check if geographies are actual regions (like North America, Europe) vs just "Global"
        const isGlobalOnly = geographies.length === 1 && geographies[0].toLowerCase() === 'global'
        if (!isGlobalOnly) {
          // Geographies ARE the actual regions - keep them as is
          geographyDimension.all_geographies = geographies
        }
        // Set regions to the top-level items in the hierarchy (for segment cascade filter)
        geographyDimension.regions = Object.keys(cleanedGeographyHierarchy).filter(key =>
          !Object.values(cleanedGeographyHierarchy).some(children => children.includes(key))
        )
        console.log(`Geography hierarchy built with ${Object.keys(cleanedGeographyHierarchy).length} parent regions`)
        console.log('Geography hierarchy:', JSON.stringify(cleanedGeographyHierarchy, null, 2))
        console.log('all_geographies remains:', geographyDimension.all_geographies)
      } else {
        // No valid hierarchy found, keep all_geographies as the original geographies
        console.log('No valid geography hierarchy found (flat structure), using original geographies')
      }
    }

    // ============================================================
    // MULTI-GEOGRAPHY HIERARCHY: Enrich hierarchy from "By Country" data
    // When the Region column contains multiple geographies AND "By Country"
    // segment exists, use it to build region→country relationships.
    // ============================================================
    const isMultiGeography = geographies.length > 1
    const hasGlobalGeo = geographies.some(g => g.toLowerCase() === 'global')

    if (isMultiGeography && countrySegmentType) {
      console.log(`Multi-geography data with "${countrySegmentType}" segment detected, building hierarchy from By Country...`)
      const hierarchy = geographyDimension.geography_hierarchy || {}

      // For each geography that has "By Country" data, extract the country children
      for (const geo of geographies) {
        const countryData = structureData[geo]?.[countrySegmentType]
        if (countryData && typeof countryData === 'object') {
          const countries = Object.keys(countryData).filter(key =>
            !/^\d{4}$/.test(key) && key !== 'CAGR' && key !== '_aggregated' && key !== '_level' && key !== geo
          )
          if (countries.length > 0) {
            if (!hierarchy[geo]) hierarchy[geo] = []
            for (const country of countries) {
              if (!hierarchy[geo].includes(country)) {
                hierarchy[geo].push(country)
              }
            }
            console.log(`  ${geo} → [${countries.join(', ')}]`)
          }
        }
      }

      // If "By Region" data in Global gives us Global→regions, combine
      // Otherwise build Global→regions from geographies that have "By Country" (they are regions)
      if (hasGlobalGeo && !hierarchy['Global']) {
        const regions = Object.keys(hierarchy)
        if (regions.length > 0) {
          hierarchy['Global'] = regions
        }
      }

      geographyDimension.geography_hierarchy = hierarchy
      // Update all_geographies to include everything
      const allGeoSet = new Set(geographies)
      for (const children of Object.values(hierarchy)) {
        children.forEach(c => allGeoSet.add(c))
      }
      geographyDimension.all_geographies = Array.from(allGeoSet)
      geographyDimension.regions = Object.keys(hierarchy).filter(key =>
        key !== 'Global' && !Object.values(hierarchy).some(children => children.includes(key))
      )
      console.log('Multi-geo hierarchy:', JSON.stringify(hierarchy, null, 2))
    } else if (isMultiGeography && !countrySegmentType && !geographyDimension.geography_hierarchy?.['Global']) {
      // No "By Country" or "By Region" segments — auto-detect hierarchy from countryToRegionMap
      console.log('No geography segments found, auto-detecting hierarchy from region column...')
      const hierarchy: Record<string, string[]> = {}
      const regions = new Set<string>()
      const countries = new Set<string>()

      for (const geo of geographies) {
        if (geo.toLowerCase() === 'global') continue
        const mappedRegion = countryToRegionMap[geo]
        // Exact match first; then try prefix match for region name variants
        // e.g. map says "Middle East & Africa" but file has "Middle East"
        let parentRegion: string | undefined = undefined
        if (mappedRegion) {
          if (geographies.includes(mappedRegion)) {
            parentRegion = mappedRegion
          } else {
            // Try to find a geography that the mapped region starts with or vice versa
            parentRegion = geographies.find(g =>
              g !== geo &&
              (mappedRegion.startsWith(g) || g.startsWith(mappedRegion))
            )
          }
        }
        if (parentRegion) {
          // This geography is a country under an existing region
          if (!hierarchy[parentRegion]) hierarchy[parentRegion] = []
          if (!hierarchy[parentRegion].includes(geo)) hierarchy[parentRegion].push(geo)
          countries.add(geo)
          regions.add(parentRegion)
        } else if (!mappedRegion) {
          // Not in the map — could be a region itself
          regions.add(geo)
        }
      }

      if (hasGlobalGeo && regions.size > 0) {
        hierarchy['Global'] = Array.from(regions)
      }

      if (Object.keys(hierarchy).length > 0) {
        geographyDimension.geography_hierarchy = hierarchy
        geographyDimension.all_geographies = geographies
        geographyDimension.regions = Array.from(regions)
        console.log('Auto-detected hierarchy:', JSON.stringify(hierarchy, null, 2))
      }
    }
    // ============================================================

    console.log(`Geography dimension built with ${geographies.length} geographies:`, geographies)

    // Determine which segment types are geography-related (to optionally exclude from dropdown)
    const geoSegmentTypes = new Set<string>()
    if (geographySegmentType) geoSegmentTypes.add(geographySegmentType)
    if (countrySegmentType) geoSegmentTypes.add(countrySegmentType)

    // Process each segment type asynchronously
    const segments: Record<string, SegmentDimension> = {}
    const valueRecords: DataRecord[] = []
    const volumeRecords: DataRecord[] = []
    const segmentTypeIndex = 1

    for (const segmentType of segmentTypes) {
      // Skip geography segment types when we have multi-geography data
      // (they are summary rows, not real segments — actual data is in Region column)
      if (isMultiGeography && geoSegmentTypes.has(segmentType)) {
        console.log(`Skipping geography segment type "${segmentType}" (data already in Region column)`)
        continue
      }

      console.log(`Processing segment type: ${segmentType}`)

      // Check if this segment type is the geography segment type - if so, pass the geography hierarchy
      const isGeoSegmentType = geographySegmentType && segmentType === geographySegmentType
      const geoHierarchyForSegment = isGeoSegmentType ? geographyDimension.geography_hierarchy : undefined

      const { segmentDimension, records } = await processSegmentTypeAsync(
        structureData, // Use segmentation data for structure
        valueData,     // Use value data for numeric values
        volumeData,    // Use volume data for volume values
        segmentType,
        geographies,
        allYears,
        segmentTypeIndex,
        geoHierarchyForSegment // Pass geography hierarchy for "By Region" type
      )
      segments[segmentType] = segmentDimension
      valueRecords.push(...records)

      // Yield control between segment types
      await new Promise(resolve => setImmediate(resolve))
    }

    // Process volume data separately if available
    if (volumeData) {
      console.log('Processing volume data...')
      for (const segmentType of segmentTypes) {
        // Check if this segment type is the geography segment type
        const isGeoSegmentType = geographySegmentType && segmentType === geographySegmentType
        const geoHierarchyForSegment = isGeoSegmentType ? geographyDimension.geography_hierarchy : undefined

        const { records: volumeRecs } = await processSegmentTypeAsync(
          structureData,
          volumeData,  // Use volume data for numeric values
          null,
          segmentType,
          geographies,
          allYears,
          segmentTypeIndex,
          geoHierarchyForSegment // Pass geography hierarchy for "By Region" type
        )
        volumeRecords.push(...volumeRecs)
      }
    }
    
    // Process volume data if available (simplified for now)
    if (volumeData) {
      console.log('Processing volume data...')
      // Similar async processing for volume data can be added here
    }

    // ============================================================
    // FIX geography_level and parent_geography on records
    // When we have a hierarchy, update records to reflect their position
    // ============================================================
    if (isMultiGeography && geographyDimension.geography_hierarchy) {
      const hierarchy = geographyDimension.geography_hierarchy
      // Build a child→parent lookup
      const childToParent: Record<string, string> = {}
      for (const [parent, children] of Object.entries(hierarchy)) {
        for (const child of children) {
          childToParent[child] = parent
        }
      }
      const parentSet = new Set(Object.keys(hierarchy))

      const fixGeoLevel = (records: DataRecord[]) => {
        for (const record of records) {
          if (record.geography.toLowerCase() === 'global') {
            record.geography_level = 'global'
            record.parent_geography = null
          } else if (parentSet.has(record.geography) && childToParent[record.geography]) {
            // It's both a parent (has children) and a child (under Global) — it's a region
            record.geography_level = 'region'
            record.parent_geography = childToParent[record.geography] || 'Global'
          } else if (childToParent[record.geography]) {
            record.geography_level = 'country'
            record.parent_geography = childToParent[record.geography]
          } else if (parentSet.has(record.geography)) {
            record.geography_level = 'region'
            record.parent_geography = 'Global'
          }
        }
      }
      fixGeoLevel(valueRecords)
      if (volumeRecords.length > 0) fixGeoLevel(volumeRecords)
      console.log('Fixed geography_level on records for multi-geography data')
    }

    // ============================================================
    // POST-PROCESSING: Transform "By Region" records into geography records
    // This extracts regions/countries from "By Region" segment type and
    // creates new records with geography set to the country/region name,
    // enabling geography-based filtering in the dashboard.
    // ONLY for single-geography data (Format A: all rows Region="Global")
    // ============================================================
    if (geographySegmentType && !isMultiGeography) {
      console.log(`Post-processing "${geographySegmentType}" records into geography records...`)

      // Helper to create geography records from "By Region" records
      const transformByRegionRecords = (records: DataRecord[]): DataRecord[] => {
        const byRegionRecords = records.filter(r => r.segment_type === geographySegmentType)
        if (byRegionRecords.length === 0) return []

        const newRecords: DataRecord[] = []
        const regionChildren: Record<string, DataRecord[]> = {} // region name → country records

        // Step 1: Create country-level geography records
        for (const record of byRegionRecords) {
          const region = record.segment_hierarchy.level_1
          const country = record.segment_hierarchy.level_2 || record.segment

          // Skip if we can't determine region/country
          if (!region || !country) continue

          // Create a copy with geography = country
          newRecords.push({
            ...record,
            geography: country,
            geography_level: 'country',
            parent_geography: region,
          })

          // Track for region aggregation
          if (!regionChildren[region]) regionChildren[region] = []
          regionChildren[region].push(record)
        }

        // Step 2: Create region-aggregated records (sum of countries)
        for (const [region, countryRecords] of Object.entries(regionChildren)) {
          if (countryRecords.length === 0) continue

          // Aggregate time series across all countries in this region
          const aggregatedTimeSeries: Record<number, number> = {}
          for (const cr of countryRecords) {
            for (const [yearStr, value] of Object.entries(cr.time_series)) {
              const year = Number(yearStr)
              aggregatedTimeSeries[year] = (aggregatedTimeSeries[year] || 0) + (value as number)
            }
          }

          const regionCagr = calculateCAGRFromTimeSeries(
            aggregatedTimeSeries,
            METRICS_START_YEAR,
            METRICS_END_YEAR
          )

          newRecords.push({
            geography: region,
            geography_level: 'region',
            parent_geography: 'Global',
            segment_type: geographySegmentType,
            segment: region,
            segment_level: 'parent',
            segment_hierarchy: {
              level_1: region,
              level_2: '',
              level_3: '',
              level_4: '',
            },
            time_series: aggregatedTimeSeries,
            cagr: Math.round(regionCagr * 100) / 100,
            market_share: 0,
            is_aggregated: true,
            aggregation_level: 1,
          })
        }

        return newRecords
      }

      // Transform value records
      const newValueGeoRecords = transformByRegionRecords(valueRecords)
      valueRecords.push(...newValueGeoRecords)
      console.log(`Added ${newValueGeoRecords.length} geography value records (countries + region aggregates)`)

      // Transform volume records
      if (volumeRecords.length > 0) {
        const newVolumeGeoRecords = transformByRegionRecords(volumeRecords)
        volumeRecords.push(...newVolumeGeoRecords)
        console.log(`Added ${newVolumeGeoRecords.length} geography volume records`)
      }

      // Step 3: Build the geography hierarchy from the "By Region" data
      const regionHierarchy: Record<string, string[]> = {}
      const byRegionValueRecords = valueRecords.filter(
        r => r.segment_type === geographySegmentType && r.geography === 'Global'
      )
      for (const record of byRegionValueRecords) {
        const region = record.segment_hierarchy.level_1
        const country = record.segment_hierarchy.level_2 || record.segment
        if (region && country && region !== country) {
          if (!regionHierarchy[region]) regionHierarchy[region] = []
          if (!regionHierarchy[region].includes(country)) {
            regionHierarchy[region].push(country)
          }
        }
      }

      // Build full hierarchy with Global at the top
      const allRegions = Object.keys(regionHierarchy)
      if (allRegions.length > 0) {
        const fullHierarchy: Record<string, string[]> = {
          'Global': allRegions,
          ...regionHierarchy,
        }
        geographyDimension.geography_hierarchy = fullHierarchy

        // Update all_geographies to include Global + all regions + all countries
        const allGeoNames = new Set<string>(geographyDimension.all_geographies)
        for (const [region, countries] of Object.entries(regionHierarchy)) {
          allGeoNames.add(region)
          countries.forEach(c => allGeoNames.add(c))
        }
        geographyDimension.all_geographies = Array.from(allGeoNames)
        geographyDimension.regions = allRegions
        geographyDimension.countries = regionHierarchy

        console.log(`Geography hierarchy built: ${allRegions.length} regions, ${Object.values(regionHierarchy).flat().length} countries`)
        console.log('Regions:', allRegions)
        console.log('all_geographies:', geographyDimension.all_geographies)
      }
    }
    // ============================================================
    // END POST-PROCESSING
    // ============================================================

    // CAGR 2026–2033 and per-geography mean share % (2026–2033)
    applyMetricsToRecords(valueRecords)
    if (volumeRecords.length > 0) {
      applyMetricsToRecords(volumeRecords)
    }
    
    // Build metadata
    const metadata: Metadata = {
      market_name: geographies.join(', ') || 'Unknown Market',
      market_type: 'Market Analysis',
      industry: 'General',
      years: allYears,
      start_year: startYear,
      base_year: baseYear,
      forecast_year: forecastYear,
      historical_years: allYears.filter(y => y <= baseYear),
      forecast_years: allYears.filter(y => y > baseYear),
      currency: 'USD',
      value_unit: 'Million',
      volume_unit: options?.volumeUnit ?? 'Units',
      has_value: valueRecords.length > 0,
      has_volume: volumeRecords.length > 0,
    }
    
    console.log(`Async processing complete. Records: ${valueRecords.length} value, ${volumeRecords.length} volume`)
    
    return {
      metadata,
      dimensions: {
        geographies: geographyDimension,
        segments,
      },
      data: {
        value: {
          geography_segment_matrix: valueRecords,
        },
        volume: {
          geography_segment_matrix: volumeRecords,
        },
      },
    }
  } catch (error) {
    console.error('Error in processJsonDataAsync:', error)
    throw new Error(
      `Failed to process JSON data: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Synchronous version (kept for backward compatibility)
 * Note: This is a wrapper that calls the async version
 * For better performance, use processJsonDataAsync directly
 */
export function processJsonData(
  valueData: RawJsonData,
  volumeData: RawJsonData | null,
  segmentationData: RawJsonData | null
): ComparisonData {
  // This should not be called in the new async flow
  // But kept for any legacy code that might still use it
  throw new Error('Synchronous processJsonData is deprecated. Use processJsonDataAsync instead.')
}

/**
 * Load and process JSON files
 */
export async function loadAndProcessJsonFiles(
  valueJsonPath: string,
  volumeJsonPath: string | null = null,
  segmentationJsonPath: string | null = null,
  options?: ProcessJsonOptions
): Promise<ComparisonData> {
  try {
    console.log('Loading JSON files asynchronously...')
    
    // Read files in parallel using async fs
    const readPromises = [
      fs.readFile(valueJsonPath, 'utf-8'),
      volumeJsonPath ? fs.readFile(volumeJsonPath, 'utf-8').catch(() => null) : Promise.resolve(null),
      segmentationJsonPath ? fs.readFile(segmentationJsonPath, 'utf-8').catch(() => null) : Promise.resolve(null)
    ]
    
    const [valueContent, volumeContent, segmentationContent] = await Promise.all(readPromises)
    
    if (!valueContent) {
      throw new Error('Value JSON file is required but was not found')
    }
    
    console.log(`Value JSON size: ${(valueContent.length / 1024 / 1024).toFixed(2)} MB`)
    
    // Parse JSON asynchronously (using setImmediate to yield)
    let valueData: RawJsonData
    await new Promise<void>(resolve => {
      setImmediate(() => {
        try {
          valueData = JSON.parse(valueContent)
          console.log('Value JSON parsed successfully')
          resolve()
        } catch (error) {
          throw new Error(`Failed to parse value JSON: ${error instanceof Error ? error.message : String(error)}`)
        }
      })
    })
    
    let volumeData: RawJsonData | null = null
    if (volumeContent) {
      await new Promise<void>(resolve => {
        setImmediate(() => {
          try {
            volumeData = JSON.parse(volumeContent)
            console.log('Volume JSON parsed successfully')
          } catch (error) {
            console.warn(`Failed to parse volume JSON: ${error instanceof Error ? error.message : String(error)}`)
          }
          resolve()
        })
      })
    }
    
    let segmentationData: RawJsonData = valueData!
    if (segmentationContent) {
      await new Promise<void>(resolve => {
        setImmediate(() => {
          try {
            segmentationData = JSON.parse(segmentationContent)
            console.log('Segmentation JSON parsed successfully')
          } catch (error) {
            console.warn(`Failed to parse segmentation JSON: ${error instanceof Error ? error.message : String(error)}. Using value data.`)
            segmentationData = valueData!
          }
          resolve()
        })
      })
    } else {
      console.log('Using value data structure for segmentation')
    }
    
    // Process asynchronously
    console.log('Processing JSON data asynchronously...')
    const result = await processJsonDataAsync(valueData!, volumeData, segmentationData, options)
    console.log('JSON data processed successfully')
    
    return result
  } catch (error) {
    console.error('Error in loadAndProcessJsonFiles:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    throw new Error(
      `Failed to load/process JSON files: ${errorMessage}${errorStack ? `\nStack: ${errorStack}` : ''}`
    )
  }
}

