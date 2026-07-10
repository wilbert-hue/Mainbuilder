import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import {
  DEFAULT_INTELLIGENCE_DEMO_ROW_COUNT,
  ensureIntelligenceRows,
  type DemoGenerationContext,
} from '@/lib/intelligence-demo-generator'

export const dynamic = 'force-dynamic'
export const maxDuration = 300
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'

// Helper to create response with CORS headers
function createResponse(data: any, status: number = 200) {
  const response = NextResponse.json(data, { status })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '86400')
  return response
}

function alignPropositionPayload(
  payload: IntelligenceSheetPayload,
  demoContext: DemoGenerationContext
): IntelligenceSheetPayload {
  const rows = ensureIntelligenceRows(
    payload.headers,
    payload.rows as Record<string, unknown>[],
    demoContext
  )
  return { ...payload, rows, rowCount: rows.length }
}

/**
 * Detects if the first row contains parent headers (merged cells spanning multiple columns)
 * Parent headers are identified by having some cells empty while others have values
 */
function detectParentHeaders(row1: any[], row2: any[]): { hasParentHeaders: boolean; parentHeaders: { name: string; startCol: number; colSpan: number }[] } {
  if (!row1 || !row2 || row1.length === 0 || row2.length === 0) {
    return { hasParentHeaders: false, parentHeaders: [] }
  }

  // Check if row1 has significantly fewer non-empty cells than row2 (indicating merged parent headers)
  const row1NonEmpty = row1.filter(cell => cell !== undefined && cell !== null && String(cell).trim() !== '').length
  const row2NonEmpty = row2.filter(cell => cell !== undefined && cell !== null && String(cell).trim() !== '').length

  // If row1 has fewer than half the non-empty cells of row2, it likely has parent headers
  // Also check if row2 looks like actual column headers (more specific text)
  const hasParentHeaders = row1NonEmpty > 0 && row1NonEmpty < row2NonEmpty && row2NonEmpty >= 3

  if (!hasParentHeaders) {
    return { hasParentHeaders: false, parentHeaders: [] }
  }

  // Build parent headers with their column spans
  const parentHeaders: { name: string; startCol: number; colSpan: number }[] = []
  let currentParent: { name: string; startCol: number; colSpan: number } | null = null

  for (let i = 0; i < Math.max(row1.length, row2.length); i++) {
    const parentCell = row1[i]
    const hasParentValue = parentCell !== undefined && parentCell !== null && String(parentCell).trim() !== ''

    if (hasParentValue) {
      // New parent header starts
      if (currentParent) {
        parentHeaders.push(currentParent)
      }
      currentParent = {
        name: String(parentCell).trim(),
        startCol: i,
        colSpan: 1
      }
    } else if (currentParent) {
      // Continue current parent's span
      currentParent.colSpan++
    } else {
      // No parent for this column (columns before first parent header)
      // Create empty parent
      if (parentHeaders.length === 0 || parentHeaders[parentHeaders.length - 1].name !== '') {
        currentParent = {
          name: '',
          startCol: i,
          colSpan: 1
        }
      } else {
        parentHeaders[parentHeaders.length - 1].colSpan++
      }
    }
  }

  // Don't forget the last parent
  if (currentParent) {
    parentHeaders.push(currentParent)
  }

  console.log('Detected parent headers:', parentHeaders)

  return { hasParentHeaders: true, parentHeaders }
}

/** First column normalized for matching S.No. style row markers */
function normalizeFirstColCell(value: any): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\r\n/g, '\n')
}

/**
 * Find the row index where the data table starts (parent / header row with S.No. etc.)
 */
function findHeaderBlockStartRow(rows: any[][]): number {
  const markers = ['s.no.', 's.no', 's no.', 's no', 'sr.', 'sr no', 'serial no.', 'serial no']
  for (let i = 0; i < Math.max(0, rows.length - 1); i++) {
    const c0 = normalizeFirstColCell(rows[i]?.[0])
    const normalized = c0.replace(/\.$/, '')
    for (const m of markers) {
      if (normalized === m) return i
    }
  }
  for (let i = 0; i < rows.length - 1; i++) {
    const d = detectParentHeaders(rows[i] || [], rows[i + 1] || [])
    if (d.hasParentHeaders) return i
  }
  return -1
}

function pickPropositionSheetName(sheetNames: string[], propositionNumber: number): string | null {
  const re = new RegExp(`proposition\\s*${propositionNumber}(?!\\d)`, 'i')
  const matches = sheetNames.filter((n) => re.test(n))
  return matches[0] || null
}

type IntelligenceSheetPayload = {
  type: string
  headers: string[]
  parentHeaders: { name: string; startCol: number; colSpan: number }[] | null
  rows: Record<string, any>[]
  rowCount: number
  sheetName: string
}

/**
 * Process one sheet's grid (array-of-rows) into headers + rows (same shape as single-file API).
 */
function processIntelligenceJsonGrid(
  jsonData: any[][],
  intelligenceType: string,
  sheetName: string,
  demoContext: DemoGenerationContext
): IntelligenceSheetPayload {
  if (jsonData.length === 0) {
    throw new Error(`Sheet "${sheetName}" has no rows`)
  }

  const headerStart = findHeaderBlockStartRow(jsonData)
  if (headerStart < 0) {
    throw new Error(
      `Sheet "${sheetName}": could not find table headers. Expected a row starting with S.No. (or a two-row parent/child header block).`
    )
  }

  const { hasParentHeaders, parentHeaders } = detectParentHeaders(
    jsonData[headerStart] || [],
    jsonData[headerStart + 1] || []
  )

  let headers: string[]
  let dataStartRow: number

  if (hasParentHeaders) {
    headers = (jsonData[headerStart + 1] || []).map((h: any) => String(h || '').trim())
    dataStartRow = headerStart + 2
  } else {
    headers = (jsonData[headerStart] || []).map((h: any) => String(h || '').trim())
    dataStartRow = headerStart + 1
  }

  const headerIndices: number[] = []
  const filteredHeaders: string[] = []
  headers.forEach((h, index) => {
    if (h) {
      filteredHeaders.push(h)
      headerIndices.push(index)
    }
  })

  const rawRows = jsonData.slice(dataStartRow).filter((row) => {
    return row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== '')
  }).map((row: any[]) => {
    const rowData: Record<string, unknown> = {}
    filteredHeaders.forEach((header, idx) => {
      const originalIndex = headerIndices[idx]
      const value = row[originalIndex]
      if (value === null || value === undefined || value === '') {
        rowData[header] = ''
      } else {
        rowData[header] = String(value).trim()
      }
    })
    return rowData
  })

  const rows = ensureIntelligenceRows(filteredHeaders, rawRows, demoContext)

  let adjustedParentHeaders: { name: string; startCol: number; colSpan: number }[] = []
  if (hasParentHeaders) {
    adjustedParentHeaders = parentHeaders
      .map((ph) => {
        let newStartCol = -1
        let newColSpan = 0

        for (let i = 0; i < filteredHeaders.length; i++) {
          const originalIndex = headerIndices[i]
          if (originalIndex >= ph.startCol && originalIndex < ph.startCol + ph.colSpan) {
            if (newStartCol === -1) newStartCol = i
            newColSpan++
          }
        }

        return {
          name: ph.name,
          startCol: newStartCol >= 0 ? newStartCol : 0,
          colSpan: newColSpan,
        }
      })
      .filter((ph) => ph.colSpan > 0)
  }

  return {
    type: intelligenceType,
    headers: filteredHeaders,
    parentHeaders: hasParentHeaders ? adjustedParentHeaders : null,
    rows,
    rowCount: rows.length,
    sheetName,
  }
}

function processMultiPropositionWorkbook(
  workbook: XLSX.WorkBook,
  intelligenceType: string,
  demoContext: DemoGenerationContext
): {
  success: true
  multiPropositionFramework: true
  proposition1: IntelligenceSheetPayload
  proposition2: IntelligenceSheetPayload
  proposition3: IntelligenceSheetPayload
} {
  const names = workbook.SheetNames
  const s1 = pickPropositionSheetName(names, 1)
  const s2 = pickPropositionSheetName(names, 2)
  const s3 = pickPropositionSheetName(names, 3)

  if (!s1) {
    throw new Error(
      'No worksheet found for Proposition 1. Name a sheet with "Proposition 1" (e.g. "Proposition 1 - Standard").'
    )
  }
  if (!s2) {
    throw new Error(
      'No worksheet found for Proposition 2. Name a sheet with "Proposition 2" (e.g. "Proposition 2 - Advance").'
    )
  }
  if (!s3) {
    throw new Error(
      'No worksheet found for Proposition 3. Name a sheet with "Proposition 3" (e.g. "Proposition 3 - Premium").'
    )
  }

  const ws1 = workbook.Sheets[s1]
  const ws2 = workbook.Sheets[s2]
  const ws3 = workbook.Sheets[s3]

  const grid1 = XLSX.utils.sheet_to_json(ws1, { header: 1, raw: true }) as any[][]
  const grid2 = XLSX.utils.sheet_to_json(ws2, { header: 1, raw: true }) as any[][]
  const grid3 = XLSX.utils.sheet_to_json(ws3, { header: 1, raw: true }) as any[][]

  const p1 = processIntelligenceJsonGrid(grid1, intelligenceType, s1, demoContext)
  const p2 = processIntelligenceJsonGrid(grid2, intelligenceType, s2, demoContext)
  const p3 = processIntelligenceJsonGrid(grid3, intelligenceType, s3, demoContext)

  const maxRows = Math.max(
    p1.rows.length,
    p2.rows.length,
    p3.rows.length,
    demoContext.targetRowCount ?? DEFAULT_INTELLIGENCE_DEMO_ROW_COUNT
  )
  const alignedCtx: DemoGenerationContext = { ...demoContext, targetRowCount: maxRows }

  return {
    success: true,
    multiPropositionFramework: true,
    proposition1: alignPropositionPayload(p1, alignedCtx),
    proposition2: alignPropositionPayload(p2, alignedCtx),
    proposition3: alignPropositionPayload(p3, alignedCtx),
  }
}

/**
 * API Route to process Intelligence CSV/Excel files
 * Preserves data structure as-is and detects parent headers
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Processing intelligence file request...')

    const contentType = request.headers.get('content-type') || ''
    let fileName: string
    let fileBuffer: Buffer
    let intelligenceType: string = 'distributor'
    let marketName = 'Global market'

    // Handle JSON request (base64 encoded file)
    if (contentType.includes('application/json')) {
      console.log('Processing JSON request with base64 data')
      const body = await request.json()

      if (!body.fileData || !body.fileName) {
        return createResponse(
          { error: 'Missing fileData or fileName in request body' },
          400
        )
      }

      fileName = body.fileName.toLowerCase()
      fileBuffer = Buffer.from(body.fileData, 'base64')
      intelligenceType = body.intelligenceType || 'distributor'
      marketName =
        (body.marketName as string) ||
        (body.dashboardName as string) ||
        marketName

      console.log('File name:', body.fileName, 'Size:', fileBuffer.length)
    }
    // Handle FormData request (legacy support)
    else if (contentType.includes('multipart/form-data')) {
      console.log('Processing FormData request')
      let formData: FormData
      try {
        formData = await request.formData()
        console.log('FormData parsed successfully')
      } catch (formError: any) {
        console.error('FormData parsing error:', formError.message)
        return createResponse(
          {
            error: 'Failed to parse form data',
            details: formError.message,
            hint: 'Please try refreshing the page and uploading again.'
          },
          400
        )
      }

      const intelligenceFile = formData.get('intelligenceFile') as File | null
      intelligenceType = formData.get('intelligenceType') as string || 'distributor'
      marketName =
        (formData.get('marketName') as string) ||
        (formData.get('dashboardName') as string) ||
        marketName

      if (!intelligenceFile) {
        return createResponse(
          { error: 'intelligenceFile is required' },
          400
        )
      }

      fileName = intelligenceFile.name.toLowerCase()
      fileBuffer = Buffer.from(await intelligenceFile.arrayBuffer())
      console.log('File name:', intelligenceFile.name, 'Size:', fileBuffer.length)
    }
    else {
      return createResponse(
        { error: 'Unsupported content type. Use application/json or multipart/form-data' },
        400
      )
    }

    console.log('Intelligence type:', intelligenceType)
    console.log('Market name for demo generation:', marketName)

    const demoContext: DemoGenerationContext = {
      marketName,
      intelligenceType,
    }

    // Validate file types
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))

    if (!hasValidExtension) {
      return createResponse(
        { error: 'File must be Excel (.xlsx, .xls) or CSV (.csv)' },
        400
      )
    }

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
      return createResponse(
        { error: 'File has no sheets' },
        400
      )
    }

    // Excel: if the workbook defines Proposition 1–3 sheets (e.g. sample framework), process all three at once
    if (!isCsv) {
      const names = workbook.SheetNames
      const s1 = pickPropositionSheetName(names, 1)
      const s2 = pickPropositionSheetName(names, 2)
      const s3 = pickPropositionSheetName(names, 3)
      if (s1 && s2 && s3) {
        try {
          const out = processMultiPropositionWorkbook(workbook, intelligenceType, demoContext)
          return createResponse(out)
        } catch (e: any) {
          return createResponse(
            { error: e?.message || 'Failed to process multi-proposition workbook' },
            400
          )
        }
      }
      if (s1) {
        const grid = XLSX.utils.sheet_to_json(workbook.Sheets[s1], { header: 1, raw: true }) as any[][]
        try {
          const payload = processIntelligenceJsonGrid(grid, intelligenceType, s1, demoContext)
          return createResponse({
            success: true,
            data: {
              type: payload.type,
              headers: payload.headers,
              parentHeaders: payload.parentHeaders,
              rows: payload.rows,
              rowCount: payload.rowCount,
              sheetName: payload.sheetName,
            },
            message: `Processed ${payload.rowCount} rows from ${payload.sheetName}`,
          })
        } catch (e: any) {
          return createResponse({ error: e?.message || 'Failed to process sheet' }, 400)
        }
      }
    }

    // Process first sheet only (CSV, or Excel without Proposition N sheet names)
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    console.log(`Processing sheet: ${firstSheetName}`)

    // Convert to JSON array (preserving structure)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Array of arrays
      raw: true // Keep raw values as-is
    }) as any[][]

    console.log(`Sheet ${firstSheetName} has ${jsonData.length} rows`)

    if (jsonData.length === 0) {
      return createResponse(
        { error: 'File has no data rows' },
        400
      )
    }

    // Detect if we have parent headers (two-row header structure)
    const { hasParentHeaders, parentHeaders } = detectParentHeaders(jsonData[0], jsonData[1])

    let headers: string[]
    let dataStartRow: number

    if (hasParentHeaders) {
      // Two-row header structure: row 0 = parent headers, row 1 = child headers
      headers = (jsonData[1] || []).map((h: any) =>
        String(h || '').trim()
      )
      dataStartRow = 2
      console.log('Using two-row header structure')
      console.log('Parent headers:', parentHeaders)
      console.log('Child headers:', headers)
    } else {
      // Single-row header structure
      headers = (jsonData[0] || []).map((h: any) =>
        String(h || '').trim()
      )
      dataStartRow = 1
      console.log('Using single-row header structure')
    }

    // Filter out empty headers but keep track of their indices
    const headerIndices: number[] = []
    const filteredHeaders: string[] = []
    headers.forEach((h, index) => {
      if (h) {
        filteredHeaders.push(h)
        headerIndices.push(index)
      }
    })

    console.log(`Headers found:`, filteredHeaders)

    const rawRows = jsonData.slice(dataStartRow).filter(row => {
      return row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')
    }).map((row: any[]) => {
      const rowData: Record<string, unknown> = {}
      filteredHeaders.forEach((header, idx) => {
        const originalIndex = headerIndices[idx]
        const value = row[originalIndex]
        if (value === null || value === undefined || value === '') {
          rowData[header] = ''
        } else {
          rowData[header] = String(value).trim()
        }
      })
      return rowData
    })

    const rows = ensureIntelligenceRows(filteredHeaders, rawRows, demoContext)

    console.log(`Processed ${rows.length} data rows`)
    if (rows.length > 0) {
      console.log(`Sample row:`, rows[0])
    }

    // Adjust parent headers to account for filtered empty headers
    let adjustedParentHeaders: { name: string; startCol: number; colSpan: number }[] = []
    if (hasParentHeaders) {
      // Map parent headers to filtered header indices
      adjustedParentHeaders = parentHeaders.map(ph => {
        // Find how many filtered headers fall within this parent's range
        let newStartCol = -1
        let newColSpan = 0

        for (let i = 0; i < filteredHeaders.length; i++) {
          const originalIndex = headerIndices[i]
          if (originalIndex >= ph.startCol && originalIndex < ph.startCol + ph.colSpan) {
            if (newStartCol === -1) newStartCol = i
            newColSpan++
          }
        }

        return {
          name: ph.name,
          startCol: newStartCol >= 0 ? newStartCol : 0,
          colSpan: newColSpan > 0 ? newColSpan : 1
        }
      }).filter(ph => ph.colSpan > 0) // Remove parents with no child headers
    }

    // Return simplified structure for raw table display
    return createResponse({
      success: true,
      data: {
        type: intelligenceType,
        headers: filteredHeaders,
        parentHeaders: hasParentHeaders ? adjustedParentHeaders : null,
        rows: rows,
        rowCount: rows.length,
        sheetName: firstSheetName
      },
      message: `Processed ${rows.length} rows from ${firstSheetName}`
    })

  } catch (error: any) {
    console.error('Error processing intelligence file:', error)
    return createResponse(
      {
        error: 'Failed to process file',
        details: error.message
      },
      500
    )
  }
}

