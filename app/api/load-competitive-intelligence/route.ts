import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { parseCompetitiveIntelligenceFromData } from '@/lib/competitive-intelligence-data'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

/**
 * API Route to load competitive intelligence data from CSV file
 * 
 * Accepts optional query parameter:
 * - filePath: Path to competitive intelligence CSV file (default: test csvs/competitive_intelligence_input.csv)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('filePath') || 'test csvs/competitive_intelligence_input.csv'
    
    // Resolve file path (relative to project root, which is one level up from frontend-clean)
    const currentDir = process.cwd()
    // If we're in frontend-clean, go up one level to project root
    const projectRoot = currentDir.endsWith('frontend-clean') 
      ? path.resolve(currentDir, '..') 
      : currentDir
    const fullPath = path.resolve(projectRoot, filePath)
    
    // Check if file exists
    try {
      await fs.access(fullPath)
    } catch {
      return NextResponse.json(
        { 
          error: 'Competitive intelligence file not found',
          message: `File not found at: ${filePath}`,
          companies: [] // Return empty array so dashboard can still render
        },
        { status: 404 }
      )
    }
    
    // Read file
    const fileBuffer = await fs.readFile(fullPath)
    const csvString = fileBuffer.toString('utf-8')
    
    // Parse CSV using XLSX
    const workbook = XLSX.read(csvString, { 
      type: 'string',
      raw: false,
      codepage: 65001 // UTF-8
    })
    
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
        { 
          error: 'CSV file has no data rows',
          companies: []
        },
        { status: 400 }
      )
    }
    
    // Get headers
    const headers = (jsonData[0] as any[]).map((h: any) => (h || '').toString().trim())
    
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
    
    // Parse competitive intelligence data
    const companies = parseCompetitiveIntelligenceFromData(rows)
    
    // Calculate market share data with colors
    // Import chart colors for consistent coloring
    const CHART_COLORS = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6366f1'
    ]
    
    const marketShareData = companies.map((company, index) => ({
      company: company.name,
      marketShare: company.marketShare,
      color: CHART_COLORS[index % CHART_COLORS.length] || '#94a3b8'
    }))
    
    // Return structured data
    const response = {
      metadata: {
        market: 'Competitive Intelligence Market',
        year: 2024,
        currency: 'USD',
        revenue_unit: 'Mn',
        total_companies: companies.length
      },
      companies,
      market_share_data: marketShareData
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error loading competitive intelligence data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to load competitive intelligence data',
        message: error instanceof Error ? error.message : 'Unknown error',
        companies: []
      },
      { status: 500 }
    )
  }
}

