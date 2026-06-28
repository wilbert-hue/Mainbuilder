import { NextRequest, NextResponse } from 'next/server'
import { convertExcelFiles } from '@excel-upload-tool/lib/excel-processor'
import { loadAndProcessJsonFiles } from '@/lib/json-processor'
import { generateDashboardFiles, createZipFile } from '@/lib/dashboard-generator'
import {
  ingestTimingsExposed,
  logIngestTimings,
  toServerTimingHeader,
} from '@/lib/server-ingest-timings'
import * as fs from 'fs/promises'
import * as path from 'path'
import { writeFile } from 'fs/promises'

// Timeout for large file processing and zip generation (5 minutes - Vercel limit)
// Note: Vercel free/hobby plan has a 300 second (5 minute) limit
export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * API Route to generate a deployment-ready dashboard package
 *
 * Accepts multipart/form-data with:
 * - valueFile: Excel or CSV file for value data (optional if intelligence data provided)
 * - volumeFile: Excel or CSV file for volume data (optional)
 * - projectName: Name for the generated project (optional)
 * - intelligenceData: JSON string of intelligence data (optional)
 * - proposition2Data: JSON string of proposition 2 data (optional)
 * - proposition3Data: JSON string of proposition 3 data (optional)
 * - intelligenceType: Type of intelligence data ('customer' | 'distributor')
 */
export async function POST(request: NextRequest) {
  const routeStart = performance.now()
  const metrics: Record<string, number> = {}
  try {
    let tick = performance.now()
    const formData = await request.formData()
    const valueFile = formData.get('valueFile') as File | null
    const volumeFile = formData.get('volumeFile') as File | null
    const projectName = (formData.get('projectName') as string | null) || 'market-dashboard'

    // Get intelligence data from form
    const intelligenceDataStr = formData.get('intelligenceData') as string | null
    const proposition2DataStr = formData.get('proposition2Data') as string | null
    const proposition3DataStr = formData.get('proposition3Data') as string | null
    const intelligenceType = formData.get('intelligenceType') as string | null
    const distributorIntelligenceDataStr = formData.get('distributorIntelligenceData') as string | null
    const distributorProposition2DataStr = formData.get('distributorProposition2Data') as string | null
    const distributorProposition3DataStr = formData.get('distributorProposition3Data') as string | null

    // Parse intelligence data (large JSON payloads)
    const intelligenceData = intelligenceDataStr ? JSON.parse(intelligenceDataStr) : null
    const proposition2Data = proposition2DataStr ? JSON.parse(proposition2DataStr) : null
    const proposition3Data = proposition3DataStr ? JSON.parse(proposition3DataStr) : null
    const distributorIntelligenceData = distributorIntelligenceDataStr
      ? JSON.parse(distributorIntelligenceDataStr)
      : null
    const distributorProposition2Data = distributorProposition2DataStr
      ? JSON.parse(distributorProposition2DataStr)
      : null
    const distributorProposition3Data = distributorProposition3DataStr
      ? JSON.parse(distributorProposition3DataStr)
      : null
    metrics.parseFormDataMs = Math.round(performance.now() - tick)

    // Check if we have any data at all
    const hasIntelligenceData =
      intelligenceData ||
      proposition2Data ||
      proposition3Data ||
      distributorIntelligenceData ||
      distributorProposition2Data ||
      distributorProposition3Data

    if (!valueFile && !hasIntelligenceData) {
      return NextResponse.json(
        { error: 'Either valueFile or intelligence data is required' },
        { status: 400 }
      )
    }
    
    // Validate file types (only if valueFile is provided)
    let comparisonData = null

    if (valueFile) {
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

      console.log('Starting dashboard generation with market data...')

      tick = performance.now()
      const valueBuffer = Buffer.from(await valueFile.arrayBuffer())
      const volumeBuffer = volumeFile ? Buffer.from(await volumeFile.arrayBuffer()) : undefined
      metrics.readFileBuffersMs = Math.round(performance.now() - tick)

      // Detect file types
      const isValueCsv = valueFileName.endsWith('.csv')
      const isVolumeCsv = volumeFile ? volumeFile.name.toLowerCase().endsWith('.csv') : false

      // Convert Excel/CSV to JSON
      console.log('Converting Excel/CSV files to JSON...')
      tick = performance.now()
      const { value: valueJson, volume: volumeJson } = convertExcelFiles(
        valueBuffer,
        volumeBuffer,
        isValueCsv,
        isVolumeCsv
      )
      metrics.spreadsheetToJsonMs = Math.round(performance.now() - tick)

      // Create temporary JSON files for processing
      // Use /tmp in serverless environments (Vercel, AWS Lambda) which is the only writable directory
      // /tmp is guaranteed to exist in serverless environments, so we don't need to create it
      const os = require('os')
      const tempDir = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? '/tmp' : os.tmpdir()

      const tempValuePath = path.join(tempDir, `value_${Date.now()}.json`)
      const tempVolumePath = volumeJson ? path.join(tempDir, `volume_${Date.now()}.json`) : null
      const tempSegmentationPath = path.join(tempDir, `segmentation_${Date.now()}.json`)

      // Write JSON files
      await writeFile(tempValuePath, JSON.stringify(valueJson, null, 2), 'utf-8')
      if (tempVolumePath && volumeJson) {
        await writeFile(tempVolumePath, JSON.stringify(volumeJson, null, 2), 'utf-8')
      }

      // Create segmentation structure (without data, just structure)
      const segmentationJson = JSON.parse(JSON.stringify(valueJson))
      const removeYearData = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) return obj

        const result: any = {}
        for (const [key, value] of Object.entries(obj)) {
          if (/^\d{4}$/.test(key) || key === 'CAGR') {
            continue
          }

          if (typeof value === 'object' && value !== null) {
            result[key] = removeYearData(value)
          } else {
            result[key] = value
          }
        }

        return result
      }

      const segmentationStructure = removeYearData(segmentationJson)
      await writeFile(tempSegmentationPath, JSON.stringify(segmentationStructure, null, 2), 'utf-8')

      // Process JSON files through existing pipeline
      console.log('Processing JSON files through pipeline...')
      tick = performance.now()
      comparisonData = await loadAndProcessJsonFiles(
        tempValuePath,
        tempVolumePath,
        tempSegmentationPath
      )
      metrics.tempWriteMarketPipelineMs = Math.round(performance.now() - tick)

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
    } else {
      console.log('Starting dashboard generation with intelligence data only...')
    }

    // Prepare intelligence data for the generator
    const intelligencePackageData = {
      intelligenceData,
      proposition2Data,
      proposition3Data,
      distributorIntelligenceData,
      distributorProposition2Data,
      distributorProposition3Data,
      intelligenceType
    }

    // Generate dashboard files
    console.log('Generating dashboard files...')
    tick = performance.now()
    const files = await generateDashboardFiles(comparisonData, projectName, intelligencePackageData)
    metrics.generateDashboardFilesMs = Math.round(performance.now() - tick)

    // Create zip file
    console.log('Creating zip file...')
    tick = performance.now()
    const zipBuffer = await createZipFile(files)
    metrics.createZipMs = Math.round(performance.now() - tick)

    metrics.totalMs = Math.round(performance.now() - routeStart)
    console.log('Dashboard generation completed successfully')

    logIngestTimings('generate-dashboard', {
      ...metrics,
      zipBytes: zipBuffer.length,
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${projectName}.zip"`,
      'Content-Length': zipBuffer.length.toString(),
    }
    if (ingestTimingsExposed()) {
      const { totalMs: _t, ...stagesSansTotal } = metrics
      headers['Server-Timing'] = toServerTimingHeader(stagesSansTotal, metrics.totalMs)
    }

    return new NextResponse(new Uint8Array(zipBuffer), { headers })
  } catch (error) {
    console.error('Error generating dashboard:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorDetails = error instanceof Error && error.stack ? error.stack : String(error)
    
    let userFriendlyMessage = errorMessage
    if (errorMessage.includes('Invalid file format')) {
      userFriendlyMessage = `File format error: ${errorMessage}`
    } else if (errorMessage.includes('Could not detect')) {
      userFriendlyMessage = `Column detection error: ${errorMessage}. Please ensure your file has the correct headers.`
    }
    
    return NextResponse.json(
      {
        error: 'Failed to generate dashboard',
        details: userFriendlyMessage,
        debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    )
  }
}




