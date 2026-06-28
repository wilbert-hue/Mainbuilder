import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

/**
 * API Route to load distributors intelligence data from Excel file
 * 
 * Accepts optional query parameter:
 * - filePath: Path to distributors intelligence Excel file
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    // Try to load from CSV first (proposition data), then fall back to Excel
    const csvFilePath = searchParams.get('csvPath') || 'test csvs/proposition_1_data.csv'
    const filePath = searchParams.get('filePath') || 'Copy of Sample Framework_Customer Intelligence_U.S._Water Repair Products Market_CMI.xlsx'
    
    // Resolve file path (relative to project root, which is one level up from frontend-clean)
    const currentDir = process.cwd()
    const projectRoot = currentDir.endsWith('frontend-clean') 
      ? path.resolve(currentDir, '..') 
      : currentDir
    const fullPath = path.resolve(projectRoot, filePath)
    
    console.log('Loading distributors intelligence file:', {
      currentDir,
      projectRoot,
      filePath,
      csvFilePath
    })
    
    // Try to load CSV first (proposition data)
    const csvFullPath = path.resolve(projectRoot, csvFilePath)
    let csvData: any[] = []
    let csvPropositions: any[] = []
    
    try {
      await fs.access(csvFullPath)
      console.log('CSV file found, reading...')
      const csvBuffer = await fs.readFile(csvFullPath)
      const csvString = csvBuffer.toString('utf-8')
      
      // Parse CSV
      const csvWorkbook = XLSX.read(csvString, { 
        type: 'string',
        raw: false,
        codepage: 65001
      })
      
      const csvSheet = csvWorkbook.Sheets[csvWorkbook.SheetNames[0]]
      const csvJson = XLSX.utils.sheet_to_json(csvSheet, { 
        header: 1, 
        raw: false
      }) as any[][]
      
      if (csvJson.length > 1) {
        const csvHeaders = (csvJson[0] as any[]).map((h: any) => (h || '').toString().trim())
        for (let i = 1; i < csvJson.length; i++) {
          const row: Record<string, any> = {}
          const rowData = csvJson[i] as any[]
          for (let j = 0; j < csvHeaders.length && j < rowData.length; j++) {
            row[csvHeaders[j]] = rowData[j]
          }
          csvData.push(row)
        }
        
        // Create propositions from CSV data
        csvData.forEach((row, index) => {
          if (row['Company Name'] && row['Company Name'] !== 'xx') {
            csvPropositions.push({
              sheet: 'Proposition 1',
              row: index + 2,
              column: 'Company Name',
              value: row['Company Name'],
              category: row['End User Type'] || 'General',
              fullRow: row
            })
            
            if (row['End User Type'] && row['End User Type'] !== 'xx') {
              csvPropositions.push({
                sheet: 'Proposition 1',
                row: index + 2,
                column: 'End User Type',
                value: row['End User Type'],
                category: 'End User Type',
                fullRow: row
              })
            }
          }
        })
        
        console.log(`Loaded ${csvData.length} rows and ${csvPropositions.length} propositions from CSV`)
      }
    } catch (csvError) {
      console.log('CSV file not found or error reading CSV, will try Excel:', csvError)
    }
    
    // Try to load Excel file
    let workbook: XLSX.WorkBook | null = null
    let excelPropositions: any[] = []
    let sheetsData: Record<string, any[]> = {}
    
    try {
      await fs.access(fullPath)
      console.log('Excel file found, reading...')
      const fileBuffer = await fs.readFile(fullPath)
      workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    } catch (accessError) {
      console.log('Excel file not found, using CSV data only')
      // If Excel not found but we have CSV data, continue with CSV only
      if (csvData.length === 0) {
        return NextResponse.json(
          { 
            error: 'Distributors intelligence file not found',
            message: `Neither CSV nor Excel file found. CSV: ${csvFilePath}, Excel: ${filePath}`,
            fullPath: fullPath,
            csvPath: csvFullPath,
            currentDir: currentDir,
            projectRoot: projectRoot,
            data: null
          },
          { status: 404 }
        )
      }
    }
    
    // Process Excel if available
    let totalFields = 0
    const firstSheetHeaders: string[] = []
    
    if (workbook) {
      const sheetNames = workbook.SheetNames
      
      if (sheetNames.length === 0) {
        console.warn('Excel file has no sheets')
      } else {
        for (const sheetName of sheetNames) {
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
          continue // Skip empty sheets
        }
        
        // Get headers
        const headers = (jsonData[0] as any[]).map((h: any) => (h || '').toString().trim())
        
        // Store headers from first sheet for metadata
        if (firstSheetHeaders.length === 0) {
          firstSheetHeaders.push(...headers)
          totalFields = headers.length
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
        
        sheetsData[sheetName] = rows
        
        // Extract propositions from rows (look for proposition-related columns)
        rows.forEach((row, index) => {
          // Look for proposition columns (case-insensitive)
          // Also check for columns that might contain proposition data
          const propColumns = headers.filter(h => {
            if (!h || typeof h !== 'string') return false
            const lowerH = h.toLowerCase()
            return (
              lowerH.includes('proposition') || 
              lowerH.includes('value proposition') ||
              lowerH.includes('proposal') ||
              lowerH.includes('value prop') ||
              (lowerH.includes('prop') && (lowerH.includes('1') || lowerH.includes('2') || lowerH.includes('3')))
            )
          })
          
          // Also check for numbered proposition columns (Proposition 1, Proposition 2, etc.)
          const numberedPropColumns = headers.filter(h => {
            if (!h || typeof h !== 'string') return false
            const lowerH = h.toLowerCase().trim()
            return /^proposition\s*\d+/i.test(lowerH) || /^prop\s*\d+/i.test(lowerH)
          })
          
          const allPropColumns = [...propColumns, ...numberedPropColumns]
          
          if (allPropColumns.length > 0) {
            allPropColumns.forEach(propCol => {
              const value = row[propCol]
              if (value && value.toString().trim() !== '') {
                excelPropositions.push({
                  sheet: sheetName,
                  row: index + 2, // +2 because we start from row 2 (after header)
                  column: propCol,
                  value: value.toString().trim(),
                  fullRow: row
                })
              }
            })
          }
          
          // Also check if the row itself might be a proposition (if it has specific markers)
          // Some Excel files might have propositions in separate rows
          const rowValues = Object.values(row).filter(v => v && v.toString().trim() !== '')
          if (rowValues.length > 0) {
            // Check if this looks like a proposition row (has keywords)
            const rowText = rowValues.join(' ').toLowerCase()
            if (rowText.includes('proposition') || rowText.includes('value prop')) {
              rowValues.forEach((val, valIdx) => {
                const header = headers[valIdx]
                if (header && val.toString().trim() !== '') {
                  excelPropositions.push({
                    sheet: sheetName,
                    row: index + 2,
                    column: header,
                    value: val.toString().trim(),
                    fullRow: row
                  })
                }
              })
            }
          }
        })
          } catch (sheetError) {
            console.error(`Error processing sheet ${sheetName}:`, sheetError)
            // Continue with other sheets even if one fails
            continue
          }
        }
      }
    }
    
    // Combine CSV and Excel propositions
    const allPropositions = [...csvPropositions, ...excelPropositions]
    
    // Combine CSV and Excel data
    if (csvData.length > 0) {
      sheetsData['Proposition 1'] = csvData
    }
    
    // Calculate total fields (use existing totalFields if set from Excel, otherwise calculate)
    if (totalFields === 0) {
      if (csvData.length > 0 && csvData[0]) {
        totalFields = Object.keys(csvData[0]).length
      } else if (Object.keys(sheetsData).length > 0) {
        const firstSheet = Object.values(sheetsData)[0]
        if (firstSheet && firstSheet.length > 0 && firstSheet[0]) {
          totalFields = Object.keys(firstSheet[0]).length
        }
      }
    }
    
    // Structure the response similar to DistributorsIntelligenceData
    // For now, we'll create a simplified structure that can be used for heatmap
    const response = {
      metadata: {
        source_file: csvData.length > 0 ? csvFilePath : filePath,
        modules: ['Module 1 - Standard'], // Default module
        module_info: {
          'Module 1 - Standard': {
            sections: Object.keys(sheetsData),
            total_fields: totalFields
          }
        },
        generated_at: new Date().toISOString(),
        total_sheets: Object.keys(sheetsData).length,
        total_propositions: allPropositions.length
      },
      data: {
        'Module 1 - Standard': sheetsData[Object.keys(sheetsData)[0]] || csvData || [], // Use first available data
        sheets: sheetsData, // All sheets data
        propositions: allPropositions // All extracted propositions
      },
      sections: {
        'Module 1 - Standard': {}
      }
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error loading distributors intelligence data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json(
      { 
        error: 'Failed to load distributors intelligence data',
        message: errorMessage,
        stack: errorStack,
        data: null
      },
      { status: 500 }
    )
  }
}

