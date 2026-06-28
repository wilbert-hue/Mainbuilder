import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { promises as fs } from 'fs'
import path from 'path'
import { parseCustomerIntelligenceFromData } from '@/lib/customer-intelligence-data'

export const dynamic = 'force-dynamic'

/**
 * API Route to load customer intelligence data from Excel file
 * 
 * Accepts optional query parameter:
 * - filePath: Path to customer intelligence Excel file (default: Copy of Sample Framework_Customer Intelligence_U.S._Water Repair Products Market_CMI.xlsx)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('filePath') || 'Copy of Sample Framework_Customer Intelligence_U.S._Water Repair Products Market_CMI.xlsx'
    
    // Resolve file path (relative to project root, which is one level up from frontend-clean)
    const currentDir = process.cwd()
    const projectRoot = currentDir.endsWith('frontend-clean') 
      ? path.resolve(currentDir, '..') 
      : currentDir
    const fullPath = path.resolve(projectRoot, filePath)
    
    console.log('Loading customer intelligence file:', {
      currentDir,
      projectRoot,
      filePath,
      fullPath
    })
    
    // Check if file exists
    try {
      await fs.access(fullPath)
    } catch {
      return NextResponse.json(
        { 
          error: 'Customer intelligence file not found',
          message: `File not found at: ${filePath}`,
          data: [] // Return empty array so dashboard can still render
        },
        { status: 404 }
      )
    }
    
    // Read Excel file
    const fileBuffer = await fs.readFile(fullPath)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    
    if (workbook.SheetNames.length === 0) {
      return NextResponse.json(
        { 
          error: 'Excel file has no sheets',
          data: []
        },
        { status: 400 }
      )
    }
    
    // Process all sheets and combine data
    const allRows: Record<string, any>[] = []
    
    for (const sheetName of workbook.SheetNames) {
      try {
        const worksheet = workbook.Sheets[sheetName]
        
        if (!worksheet) {
          console.warn(`Sheet ${sheetName} is empty or invalid, skipping`)
          continue
        }
        
        // Convert to JSON array
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          raw: false
        }) as any[][]
        
        if (jsonData.length < 2) {
          console.warn(`Sheet ${sheetName} has no data rows, skipping`)
          continue
        }
        
        // Get headers
        const headers = (jsonData[0] as any[]).map((h: any) => (h || '').toString().trim())
        
        // Log headers for first sheet to help debug
        if (allRows.length === 0) {
          console.log(`Processing sheet: ${sheetName}`)
          console.log(`Headers found (${headers.length}):`, headers)
          if (jsonData.length > 1) {
            console.log('Sample first data row:', jsonData[1])
          }
        }
        
        // Convert rows to objects - be more lenient, include all rows with data
        for (let i = 1; i < jsonData.length; i++) {
          const row: Record<string, any> = {}
          const rowData = jsonData[i] as any[]
          
          // Check if row has any meaningful data
          const hasData = rowData.some(cell => cell !== null && cell !== undefined && cell !== '')
          
          if (!hasData) {
            continue // Skip completely empty rows
          }
          
          for (let j = 0; j < headers.length && j < rowData.length; j++) {
            const header = headers[j]
            const value = rowData[j]
            // Only add non-empty values
            if (header && (value !== null && value !== undefined && value !== '')) {
              row[header] = value
            }
          }
          
          // Add all rows with at least one field (be less restrictive)
          if (Object.keys(row).length > 0) {
            allRows.push({
              ...row,
              _sheet: sheetName,
              _rowIndex: i + 1
            })
          }
        }
      } catch (sheetError) {
        console.error(`Error processing sheet ${sheetName}:`, sheetError)
        // Continue with other sheets even if one fails
        continue
      }
    }
    
    console.log(`Total rows extracted: ${allRows.length}`)
    if (allRows.length > 0) {
      console.log('Sample row structure:', Object.keys(allRows[0]))
      console.log('First row sample:', allRows[0])
    }
    
    if (allRows.length === 0) {
      return NextResponse.json(
        { 
          error: 'No customer intelligence data found in Excel file',
          message: 'No rows with data were found. Please check the Excel file structure.',
          data: []
        },
        { status: 400 }
      )
    }
    
    // Parse customer intelligence data
    console.log('Parsing customer intelligence data...')
    const customerData = parseCustomerIntelligenceFromData(allRows)
    console.log(`Parsed ${customerData.length} customer intelligence cells with ${customerData.reduce((sum, cell) => sum + cell.customerCount, 0)} total customers`)
    
    // Return structured data
    const response = {
      metadata: {
        source_file: filePath,
        total_customers: customerData.reduce((sum, cell) => sum + cell.customerCount, 0),
        total_cells: customerData.length,
        generated_at: new Date().toISOString()
      },
      data: customerData
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error loading customer intelligence data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json(
      { 
        error: 'Failed to load customer intelligence data',
        message: errorMessage,
        stack: errorStack,
        data: []
      },
      { status: 500 }
    )
  }
}

