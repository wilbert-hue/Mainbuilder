/**
 * Dashboard Generator
 * Generates a complete, deployment-ready Next.js app from processed data
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import type { ComparisonData } from './types'
import archiver from 'archiver'

interface FileEntry {
  path: string
  content: string | Buffer
  isDirectory?: boolean
}

interface IntelligencePackageData {
  intelligenceData: any | null
  proposition2Data: any | null
  proposition3Data: any | null
  distributorIntelligenceData: any | null
  distributorProposition2Data: any | null
  distributorProposition3Data: any | null
  intelligenceType: string | null
}

/**
 * Generate all files for a deployment-ready Next.js dashboard
 */
export async function generateDashboardFiles(
  data: ComparisonData | null,
  projectName: string = 'market-dashboard',
  intelligencePackageData?: IntelligencePackageData
): Promise<FileEntry[]> {
  const files: FileEntry[] = []

  // Helper to add file
  const addFile = (filePath: string, content: string | Buffer) => {
    files.push({ path: filePath, content })
  }

  // Check what data we have
  const hasMarketData = data !== null
  const hasIntelligenceData = intelligencePackageData && (
    intelligencePackageData.intelligenceData ||
    intelligencePackageData.proposition2Data ||
    intelligencePackageData.proposition3Data ||
    intelligencePackageData.distributorIntelligenceData ||
    intelligencePackageData.distributorProposition2Data ||
    intelligencePackageData.distributorProposition3Data
  )

  // 1. Root files
  addFile('package.json', generatePackageJson())
  addFile('tsconfig.json', generateTsConfig())
  addFile('next.config.ts', generateNextConfig())
  addFile('postcss.config.mjs', generatePostcssConfig())
  addFile('vercel.json', generateVercelConfig())
  addFile('.gitignore', generateGitignore())
  addFile('README.md', generateReadme(projectName))
  addFile('SETUP.md', generateSetupInstructions())
  addFile('next-env.d.ts', generateNextEnv())

  // 2. App directory structure
  addFile('app/layout.tsx', generateLayout())
  addFile('app/page.tsx', await generatePage(hasIntelligenceData, intelligencePackageData?.intelligenceType || null))
  const globalsCss = await readTemplateFile('app/globals.css')
  if (globalsCss) {
    addFile('app/globals.css', globalsCss)
    console.log('Added app/globals.css to package')
  } else {
    // Fallback globals.css if file read fails
    console.log('Using fallback globals.css')
    addFile('app/globals.css', generateFallbackGlobalsCss())
  }
  addFile('app/api/process-data/route.ts', generateProcessDataRoute())

  // NOTE: We intentionally do NOT include:
  // - app/excel-upload/ (not needed for client deployments)
  // - app/dashboard-builder/ (not needed for client deployments)
  // - app/api/process-excel/ (not needed for client deployments)
  // - app/api/generate-dashboard/ (not needed for client deployments)

  // 3. Components directory - Copy all component files
  const componentFiles = await getComponentFiles()
  console.log(`Processing ${componentFiles.length} component files...`)
  console.log('Component files found:', componentFiles.slice(0, 10), '...')  // Show first 10 for brevity

  let componentSuccessCount = 0
  const failedComponentFiles: string[] = []
  for (const file of componentFiles) {
    const content = await readTemplateFile(file)
    if (content) {
      addFile(file, content)
      componentSuccessCount++
    } else {
      console.error(`FAILED to read component file: ${file}`)
      failedComponentFiles.push(file)
    }
  }
  console.log(`Successfully added ${componentSuccessCount}/${componentFiles.length} component files`)
  if (failedComponentFiles.length > 0) {
    console.error('Failed component files:', failedComponentFiles)
  }

  // 4. Lib directory - Copy all lib files
  // Complete list of all known lib files - used as fallback if directory walk fails
  const allKnownLibFiles = [
    'lib/store.ts',
    'lib/types.ts',
    'lib/utils.ts',
    'lib/data-processor.ts',
    'lib/json-processor.ts',
    'lib/chart-config.ts',
    'lib/chart-groups.ts',
    'lib/chart-theme.ts',
    'lib/competitive-intelligence-data.ts',
    'lib/customer-intelligence-data.ts',
    'lib/distributors-intelligence-data.ts',
    'lib/export-utils.ts',
    'lib/insights-generator.ts',
    'lib/intelligence-data-converter.ts',
    'lib/mock-data.ts',
    'lib/preset-utils.ts',
    'lib/workers/json-processor.worker.ts'
  ]

  let libFiles: string[] = []
  try {
    libFiles = await getLibFiles()
    console.log(`getLibFiles() found ${libFiles.length} lib files:`, libFiles)
  } catch (error) {
    console.error('getLibFiles() threw an error:', error)
    libFiles = []
  }

  // If directory walk found no files, use the comprehensive known files list
  if (libFiles.length === 0) {
    console.warn('WARNING: getLibFiles() returned 0 files. Using comprehensive fallback list of all known lib files.')
    console.warn('process.cwd() =', process.cwd())
    libFiles = [...allKnownLibFiles]
  } else {
    // Ensure all known lib files are in the list even if directory walk missed some
    for (const knownFile of allKnownLibFiles) {
      if (!libFiles.includes(knownFile)) {
        console.log(`Adding missing known lib file: ${knownFile}`)
        libFiles.push(knownFile)
      }
    }
  }

  console.log(`Processing ${libFiles.length} lib files...`)

  let libSuccessCount = 0
  const failedLibFiles: string[] = []
  for (const file of libFiles) {
    const content = await readTemplateFile(file)
    if (content) {
      addFile(file, content)
      libSuccessCount++
      console.log(`Added lib file: ${file}`)
    } else {
      console.error(`FAILED to read lib file: ${file}`)
      failedLibFiles.push(file)
    }
  }
  console.log(`Successfully added ${libSuccessCount}/${libFiles.length} lib files`)
  if (failedLibFiles.length > 0) {
    console.error('Failed lib files:', failedLibFiles)
  }

  // If NO lib files were successfully added, this is a critical error - log prominently
  if (libSuccessCount === 0) {
    console.error('CRITICAL: No lib files were added to the package! The generated dashboard will not work.')
    console.error('process.cwd() =', process.cwd())
  }

  // 5. Public directory with data and logo
  if (hasMarketData && data) {
    addFile('public/data/value.json', JSON.stringify(extractValueData(data), null, 2))
    if (data.data.volume?.geography_segment_matrix?.length > 0) {
      addFile('public/data/volume.json', JSON.stringify(extractVolumeData(data), null, 2))
    }
    addFile('public/data/segmentation_analysis.json', JSON.stringify(extractSegmentationData(data), null, 2))
  }

  // 6. Add intelligence data files if available
  if (hasIntelligenceData && intelligencePackageData) {
    if (intelligencePackageData.intelligenceData) {
      addFile('public/data/intelligence_data.json', JSON.stringify(intelligencePackageData.intelligenceData, null, 2))
      console.log('Added intelligence_data.json to package')
    }
    if (intelligencePackageData.proposition2Data) {
      addFile('public/data/proposition2_data.json', JSON.stringify(intelligencePackageData.proposition2Data, null, 2))
      console.log('Added proposition2_data.json to package')
    }
    if (intelligencePackageData.proposition3Data) {
      addFile('public/data/proposition3_data.json', JSON.stringify(intelligencePackageData.proposition3Data, null, 2))
      console.log('Added proposition3_data.json to package')
    }
    if (intelligencePackageData.distributorIntelligenceData) {
      addFile(
        'public/data/distributor_intelligence_data.json',
        JSON.stringify(intelligencePackageData.distributorIntelligenceData, null, 2)
      )
      console.log('Added distributor_intelligence_data.json to package')
    }
    if (intelligencePackageData.distributorProposition2Data) {
      addFile(
        'public/data/distributor_proposition2_data.json',
        JSON.stringify(intelligencePackageData.distributorProposition2Data, null, 2)
      )
      console.log('Added distributor_proposition2_data.json to package')
    }
    if (intelligencePackageData.distributorProposition3Data) {
      addFile(
        'public/data/distributor_proposition3_data.json',
        JSON.stringify(intelligencePackageData.distributorProposition3Data, null, 2)
      )
      console.log('Added distributor_proposition3_data.json to package')
    }
    // Store the intelligence type
    if (intelligencePackageData.intelligenceType) {
      addFile('public/data/intelligence_config.json', JSON.stringify({
        type: intelligencePackageData.intelligenceType
      }, null, 2))
      console.log('Added intelligence_config.json to package')
    }
  }

  // Copy logo if it exists
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    const logoBuffer = await fs.readFile(logoPath)
    addFile('public/logo.png', logoBuffer)
  } catch (error) {
    console.warn('Logo file not found, skipping...')
  }

  // 7. Styles directory
  const stylesContent = await readTemplateFile('styles/animations.css')
  if (stylesContent) {
    addFile('styles/animations.css', stylesContent)
    console.log('Added styles/animations.css to package')
  } else {
    // Fallback animations.css if file read fails
    console.log('Using fallback animations.css')
    addFile('styles/animations.css', generateFallbackAnimationsCss())
  }

  console.log(`Total files in package: ${files.length}`)
  console.log('Files included:', files.map(f => f.path).join(', '))

  return files
}

/**
 * Extract value data from ComparisonData for JSON export
 */
function extractValueData(data: ComparisonData): any {
  // Reconstruct the original JSON structure from ComparisonData
  const result: any = {}
  
  for (const record of data.data.value.geography_segment_matrix) {
    const geo = record.geography
    const segmentType = record.segment_type
    
    if (!result[geo]) {
      result[geo] = {}
    }
    if (!result[geo][segmentType]) {
      result[geo][segmentType] = {}
    }
    
    // Build path from segment hierarchy
    // Limit depth to prevent stack overflow
    const MAX_SEGMENT_DEPTH = 10
    const segments = [
      record.segment_hierarchy.level_1,
      record.segment_hierarchy.level_2,
      record.segment_hierarchy.level_3,
      record.segment_hierarchy.level_4,
      record.segment_hierarchy.level_5, // Include level 5 if it exists
    ].filter(Boolean).slice(0, MAX_SEGMENT_DEPTH) // Limit to max depth
    
    let current = result[geo][segmentType]
    let depth = 0
    for (const segment of segments) {
      if (depth >= MAX_SEGMENT_DEPTH) {
        console.warn(`Maximum segment depth (${MAX_SEGMENT_DEPTH}) reached for record:`, record.segment)
        break
      }
      if (segment && typeof segment === 'string') {
        if (!current[segment]) {
          current[segment] = {}
        }
        current = current[segment]
        depth++
      }
    }
    
    // Add year data
    for (const [year, value] of Object.entries(record.time_series)) {
      if (year && typeof year === 'string') {
        current[year] = value
      }
    }
    
    if (record.cagr) {
      current.CAGR = `${record.cagr}%`
    }
    
    if (record.is_aggregated) {
      current._aggregated = true
      if (record.aggregation_level !== null) {
        current._level = record.aggregation_level
      }
    }
  }
  
  return result
}

/**
 * Extract volume data from ComparisonData for JSON export
 */
function extractVolumeData(data: ComparisonData): any {
  if (!data.data.volume?.geography_segment_matrix) {
    return {}
  }
  
  const result: any = {}
  
  for (const record of data.data.volume.geography_segment_matrix) {
    const geo = record.geography
    const segmentType = record.segment_type
    
    if (!result[geo]) {
      result[geo] = {}
    }
    if (!result[geo][segmentType]) {
      result[geo][segmentType] = {}
    }
    
    // Build path from segment hierarchy
    // Limit depth to prevent stack overflow
    const MAX_SEGMENT_DEPTH = 10
    const segments = [
      record.segment_hierarchy.level_1,
      record.segment_hierarchy.level_2,
      record.segment_hierarchy.level_3,
      record.segment_hierarchy.level_4,
      record.segment_hierarchy.level_5, // Include level 5 if it exists
    ].filter(Boolean).slice(0, MAX_SEGMENT_DEPTH) // Limit to max depth
    
    let current = result[geo][segmentType]
    let depth = 0
    for (const segment of segments) {
      if (depth >= MAX_SEGMENT_DEPTH) {
        console.warn(`Maximum segment depth (${MAX_SEGMENT_DEPTH}) reached for record:`, record.segment)
        break
      }
      if (segment && typeof segment === 'string') {
        if (!current[segment]) {
          current[segment] = {}
        }
        current = current[segment]
        depth++
      }
    }
    
    for (const [year, value] of Object.entries(record.time_series)) {
      if (year && typeof year === 'string') {
        current[year] = value
      }
    }
    
    if (record.cagr) {
      current.CAGR = `${record.cagr}%`
    }
  }
  
  return result
}

/**
 * Extract segmentation structure (without year data)
 */
function extractSegmentationData(data: ComparisonData): any {
  const result: any = {}
  
  // Build structure from dimensions
  for (const geo of data.dimensions.geographies.all_geographies) {
    result[geo] = {}
    
    for (const [segmentType, segmentDim] of Object.entries(data.dimensions.segments)) {
      result[geo][segmentType] = {}
      
      // Build hierarchy from segment items
      // Add stack overflow protection with max depth limit
      const MAX_HIERARCHY_DEPTH = 20
      const visitedItems = new Set<string>() // Track visited items to prevent circular references
      
      const buildHierarchy = (items: string[], hierarchy: Record<string, string[]>, parent: any, level: number = 0, path: string = '') => {
        // Stack overflow protection: limit recursion depth
        if (level > MAX_HIERARCHY_DEPTH) {
          console.warn(`Maximum hierarchy depth (${MAX_HIERARCHY_DEPTH}) reached at path: ${path}`)
          return
        }
        
        for (const item of items) {
          const itemPath = path ? `${path} > ${item}` : item
          
          // Circular reference protection: check if we've seen this item in the current path
          if (visitedItems.has(itemPath)) {
            console.warn(`Circular reference detected at path: ${itemPath}, skipping`)
            continue
          }
          
          if (!parent[item]) {
            parent[item] = {}
          }
          
          if (hierarchy[item] && hierarchy[item].length > 0) {
            visitedItems.add(itemPath)
            buildHierarchy(hierarchy[item], hierarchy, parent[item], level + 1, itemPath)
            visitedItems.delete(itemPath) // Remove from visited set after processing
          }
        }
      }
      
      if (segmentDim.items && segmentDim.hierarchy) {
        const topLevel = segmentDim.items.filter(item => !Object.values(segmentDim.hierarchy).some(children => children.includes(item)))
        buildHierarchy(topLevel, segmentDim.hierarchy, result[geo][segmentType])
      }
    }
  }
  
  return result
}

/**
 * Generate package.json
 */
function generatePackageJson(): string {
  return JSON.stringify({
    name: "market-dashboard",
    version: "1.0.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "eslint"
    },
    dependencies: {
      "@radix-ui/react-select": "^2.2.6",
      "@radix-ui/react-slider": "^1.3.6",
      "@tanstack/react-table": "^8.21.3",
      "@types/d3": "^7.4.3",
      "class-variance-authority": "^0.7.1",
      "clsx": "^2.1.1",
      "d3": "^7.9.0",
      "file-saver": "^2.0.5",
      "html2canvas": "^1.4.1",
      "jspdf": "^3.0.3",
      "lucide-react": "^0.553.0",
      "next": "16.0.1",
      "react": "19.2.0",
      "react-dom": "19.2.0",
      "recharts": "^3.4.1",
      "tailwind-merge": "^3.4.0",
      "xlsx": "^0.18.5",
      "zustand": "^5.0.8"
    },
    devDependencies: {
      "@tailwindcss/postcss": "^4",
      "@types/file-saver": "^2.0.7",
      "@types/node": "^20",
      "@types/react": "^19",
      "@types/react-dom": "^19",
      "eslint": "^9",
      "eslint-config-next": "16.0.1",
      "tailwindcss": "^4",
      "typescript": "^5"
    }
  }, null, 2)
}

/**
 * Generate tsconfig.json
 */
function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: "ES2017",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "react-jsx",
      incremental: true,
      plugins: [
        {
          name: "next"
        }
      ],
      paths: {
        "@/*": ["./*"]
      }
    },
    include: [
      "next-env.d.ts",
      "**/*.ts",
      "**/*.tsx",
      ".next/types/**/*.ts",
      ".next/dev/types/**/*.ts",
      "**/*.mts"
    ],
    exclude: ["node_modules"]
  }, null, 2)
}

/**
 * Generate next.config.ts
 */
function generateNextConfig(): string {
  return `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  output: 'standalone',
  serverExternalPackages: ['fs', 'path'],
};

export default nextConfig;
`
}

/**
 * Generate postcss.config.mjs
 */
function generatePostcssConfig(): string {
  return `const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
`
}

/**
 * Generate vercel.json
 */
function generateVercelConfig(): string {
  return JSON.stringify({
    functions: {
      "app/api/process-data/route.ts": {
        "maxDuration": 300
      }
    },
    buildCommand: "npm run build",
    outputDirectory: ".next",
    framework: "nextjs",
    installCommand: "npm install"
  }, null, 2)
}

/**
 * Generate .gitignore
 */
function generateGitignore(): string {
  return `# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
`
}

/**
 * Generate SETUP.md with instructions for running the package
 */
function generateSetupInstructions(): string {
  return `# Setup Instructions

## After Downloading the Package

### IMPORTANT: Clear Cache First!
Before running the project, you MUST clear the Next.js build cache:

\`\`\`bash
# Delete the .next folder
rm -rf .next

# On Windows Command Prompt:
rmdir /s /q .next

# On Windows PowerShell:
Remove-Item -Recurse -Force .next
\`\`\`

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Run Development Server
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000)

### 3. Build for Production (Optional)
\`\`\`bash
npm run build
npm start
\`\`\`

## Troubleshooting

### Geography Mode Not Working?
1. **Delete .next folder** (most common fix!)
2. Restart dev server: \`Ctrl+C\` then \`npm run dev\`
3. Hard refresh browser: \`Ctrl+F5\` or \`Cmd+Shift+R\`

### KPIs Showing $0.0 Million?
1. Verify data files exist in \`public/data/\`
2. Check browser console for errors
3. Restart dev server

### Charts Are Blank?
1. Clear .next folder
2. Make sure you're viewing the correct URL
3. Check that data files were included in the package

## Features Included

✅ **Geography Mode** - View data by geography (shows Level 1 totals)
✅ **Dynamic KPIs** - Automatically uses actual years from your data
✅ **Cascade Filters** - Updated labels for sub-segments
✅ **Year Range Slider** - Fixed layout issues
✅ **All Charts** - Bar, Line, Heatmap, Waterfall, Bubble, Table

## Need Help?

Check the browser console (F12) and terminal for error messages.
`
}

/**
 * Generate README.md
 */
function generateReadme(projectName: string): string {
  return `# ${projectName}

Market Analysis Dashboard - Generated by Coherent Dashboard Builder

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

\`\`\`bash
npm install
\`\`\`

### Development

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

\`\`\`bash
npm run build
npm start
\`\`\`

## Deployment

### Deploy to Vercel

1. Push this code to a GitHub repository
2. Import the repository in [Vercel](https://vercel.com)
3. Vercel will automatically detect Next.js and deploy

### Manual Deployment

1. Run \`npm run build\`
2. The \`.next\` folder contains the production build
3. Deploy the \`.next\` folder to your hosting provider

## Features

- Interactive market analysis dashboard
- Multiple chart types (bar, line, heatmap, bubble, etc.)
- Filtering and segmentation
- Opportunity matrix visualization
- Export capabilities

## Data

Market data is stored in \`public/data/\` directory:
- \`value.json\` - Market value data
- \`volume.json\` - Market volume data (if available)
- \`segmentation_analysis.json\` - Market segmentation structure

## License

Private - Generated Dashboard
`
}

/**
 * Generate next-env.d.ts
 */
function generateNextEnv(): string {
  return `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
`
}

/**
 * Generate fallback globals.css if file read fails
 */
function generateFallbackGlobalsCss(): string {
  return `@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

/* Import custom animations */
@import '../styles/animations.css';

/* Custom scrollbar styles */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Thin scrollbar for sidebar */
.sidebar-scroll {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
}

.sidebar-scroll::-webkit-scrollbar {
  width: 6px;
}

.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 4px;
}

.sidebar-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
  border: 1px solid transparent;
}

.sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Hide scrollbar when not hovering */
.sidebar-scroll:not(:hover)::-webkit-scrollbar-thumb {
  background: transparent;
}

.sidebar-scroll:hover::-webkit-scrollbar-thumb {
  background: #cbd5e1;
}

/* Smooth transitions for all interactive elements */
button, a, input, select, .card {
  transition: all 0.2s ease;
}

/* Card hover effects */
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}
`
}

/**
 * Generate fallback animations.css if file read fails
 */
function generateFallbackAnimationsCss(): string {
  return `/* Smooth animations for UI elements */

@keyframes slideIn {
  from {
    transform: translateY(-10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slideIn 0.3s ease-out;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

.animate-scale-in {
  animation: scaleIn 0.3s ease-out;
}

/* Smooth transitions for interactive elements */
.transition-smooth {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover effects for cards */
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}

/* Loading pulse animation */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse-slow {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Dropdown animations */
.dropdown-enter {
  animation: slideIn 0.2s ease-out;
}

/* Chart bar animations */
@keyframes growUp {
  from {
    transform: scaleY(0);
    transform-origin: bottom;
  }
  to {
    transform: scaleY(1);
  }
}

.chart-bar-animate {
  animation: growUp 0.8s ease-out;
}
`
}

/**
 * Generate app/layout.tsx
 */
function generateLayout(): string {
  return `import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Market Analysis Dashboard",
  description: "Interactive dashboard with charts and analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const className = \`\${geistSans.variable} \${geistMono.variable} antialiased\`;
  return (
    <html lang="en">
      <body className={className}>
        {children}
      </body>
    </html>
  );
}
`
}

/**
 * Generate app/page.tsx
 * Reads the actual page.tsx file and adapts it for the generated dashboard
 */
async function generatePage(hasIntelligenceData: boolean = false, intelligenceType: string | null = null): Promise<string> {
  const pageContent = await readTemplateFile('app/page.tsx')
  if (pageContent) {
    // Replace the API call to use the embedded data files
    let adapted = pageContent.replace(
      '/api/process-data?valuePath=value.json&volumePath=volume.json&segmentationPath=segmentation_analysis.json',
      '/api/process-data?valuePath=data/value.json&volumePath=data/volume.json&segmentationPath=data/segmentation_analysis.json'
    )
    // Remove the Excel upload and Dashboard Builder links since this is a generated dashboard for clients
    adapted = adapted.replace(
      /<a[\s\S]*?href="\/excel-upload"[\s\S]*?<\/a>/g,
      ''
    )
    adapted = adapted.replace(
      /<a[\s\S]*?href="\/dashboard-builder"[\s\S]*?<\/a>/g,
      ''
    )
    // Remove the DashboardBuilderDownload component import and usage
    adapted = adapted.replace(
      /import\s+{\s*DashboardBuilderDownload\s*}\s+from\s+['"]@\/components\/DashboardBuilderDownload['"];?\s*/g,
      ''
    )
    adapted = adapted.replace(
      /<DashboardBuilderDownload\s*\/>/g,
      ''
    )
    // Remove the entire "Action Links" section if it becomes empty
    // Match the section more precisely
    adapted = adapted.replace(
      /{\/\* Action Links \*\/}\s*<div[\s\S]*?flex-shrink-0[\s\S]*?<\/div>\s*<\/div>/,
      ''
    )

    // Remove Dashboard Builder button elements (button with router.push to dashboard-builder)
    // Match the div containing the Dashboard Builder button in the header
    adapted = adapted.replace(
      /<div className="flex-shrink-0">\s*<button\s+onClick=\{\(\) => router\.push\('\/dashboard-builder'\)\}[\s\S]*?<\/button>\s*<\/div>/g,
      ''
    )
    // Also remove the variant with flex items-center
    adapted = adapted.replace(
      /<div className="flex-shrink-0 flex items-center">\s*<button\s+onClick=\{\(\) => router\.push\('\/dashboard-builder'\)\}[\s\S]*?<\/button>\s*<\/div>/g,
      ''
    )
    // Remove useRouter import if no longer used
    adapted = adapted.replace(
      /import\s+{\s*useRouter\s*}\s+from\s+['"]next\/navigation['"];?\s*\n/g,
      ''
    )
    // Remove router declaration
    adapted = adapted.replace(
      /const\s+router\s*=\s*useRouter\(\)\s*\n/g,
      ''
    )

    // If intelligence data is included, add code to load it on startup
    if (hasIntelligenceData) {
      // Add intelligence data loading function inside the useEffect
      const intelligenceLoadFunction = `
    // Load intelligence data from JSON files
    async function loadIntelligenceData() {
      try {
        const {
          setRawIntelligenceData,
          setProposition2Data,
          setProposition3Data,
          setDistributorRawIntelligenceData,
          setDistributorProposition2Data,
          setDistributorProposition3Data,
          setIntelligenceType
        } = useDashboardStore.getState()

        // Load proposition 1 (basic) data
        try {
          const response1 = await fetch('/data/intelligence_data.json')
          if (response1.ok) {
            const data1 = await response1.json()
            setRawIntelligenceData(data1)
            console.log('Loaded intelligence_data.json')
          }
        } catch (e) { console.log('No intelligence_data.json found') }

        // Load proposition 2 (advance) data
        try {
          const response2 = await fetch('/data/proposition2_data.json')
          if (response2.ok) {
            const data2 = await response2.json()
            setProposition2Data(data2)
            console.log('Loaded proposition2_data.json')
          }
        } catch (e) { console.log('No proposition2_data.json found') }

        // Load proposition 3 (premium) data
        try {
          const response3 = await fetch('/data/proposition3_data.json')
          if (response3.ok) {
            const data3 = await response3.json()
            setProposition3Data(data3)
            console.log('Loaded proposition3_data.json')
          }
        } catch (e) { console.log('No proposition3_data.json found') }

        try {
          const dr = await fetch('/data/distributor_intelligence_data.json')
          if (dr.ok) {
            setDistributorRawIntelligenceData(await dr.json())
            console.log('Loaded distributor_intelligence_data.json')
          }
        } catch (e) { console.log('No distributor_intelligence_data.json found') }

        try {
          const d2 = await fetch('/data/distributor_proposition2_data.json')
          if (d2.ok) {
            setDistributorProposition2Data(await d2.json())
            console.log('Loaded distributor_proposition2_data.json')
          }
        } catch (e) { console.log('No distributor_proposition2_data.json found') }

        try {
          const d3 = await fetch('/data/distributor_proposition3_data.json')
          if (d3.ok) {
            setDistributorProposition3Data(await d3.json())
            console.log('Loaded distributor_proposition3_data.json')
          }
        } catch (e) { console.log('No distributor_proposition3_data.json found') }

        // Load intelligence config
        try {
          const configResponse = await fetch('/data/intelligence_config.json')
          if (configResponse.ok) {
            const config = await configResponse.json()
            if (config.type) {
              setIntelligenceType(config.type)
            }
          }
        } catch (e) { console.log('No intelligence_config.json found') }
      } catch (err) {
        console.error('Error loading intelligence data:', err)
      }
    }

    loadData()
    loadIntelligenceData()`

      // Replace the loadData() call with both the function definition and calls
      adapted = adapted.replace(
        /loadData\(\)\s*\n\s*\}, \[/,
        intelligenceLoadFunction + `\n  }, [`
      )
    }

    return adapted
  }
  // Fallback if file can't be read
  return `'use client'

import { useEffect, useState } from 'react'
import { useDashboardStore } from '@/lib/store'

export default function DashboardPage() {
  const { setData, setLoading } = useDashboardStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    async function loadData() {
      try {
        setLoading(true)
        const response = await fetch('/api/process-data?valuePath=data/value.json&volumePath=data/volume.json&segmentationPath=data/segmentation_analysis.json')
        if (response.ok) {
          const data = await response.json()
          setData(data)
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Market Analysis Dashboard</h1>
      <p>Dashboard is loading...</p>
    </div>
  )
}
`
}

/**
 * Generate app/api/process-data/route.ts
 */
function generateProcessDataRoute(): string {
  return `import { NextRequest, NextResponse } from 'next/server'
import { loadAndProcessJsonFiles } from '@/lib/json-processor'
import * as fs from 'fs/promises'
import * as path from 'path'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const valuePath = searchParams.get('valuePath') || 'data/value.json'
    const volumePath = searchParams.get('volumePath') || 'data/volume.json'
    const segmentationPath = searchParams.get('segmentationPath') || 'data/segmentation_analysis.json'
    
    const currentDir = process.cwd()
    const publicDataDir = path.join(currentDir, 'public', 'data')
    
    const resolvePath = (filePath: string): string => {
      if (path.isAbsolute(filePath)) return filePath
      const cleanPath = filePath.replace(/^data\\//, '')
      return path.join(publicDataDir, cleanPath)
    }
    
    const resolvedValuePath = resolvePath(valuePath)
    const resolvedVolumePath = volumePath ? resolvePath(volumePath) : null
    const resolvedSegmentationPath = segmentationPath ? resolvePath(segmentationPath) : null
    
    let finalValuePath = resolvedValuePath
    let finalVolumePath = resolvedVolumePath
    let finalSegmentationPath = resolvedSegmentationPath
    
    try {
      await fs.access(finalValuePath)
    } catch {
      const errorMsg = 'Value file not found: ' + finalValuePath
      return NextResponse.json(
        { error: errorMsg },
        { status: 404 }
      )
    }
    
    if (finalVolumePath) {
      try {
        await fs.access(finalVolumePath)
      } catch {
        finalVolumePath = null
      }
    }
    
    if (finalSegmentationPath) {
      try {
        await fs.access(finalSegmentationPath)
      } catch {
        finalSegmentationPath = null
      }
    }
    
    const comparisonData = await loadAndProcessJsonFiles(
      finalValuePath,
      finalVolumePath,
      finalSegmentationPath
    )
    
    return NextResponse.json(comparisonData)
  } catch (error) {
    console.error('Error processing JSON files:', error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { 
        error: 'Failed to process JSON files',
        details: errorMsg
      },
      { status: 500 }
    )
  }
}
`
}

/**
 * Normalize path to use forward slashes (for zip archives)
 */
function normalizePathForZip(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

/**
 * Get the project root directory.
 * Tries process.cwd() first, then falls back to resolving from __dirname.
 * Caches the result for performance.
 */
let _cachedProjectRoot: string | null = null
async function getProjectRoot(): Promise<string> {
  if (_cachedProjectRoot) return _cachedProjectRoot

  const cwd = process.cwd()

  // Check if process.cwd() has our expected directories
  try {
    await fs.access(path.join(cwd, 'lib'))
    await fs.access(path.join(cwd, 'components'))
    _cachedProjectRoot = cwd
    console.log(`Project root (from cwd): ${_cachedProjectRoot}`)
    return _cachedProjectRoot
  } catch {
    console.warn(`process.cwd() (${cwd}) does not contain lib/ and components/ directories`)
  }

  // Fallback: try to resolve from __dirname (this file is in lib/)
  try {
    const dirnameBased = path.resolve(__dirname, '..')
    await fs.access(path.join(dirnameBased, 'lib'))
    await fs.access(path.join(dirnameBased, 'components'))
    _cachedProjectRoot = dirnameBased
    console.log(`Project root (from __dirname): ${_cachedProjectRoot}`)
    return _cachedProjectRoot
  } catch {
    console.warn(`__dirname-based path (${path.resolve(__dirname, '..')}) also failed`)
  }

  // Fallback: walk up from cwd looking for package.json + lib/
  let current = cwd
  for (let i = 0; i < 5; i++) {
    try {
      await fs.access(path.join(current, 'lib'))
      await fs.access(path.join(current, 'package.json'))
      _cachedProjectRoot = current
      console.log(`Project root (from walk-up): ${_cachedProjectRoot}`)
      return _cachedProjectRoot
    } catch {
      const parent = path.dirname(current)
      if (parent === current) break // reached filesystem root
      current = parent
    }
  }

  // Last resort: use cwd and hope for the best
  console.warn(`Could not reliably determine project root, falling back to cwd: ${cwd}`)
  _cachedProjectRoot = cwd
  return _cachedProjectRoot
}

/**
 * Read template file from current project
 */
async function readTemplateFile(filePath: string): Promise<string | null> {
  const projectRoot = await getProjectRoot()

  // Normalize path for the file system (handle both Windows and Unix)
  const normalizedPath = filePath.replace(/\//g, path.sep)
  const fullPath = path.join(projectRoot, normalizedPath)

  try {
    const content = await fs.readFile(fullPath, 'utf-8')
    console.log(`Successfully read ${filePath} (${content.length} bytes)`)
    return content
  } catch (error: any) {
    console.error(`ERROR reading template file ${filePath} at ${fullPath}:`, error?.message || error)
  }

  // Try alternative paths if the primary path failed
  const altPaths = [
    path.join(process.cwd(), filePath),
    path.join(process.cwd(), normalizedPath),
    path.resolve(filePath),
    // Try relative to __dirname (this file is in lib/)
    path.resolve(__dirname, '..', normalizedPath),
  ]

  // Deduplicate and skip paths we already tried
  const triedPaths = new Set<string>([fullPath])
  for (const altPath of altPaths) {
    const resolvedAlt = path.resolve(altPath)
    if (triedPaths.has(resolvedAlt)) continue
    triedPaths.add(resolvedAlt)

    try {
      const content = await fs.readFile(resolvedAlt, 'utf-8')
      console.log(`Successfully read from alternate path: ${resolvedAlt}`)
      return content
    } catch {
      // Continue to next path
    }
  }

  console.error(`FAILED to read ${filePath} from any path. Tried: ${[...triedPaths].join(', ')}`)
  return null
}

/**
 * Get list of component files to copy
 */
async function getComponentFiles(): Promise<string[]> {
  const projectRoot = await getProjectRoot()
  const componentDir = path.join(projectRoot, 'components')
  console.log(`getComponentFiles: scanning directory ${componentDir}`)
  const files: string[] = []

  // Stack overflow protection: limit directory depth
  const MAX_DIRECTORY_DEPTH = 20
  const visitedDirs = new Set<string>() // Prevent circular symlinks

  async function walkDir(dir: string, basePath: string = 'components', depth: number = 0) {
    // Stack overflow protection
    if (depth > MAX_DIRECTORY_DEPTH) {
      console.warn(`Maximum directory depth (${MAX_DIRECTORY_DEPTH}) reached at: ${dir}`)
      return
    }

    // Prevent circular references (symlinks)
    const normalizedDirPath = path.resolve(dir)
    if (visitedDirs.has(normalizedDirPath)) {
      console.warn(`Circular reference detected at: ${dir}, skipping`)
      return
    }
    visitedDirs.add(normalizedDirPath)

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        // Use forward slashes for zip archive compatibility
        const relativePath = basePath + '/' + entry.name

        if (entry.isDirectory()) {
          await walkDir(fullPath, relativePath, depth + 1)
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
          files.push(relativePath)
        }
      }

      visitedDirs.delete(normalizedDirPath) // Remove after processing
    } catch (error) {
      console.error(`ERROR reading directory ${dir}:`, error)
      visitedDirs.delete(normalizedDirPath) // Remove on error
    }
  }

  await walkDir(componentDir)
  console.log(`Found ${files.length} component files`)
  return files
}

/**
 * Get list of lib files to copy
 */
async function getLibFiles(): Promise<string[]> {
  const projectRoot = await getProjectRoot()
  const libDir = path.join(projectRoot, 'lib')
  console.log(`getLibFiles: scanning directory ${libDir}`)
  const files: string[] = []

  // Stack overflow protection: limit directory depth
  const MAX_DIRECTORY_DEPTH = 20
  const visitedDirs = new Set<string>() // Prevent circular symlinks

  async function walkDir(dir: string, basePath: string = 'lib', depth: number = 0) {
    // Stack overflow protection
    if (depth > MAX_DIRECTORY_DEPTH) {
      console.warn(`Maximum directory depth (${MAX_DIRECTORY_DEPTH}) reached at: ${dir}`)
      return
    }

    // Prevent circular references (symlinks)
    const normalizedDirPath = path.resolve(dir)
    if (visitedDirs.has(normalizedDirPath)) {
      console.warn(`Circular reference detected at: ${dir}, skipping`)
      return
    }
    visitedDirs.add(normalizedDirPath)

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        // Use forward slashes for zip archive compatibility
        const relativePath = basePath + '/' + entry.name

        if (entry.isDirectory()) {
          await walkDir(fullPath, relativePath, depth + 1)
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          files.push(relativePath)
        }
      }

      visitedDirs.delete(normalizedDirPath) // Remove after processing
    } catch (error) {
      console.error(`ERROR reading directory ${dir}:`, error)
      visitedDirs.delete(normalizedDirPath) // Remove on error
    }
  }

  await walkDir(libDir)
  console.log(`Found ${files.length} lib files`)
  return files
}

/**
 * Create a zip file from file entries
 */
export async function createZipFile(files: FileEntry[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })
    
    const chunks: Buffer[] = []
    
    archive.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })
    
    archive.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
    
    archive.on('error', (err) => {
      reject(err)
    })
    
    // Add files to archive (archiver handles directory structure automatically)
    for (const file of files) {
      if (!file.isDirectory) {
        if (Buffer.isBuffer(file.content)) {
          archive.append(file.content, { name: file.path })
        } else {
          archive.append(Buffer.from(file.content, 'utf-8'), { name: file.path })
        }
      }
    }
    
    archive.finalize()
  })
}

