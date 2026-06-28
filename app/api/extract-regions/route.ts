import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * API Route to extract unique regions from uploaded Excel/CSV file
 * 
 * Accepts multipart/form-data with:
 * - valueFile: Excel or CSV file (required)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const valueFile = formData.get('valueFile') as File | null
    
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
    
    // Convert file to buffer
    const valueBuffer = Buffer.from(await valueFile.arrayBuffer())
    const isValueCsv = valueFileName.endsWith('.csv')
    
    // Read workbook
    let workbook: XLSX.WorkBook
    if (isValueCsv) {
      const csvString = valueBuffer.toString('utf-8')
      workbook = XLSX.read(csvString, { 
        type: 'string',
        raw: false,
        codepage: 65001
      })
    } else {
      workbook = XLSX.read(valueBuffer, { type: 'buffer' })
    }
    
    // Get first sheet
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    
    // Convert to JSON array
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      raw: false
    }) as any[][]
    
    if (jsonData.length < 2) {
      return NextResponse.json(
        { error: 'File has no data rows' },
        { status: 400 }
      )
    }
    
    // Get headers
    const headers = (jsonData[0] as any[]).map((h: any) => (h || '').toString().trim())
    
    // Detect region/geography column (first segmentation column)
    const regionPatterns = [/^region$/i, /^geography$/i]
    let regionColumn: string | null = null
    
    for (const header of headers) {
      const normalized = header.trim()
      if (regionPatterns.some(pattern => pattern.test(normalized))) {
        regionColumn = normalized
        break
      }
    }
    
    if (!regionColumn) {
      return NextResponse.json(
        { error: 'Could not detect region/geography column. Please ensure your file has a "Region" or "Geography" column.' },
        { status: 400 }
      )
    }
    
    // Extract unique regions
    const regionIndex = headers.indexOf(regionColumn)
    const regionsSet = new Set<string>()
    
    for (let i = 1; i < jsonData.length; i++) {
      const rowData = jsonData[i] as any[]
      if (regionIndex < rowData.length) {
        const region = (rowData[regionIndex] || '').toString().trim()
        if (region) {
          regionsSet.add(region)
        }
      }
    }
    
    const regions = Array.from(regionsSet).sort()
    
    return NextResponse.json({
      regions,
      regionColumn
    })
  } catch (error) {
    console.error('Error extracting regions:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      {
        error: 'Failed to extract regions',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

