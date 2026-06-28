/**
 * Excel to JSON Converter
 * Converts Excel files to the hierarchical JSON structure expected by the dashboard
 */

import * as XLSX from 'xlsx'

export interface RawJsonData {
  [geography: string]: {
    [segmentType: string]: {
      [key: string]: any
    }
  }
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Clean and convert cell values to appropriate types
 */
function cleanValue(value: any): any {
  if (value === null || value === undefined || value === '') {
    return null
  }
  
  if (typeof value === 'string') {
    // Trim first to remove leading/trailing spaces
    let trimmed = value.trim()
    
    // Handle empty or dash values (with optional spaces)
    if (trimmed === '' || trimmed === '-' || /^-\s*$/.test(trimmed)) {
      return null
    }
    
    // Remove all quotes (single, double, triple) from numbers
    // Handle cases like " 6,342.75 " or """1,681.14"""
    let cleaned = trimmed.replace(/^["']+|["']+$/g, '') // Remove outer quotes
    cleaned = cleaned.replace(/["']/g, '') // Remove any remaining quotes
    cleaned = cleaned.trim() // Remove leading/trailing spaces after quote removal
    
    // Remove commas from numbers (but preserve the number itself)
    const withoutCommas = cleaned.replace(/,/g, '')
    
    // Try to convert to number
    const numValue = parseFloat(withoutCommas)
    if (!isNaN(numValue) && isFinite(numValue)) {
      return numValue
    }
    
    // If it's a percentage, return as string (but clean it first)
    if (trimmed.includes('%')) {
      return trimmed.trim()
    }
    
    return trimmed
  }
  
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? null : value
  }
  
  return value
}

/**
 * Detect segmentation columns from headers
 * Looks for: Region, Geography, Segment, Sub-segment, etc.
 */
export function detectSegmentationColumns(headers: string[]): string[] {
  const segmentationPatterns = [
    /^region$/i,
    /^geography$/i,
    /^segment$/i,
    /^sub[- ]?segment$/i,
    /^sub[- ]?segment\s*\d+$/i,
    /^level\s*\d+$/i,
    /^category$/i,
    /^sub[- ]?category$/i
  ]
  
  const segColumns: string[] = []
  
  for (const header of headers) {
    const normalized = header.trim()
    if (!normalized) continue
    
    // Check if it matches any segmentation pattern
    const isSegColumn = segmentationPatterns.some(pattern => pattern.test(normalized))
    
    // Also check for numbered sub-segments
    if (/^sub[- ]?segment\s*\d+$/i.test(normalized) || /^level\s*\d+$/i.test(normalized)) {
      segColumns.push(normalized)
    } else if (isSegColumn) {
      segColumns.push(normalized)
    }
  }
  
  // Sort to ensure proper order (Region/Geography first, then Segment, then Sub-segments)
  segColumns.sort((a, b) => {
    const aLower = a.toLowerCase()
    const bLower = b.toLowerCase()
    
    // Region/Geography first
    if (aLower.includes('region') || aLower.includes('geography')) return -1
    if (bLower.includes('region') || bLower.includes('geography')) return 1
    
    // Segment next
    if (aLower.includes('segment') && !aLower.includes('sub')) return -1
    if (bLower.includes('segment') && !bLower.includes('sub')) return 1
    
    // Then sub-segments in order
    const aNum = parseInt(a.match(/\d+/)?.[0] || '0')
    const bNum = parseInt(b.match(/\d+/)?.[0] || '0')
    if (aNum !== bNum) return aNum - bNum
    
    return a.localeCompare(b)
  })
  
  return segColumns
}

/**
 * Detect year columns (4-digit years)
 */
export function detectYearColumns(headers: string[]): string[] {
  const yearColumns: string[] = []
  const yearPattern = /^\d{4}$/
  
  for (const header of headers) {
    const normalized = header.trim()
    if (yearPattern.test(normalized)) {
      yearColumns.push(normalized)
    }
  }
  
  return yearColumns.sort()
}

/**
 * Remove consecutive repeated values in segmentation columns
 * Similar to the Python version's remove_consecutive_repeats
 */
function removeConsecutiveRepeats(
  rows: Record<string, any>[],
  segmentColumns: string[]
): Record<string, any>[] {
  if (rows.length === 0) return rows
  
  const filteredRows: Record<string, any>[] = []
  let i = 0
  
  while (i < rows.length) {
    const currentRow = rows[i]
    const segmentValues = segmentColumns.map(col => 
      (currentRow[col] || '').toString().trim()
    )
    
    // Find the end of consecutive repeats
    let j = i + 1
    while (j < rows.length) {
      const nextRow = rows[j]
      const nextSegmentValues = segmentColumns.map(col => 
        (nextRow[col] || '').toString().trim()
      )
      
      // Check if any segmentation column has changed
      if (segmentValues.join('|') !== nextSegmentValues.join('|')) {
        break
      }
      j++
    }
    
    // Keep only the last row of consecutive repeats
    if (j > i + 1) {
      filteredRows.push(rows[j - 1])
    } else {
      filteredRows.push(currentRow)
    }
    
    i = j
  }
  
  return filteredRows
}

/**
 * Build nested JSON structure from rows
 * Structure: Geography > SegmentType > ...segments... > { Year: value }
 */
function buildNestedStructure(
  rows: Record<string, any>[],
  segmentColumns: string[],
  yearColumns: string[],
  includeData: boolean = true
): RawJsonData {
  const result: RawJsonData = {}
  
  // Determine geography column (first column) and segment type column (second column)
  const geographyColumn = segmentColumns[0] || 'Region'
  const segmentTypeColumn = segmentColumns[1] || 'Segment'
  const remainingSegments = segmentColumns.slice(2)
  
  for (const row of rows) {
    const geography = (row[geographyColumn] || '').toString().trim()
    const segmentType = (row[segmentTypeColumn] || '').toString().trim()
    
    if (!geography || !segmentType) continue
    
    // Initialize geography if not exists
    if (!result[geography]) {
      result[geography] = {}
    }
    
    // Initialize segment type if not exists
    if (!result[geography][segmentType]) {
      result[geography][segmentType] = {}
    }
    
    // Navigate/create nested structure for remaining segments
    let current = result[geography][segmentType]
    let lastProcessedIndex = -1
    
    for (let i = 0; i < remainingSegments.length; i++) {
      const col = remainingSegments[i]
      const value = (row[col] || '').toString().trim()
      
      if (!value) {
        // Empty segment - break and use the last processed segment as the leaf
        break
      }

      // Skip repeated segment values — they signal a leaf node in the CSV format.
      // e.g. "Integrated IVL Systems, Integrated IVL Systems, Integrated IVL Systems"
      // means the segment has no real sub-hierarchy; place the data at the first level.
      if (i > 0) {
        const prevValue = (row[remainingSegments[i - 1]] || '').toString().trim()
        if (value === prevValue) {
          // currentPath already navigated into the correct leaf node.
          // The fallback block after this loop will add year data to `current`.
          break
        }
      }

      lastProcessedIndex = i
      
      // Create the key if it doesn't exist
      if (!current[value]) {
        if (i === remainingSegments.length - 1) {
          // Last level - create object with year data or empty object
          if (includeData) {
            current[value] = {}
            // Always create year keys, even if values are null
            for (const yearCol of yearColumns) {
              const cleanedValue = cleanValue(row[yearCol])
              current[value][yearCol] = cleanedValue !== undefined ? cleanedValue : null
            }
            // Add CAGR if present
            if (row['CAGR'] !== undefined && row['CAGR'] !== null && row['CAGR'] !== '') {
              current[value]['CAGR'] = cleanValue(row['CAGR'])
            }
          } else {
            current[value] = {}
          }
        } else {
          // Intermediate level - create empty object
          current[value] = {}
        }
      } else if (i === remainingSegments.length - 1 && includeData) {
        // If we're at the last level and the key exists, update data
        // Ensure all year keys exist
        for (const yearCol of yearColumns) {
          const cleanedValue = cleanValue(row[yearCol])
          current[value][yearCol] = cleanedValue !== undefined ? cleanedValue : null
        }
        if (row['CAGR'] !== undefined && row['CAGR'] !== null && row['CAGR'] !== '') {
          current[value]['CAGR'] = cleanValue(row['CAGR'])
        }
      }
      
      current = current[value]
    }
    
    // If we processed at least one segment but didn't reach the last one (due to empty segments),
    // we need to add the year data to the current level (which is the last processed segment)
    if (lastProcessedIndex >= 0 && lastProcessedIndex < remainingSegments.length - 1 && includeData) {
      // Current already points to the last processed segment level, so add year data directly
      if (current && typeof current === 'object') {
        for (const yearCol of yearColumns) {
          const cleanedValue = cleanValue(row[yearCol])
          current[yearCol] = cleanedValue !== undefined ? cleanedValue : null
        }
        if (row['CAGR'] !== undefined && row['CAGR'] !== null && row['CAGR'] !== '') {
          current['CAGR'] = cleanValue(row['CAGR'])
        }
      }
    }
  }
  
  return result
}

/**
 * Validate Excel file format
 */
export function validateExcelFormat(workbook: XLSX.WorkBook): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    errors.push('Excel file has no sheets')
    return { valid: false, errors, warnings }
  }
  
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]
  
  if (!worksheet) {
    errors.push(`Sheet "${firstSheetName}" is empty or invalid`)
    return { valid: false, errors, warnings }
  }
  
  // Convert to JSON to get headers
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
  
  if (jsonData.length === 0) {
    errors.push('Excel sheet is empty')
    return { valid: false, errors, warnings }
  }
  
  const headers = (jsonData[0] as any[]).map((h: any) => (h || '').toString().trim())
  
  if (headers.length === 0) {
    errors.push('Excel sheet has no headers')
    return { valid: false, errors, warnings }
  }
  
  // Check for segmentation columns
  const segColumns = detectSegmentationColumns(headers)
  if (segColumns.length === 0) {
    errors.push('No segmentation columns found. Expected columns like: Region, Segment, Sub-segment, etc.')
  } else if (segColumns.length < 2) {
    warnings.push('Only one segmentation column found. Expected at least: Region/Geography and Segment')
  }
  
  // Check for year columns
  const yearColumns = detectYearColumns(headers)
  if (yearColumns.length === 0) {
    errors.push('No year columns found. Expected columns with 4-digit years (e.g., 2018, 2019, 2020)')
  }
  
  // Check for data rows
  if (jsonData.length < 2) {
    warnings.push('No data rows found in Excel sheet')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Convert Excel/CSV file buffer to JSON structure
 */
export function convertExcelToJson(excelBuffer: Buffer, isCsv: boolean = false): RawJsonData {
  // Read workbook - handle CSV differently
  let workbook: XLSX.WorkBook
  if (isCsv) {
    // For CSV, read as string first with proper options
    const csvString = excelBuffer.toString('utf-8')
    workbook = XLSX.read(csvString, { 
      type: 'string',
      raw: false, // Parse values instead of keeping raw strings
      codepage: 65001 // UTF-8
    })
  } else {
    // For Excel files, read as buffer
    workbook = XLSX.read(excelBuffer, { type: 'buffer' })
  }
  
  // Validate format
  const validation = validateExcelFormat(workbook)
  if (!validation.valid) {
    throw new Error(`Invalid file format: ${validation.errors.join('; ')}`)
  }
  
  // Get first sheet
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]
  
  // Convert to JSON array
  // For CSV, we want to parse values properly, so use raw: false
  // For Excel, raw: false also helps with number parsing
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, 
    defval: '',
    raw: false, // Always parse values (convert strings to numbers where possible)
    blankrows: false // Skip blank rows
  }) as any[][]
  
  if (jsonData.length < 2) {
    throw new Error('File has no data rows')
  }
  
  // Get headers
  const headers = (jsonData[0] as any[]).map((h: any) => (h || '').toString().trim())
  
  // Detect columns
  const segmentColumns = detectSegmentationColumns(headers)
  const yearColumns = detectYearColumns(headers)
  
  if (segmentColumns.length === 0) {
    throw new Error('Could not detect segmentation columns')
  }
  
  if (yearColumns.length === 0) {
    throw new Error('Could not detect year columns')
  }
  
  // Convert rows to objects
  const rows: Record<string, any>[] = []
  for (let i = 1; i < jsonData.length; i++) {
    const row: Record<string, any> = {}
    const rowData = jsonData[i] as any[]
    
    for (let j = 0; j < headers.length && j < rowData.length; j++) {
      row[headers[j]] = rowData[j]
    }
    
    rows.push(row)
  }
  
  // Remove consecutive repeats
  const filteredRows = removeConsecutiveRepeats(rows, segmentColumns)
  
  // Build nested structure
  const nestedStructure = buildNestedStructure(
    filteredRows,
    segmentColumns,
    yearColumns,
    true // include data
  )
  
  return nestedStructure
}

/**
 * Convert Excel/CSV files (value and volume) to JSON structures
 */
export function convertExcelFiles(
  valueBuffer: Buffer,
  volumeBuffer?: Buffer,
  isValueCsv: boolean = false,
  isVolumeCsv: boolean = false
): { value: RawJsonData; volume?: RawJsonData } {
  const value = convertExcelToJson(valueBuffer, isValueCsv)
  
  let volume: RawJsonData | undefined
  if (volumeBuffer) {
    volume = convertExcelToJson(volumeBuffer, isVolumeCsv)
  }
  
  return { value, volume }
}

