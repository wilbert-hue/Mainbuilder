import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// Increase timeout for large file processing
export const maxDuration = 300
export const dynamic = 'force-dynamic'

// Local types for pricing data
interface PricingSegmentHierarchy {
  level_1: string
  level_2: string | null
  level_3: string | null
  level_4: string | null
  level_5?: string | null
}

interface PricingDataRecord {
  geography: string
  segment: string
  segment_type: string
  segment_hierarchy: PricingSegmentHierarchy
  time_series: Record<string, number>
  cagr: number | null
  is_aggregated: boolean
  aggregation_level: number
}

interface PricingSegmentDimension {
  type: 'flat' | 'hierarchical'
  items: string[]
  hierarchy: Record<string, string[]>
}

interface PricingComparisonData {
  metadata: {
    value_unit: string
    volume_unit: string | null
    start_year: number
    forecast_year: number
    base_year: number
    total_records: number
  }
  dimensions: {
    geographies: {
      all_geographies: string[]
      global: string[]
      regions: string[]
      countries: Record<string, string[]>
    }
    segments: Record<string, PricingSegmentDimension>
    time: {
      years: number[]
      range: [number, number]
    }
  }
  data: {
    value: {
      geography_segment_matrix: PricingDataRecord[]
    }
    volume: {
      geography_segment_matrix: PricingDataRecord[]
    } | null
  }
}

/**
 * Parse CSV/Excel data into PricingComparisonData format for pricing analysis
 * Expected columns: Region, Segment, Sub-segment, Year1, Year2, ... YearN
 */
function parsePricingData(data: any[]): PricingComparisonData {
  // Extract unique values
  const geographies = new Set<string>()
  const segmentTypes = new Set<string>()
  const years = new Set<number>()

  // Get year columns from the first row
  const yearColumns: string[] = []
  if (data.length > 0) {
    const firstRow = data[0]
    for (const key of Object.keys(firstRow)) {
      // Check if the key is a year (4 digits)
      if (/^\d{4}$/.test(key)) {
        yearColumns.push(key)
        years.add(parseInt(key))
      }
    }
  }

  // Process each row
  for (const row of data) {
    const region = row['Region'] || row['region'] || row['Geography'] || row['geography'] || ''
    const segment = row['Segment'] || row['segment'] || row['Segment Type'] || ''

    if (region) geographies.add(region)
    if (segment) segmentTypes.add(segment)
  }

  // Sort years
  const sortedYears = Array.from(years).sort((a, b) => a - b)
  const startYear = sortedYears[0] || 2020
  const endYear = sortedYears[sortedYears.length - 1] || 2032
  const baseYear = sortedYears.find(y => y >= 2024) || sortedYears[Math.floor(sortedYears.length / 2)] || 2024

  // Build geography segment matrix
  const geographySegmentMatrix: PricingDataRecord[] = []

  for (const row of data) {
    const region = row['Region'] || row['region'] || row['Geography'] || row['geography'] || ''
    const segmentType = row['Segment'] || row['segment'] || row['Segment Type'] || ''
    const subSegment = row['Sub-segment'] || row['sub-segment'] || row['Sub Segment'] || row['SubSegment'] || ''

    if (!region || !subSegment) continue

    // Build time series
    const timeSeries: Record<string, number> = {}
    for (const yearCol of yearColumns) {
      let value = row[yearCol]
      if (value !== undefined && value !== null && value !== '') {
        // Parse the value - remove commas and convert to number
        if (typeof value === 'string') {
          value = parseFloat(value.replace(/,/g, ''))
        }
        if (!isNaN(value)) {
          timeSeries[yearCol] = value
        }
      }
    }

    // Calculate CAGR if we have start and end years
    let cagr: number | null = null
    const startValue = timeSeries[startYear.toString()]
    const endValue = timeSeries[endYear.toString()]
    if (startValue && endValue && startValue > 0) {
      const numYears = endYear - startYear
      if (numYears > 0) {
        cagr = ((Math.pow(endValue / startValue, 1 / numYears) - 1) * 100)
        cagr = Math.round(cagr * 100) / 100 // Round to 2 decimal places
      }
    }

    const record: PricingDataRecord = {
      geography: region,
      segment: subSegment,
      segment_type: segmentType,
      segment_hierarchy: {
        level_1: subSegment,
        level_2: null,
        level_3: null,
        level_4: null,
        level_5: null
      },
      time_series: timeSeries,
      cagr,
      is_aggregated: false,
      aggregation_level: 1
    }

    geographySegmentMatrix.push(record)
  }

  // Build segment dimensions
  const segmentDimensions: Record<string, PricingSegmentDimension> = {}

  for (const segmentType of segmentTypes) {
    const segmentItems = data
      .filter(row => (row['Segment'] || row['segment'] || row['Segment Type'] || '') === segmentType)
      .map(row => row['Sub-segment'] || row['sub-segment'] || row['Sub Segment'] || row['SubSegment'] || '')
      .filter(Boolean)

    const uniqueItems = Array.from(new Set(segmentItems))

    // Build hierarchy (flat for now - all items at level 1)
    const hierarchy: Record<string, string[]> = {}
    for (const item of uniqueItems) {
      hierarchy[item] = []
    }

    segmentDimensions[segmentType] = {
      type: 'flat',
      items: uniqueItems,
      hierarchy
    }
  }

  // Build the PricingComparisonData structure
  const comparisonData: PricingComparisonData = {
    metadata: {
      value_unit: 'USD/Unit',
      volume_unit: null,
      start_year: startYear,
      forecast_year: endYear,
      base_year: baseYear,
      total_records: geographySegmentMatrix.length
    },
    dimensions: {
      geographies: {
        all_geographies: Array.from(geographies),
        global: ['Global'],
        regions: [],
        countries: {}
      },
      segments: segmentDimensions,
      time: {
        years: sortedYears,
        range: [startYear, endYear]
      }
    },
    data: {
      value: {
        geography_segment_matrix: geographySegmentMatrix
      },
      volume: null
    }
  }

  return comparisonData
}

/**
 * POST endpoint to process pricing analysis CSV/Excel file
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('pricingFile') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const fileName = file.name.toLowerCase()
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))

    if (!hasValidExtension) {
      return NextResponse.json(
        { error: 'File must be an Excel file (.xlsx, .xls) or CSV file (.csv)' },
        { status: 400 }
      )
    }

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer())

    // Parse with XLSX library
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'File is empty or could not be parsed' },
        { status: 400 }
      )
    }

    console.log(`Processing pricing file with ${data.length} rows`)
    console.log('Sample row:', JSON.stringify(data[0], null, 2))
    console.log('Available columns:', Object.keys(data[0]))

    // Parse into PricingComparisonData format
    const comparisonData = parsePricingData(data)

    console.log(`Processed ${comparisonData.data.value.geography_segment_matrix.length} records`)
    console.log(`Geographies: ${comparisonData.dimensions.geographies.all_geographies.join(', ')}`)
    console.log(`Segment Types: ${Object.keys(comparisonData.dimensions.segments).join(', ')}`)

    return NextResponse.json({
      success: true,
      data: comparisonData
    })

  } catch (error) {
    console.error('Error processing pricing analysis file:', error)
    return NextResponse.json(
      {
        error: 'Failed to process pricing analysis file',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
