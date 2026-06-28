import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * API Route to process Competitive Intelligence CSV/Excel files
 * Preserves data structure as-is, similar to process-intelligence-file
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const competitiveFile = formData.get('competitiveFile') as File | null
    
    if (!competitiveFile) {
      return NextResponse.json(
        { error: 'competitiveFile is required' },
        { status: 400 }
      )
    }
    
    // Validate file types
    const fileName = competitiveFile.name.toLowerCase()
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
    
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: 'File must be Excel (.xlsx, .xls) or CSV (.csv)' },
        { status: 400 }
      )
    }
    
    // Convert file to buffer
    const fileBuffer = Buffer.from(await competitiveFile.arrayBuffer())
    const isCsv = fileName.endsWith('.csv')
    
    // Read workbook
    let workbook: XLSX.WorkBook
    if (isCsv) {
      const csvString = fileBuffer.toString('utf-8')
      workbook = XLSX.read(csvString, { 
        type: 'string',
        raw: true // Preserve raw values
      })
    } else {
      workbook = XLSX.read(fileBuffer, { 
        type: 'buffer',
        raw: true // Preserve raw values
      })
    }
    
    if (workbook.SheetNames.length === 0) {
      return NextResponse.json(
        { error: 'File has no sheets' },
        { status: 400 }
      )
    }
    
    // Process first sheet only (for simplicity)
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    
    console.log(`Processing competitive intelligence sheet: ${firstSheetName}`)
    
    // Convert to JSON array (preserving structure)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, // Array of arrays
      raw: true // Keep raw values as-is
    }) as any[][]
    
    console.log(`Sheet ${firstSheetName} has ${jsonData.length} rows`)
    
    if (jsonData.length === 0) {
      return NextResponse.json(
        { error: 'File has no data rows' },
        { status: 400 }
      )
    }
    
    // First row is headers
    const headers = (jsonData[0] || []).map((h: any) => 
      String(h || '').trim()
    ).filter(h => h) // Remove empty headers
    
    console.log(`Headers found:`, headers)
    
    // Rest are data rows - preserve all values exactly as they are
    const rows = jsonData.slice(1).filter(row => {
      // Filter out completely empty rows
      return row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')
    }).map((row: any[]) => {
      const rowData: Record<string, any> = {}
      headers.forEach((header, index) => {
        const value = row[index]
        // Preserve values exactly as-is (including "xx", "N/A", empty strings, etc.)
        if (value === null || value === undefined) {
          rowData[header] = ''
        } else {
          rowData[header] = String(value).trim()
        }
      })
      return rowData
    })
    
    console.log(`Processed ${rows.length} competitive intelligence data rows`)
    if (rows.length > 0) {
      console.log(`Sample row:`, rows[0])
    }
    
    // Return simplified structure for raw table display
    return NextResponse.json({
      success: true,
      data: {
        headers: headers,
        rows: rows,
        rowCount: rows.length,
        sheetName: firstSheetName
      },
      message: `Processed ${rows.length} rows from ${firstSheetName}`
    })
    
  } catch (error: any) {
    console.error('Error processing competitive intelligence file:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process file',
        details: error.message 
      },
      { status: 500 }
    )
  }
}


