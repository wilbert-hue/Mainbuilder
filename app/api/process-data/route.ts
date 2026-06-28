import { NextRequest, NextResponse } from 'next/server'
import { loadAndProcessJsonFiles } from '@/lib/json-processor'
import path from 'path'
import fs from 'fs/promises'

// Increase timeout for large file processing (5 minutes)
export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * API Route to process JSON files and return ComparisonData
 * 
 * Query parameters:
 * - valuePath: Path to value.json file (relative to project root)
 * - volumePath: (optional) Path to volume.json file
 * - segmentationPath: (optional) Path to segmentation_analysis.json file
 * 
 * Example: /api/process-data?valuePath=value.json&volumePath=volume.json
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const valuePath = searchParams.get('valuePath') || 'data/value.json'
    const volumePath = searchParams.get('volumePath') || 'data/volume.json'
    const segmentationPath = searchParams.get('segmentationPath') || 'data/segmentation_analysis.json'
    
    // Resolve paths relative to project root
    // JSON files are in public/data directory for Vercel deployment
    const currentDir = process.cwd()
    const publicDataDir = path.join(currentDir, 'public', 'data')
    
    // For local development, also check parent directory
    const parentDir = path.resolve(currentDir, '..')
    
    // Try public/data first, then fallback to parent directory for local dev
    const resolvePath = (filePath: string): string => {
      if (path.isAbsolute(filePath)) return filePath
      
      // Remove 'data/' prefix if present since we're already in public/data
      const cleanPath = filePath.replace(/^data\//, '')
      const publicPath = path.join(publicDataDir, cleanPath)
      const parentPath = path.join(parentDir, cleanPath)
      
      // Return public path (for Vercel), fallback to parent for local dev
      return publicPath
    }
    
    const resolvedValuePath = resolvePath(valuePath)
    const resolvedVolumePath = volumePath ? resolvePath(volumePath) : null
    const resolvedSegmentationPath = segmentationPath ? resolvePath(segmentationPath) : null
    
    // Check file existence asynchronously - try public/data first, then parent directory
    let finalValuePath = resolvedValuePath
    let finalVolumePath = resolvedVolumePath
    let finalSegmentationPath = resolvedSegmentationPath
    
    try {
      await fs.access(resolvedValuePath)
    } catch {
      // Fallback to parent directory for local development
      const fallbackPath = path.join(parentDir, valuePath.replace(/^data\//, ''))
      try {
        await fs.access(fallbackPath)
        finalValuePath = fallbackPath
      } catch {
        return NextResponse.json(
          { 
            error: `Value file not found: ${resolvedValuePath} or ${fallbackPath}`,
            debug: {
              currentDir,
              publicDataDir,
              parentDir,
              requestedPath: valuePath,
              resolvedPath: resolvedValuePath,
              fallbackPath
            }
          },
          { status: 404 }
        )
      }
    }
    
    // Try fallback for volume and segmentation if needed
    if (finalVolumePath) {
      try {
        await fs.access(finalVolumePath)
      } catch {
        const fallbackPath = path.join(parentDir, (volumePath || '').replace(/^data\//, ''))
        try {
          await fs.access(fallbackPath)
          finalVolumePath = fallbackPath
        } catch {
          finalVolumePath = null // Optional file
        }
      }
    }
    
    if (finalSegmentationPath) {
      try {
        await fs.access(finalSegmentationPath)
      } catch {
        const fallbackPath = path.join(parentDir, (segmentationPath || '').replace(/^data\//, ''))
        try {
          await fs.access(fallbackPath)
          finalSegmentationPath = fallbackPath
        } catch {
          finalSegmentationPath = null // Optional file
        }
      }
    }
    
    // Process the JSON files
    console.log('Starting JSON processing...')
    const comparisonData = await loadAndProcessJsonFiles(
      finalValuePath,
      finalVolumePath,
      finalSegmentationPath
    )
    console.log('JSON processing completed successfully')
    
    return NextResponse.json(comparisonData)
  } catch (error) {
    console.error('Error processing JSON files:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json(
      { 
        error: 'Failed to process JSON files',
        details: errorMessage,
        stack: errorStack,
        debug: {
          currentDir: process.cwd(),
          projectRoot: path.resolve(process.cwd(), '..')
        }
      },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint to process JSON files with file paths in body
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { valuePath = 'data/value.json', volumePath = 'data/volume.json', segmentationPath = 'data/segmentation_analysis.json' } = body
    
    if (!valuePath) {
      return NextResponse.json(
        { error: 'valuePath is required' },
        { status: 400 }
      )
    }
    
    // Resolve paths - same logic as GET
    const currentDir = process.cwd()
    const publicDataDir = path.join(currentDir, 'public', 'data')
    const parentDir = path.resolve(currentDir, '..')
    
    const resolvePath = (filePath: string): string => {
      if (path.isAbsolute(filePath)) return filePath
      const cleanPath = filePath.replace(/^data\//, '')
      return path.join(publicDataDir, cleanPath)
    }
    
    let finalValuePath = resolvePath(valuePath)
    let finalVolumePath = volumePath ? resolvePath(volumePath) : null
    let finalSegmentationPath = segmentationPath ? resolvePath(segmentationPath) : null
    
    // Check file existence with fallback
    try {
      await fs.access(finalValuePath)
    } catch {
      const fallbackPath = path.join(parentDir, valuePath.replace(/^data\//, ''))
      try {
        await fs.access(fallbackPath)
        finalValuePath = fallbackPath
      } catch {
        return NextResponse.json(
          { error: `Value file not found: ${finalValuePath} or ${fallbackPath}` },
          { status: 404 }
        )
      }
    }
    
    // Process the JSON files
    const comparisonData = await loadAndProcessJsonFiles(
      finalValuePath,
      finalVolumePath,
      finalSegmentationPath
    )
    
    return NextResponse.json(comparisonData)
  } catch (error) {
    console.error('Error processing JSON files:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process JSON files',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

