# Dashboard Builder

A Next.js application for building and deploying market intelligence dashboards with Excel/CSV data upload capabilities.

## Features

- **Dashboard Builder**: Upload Excel/CSV files to create custom dashboards
- **Automatic Aggregation Level Detection**: Intelligently determines aggregation levels based on selected segments
- **Deployment Package Generation**: Generate ready-to-deploy Next.js packages
- **Multiple Chart Types**: Bar charts, line charts, heatmaps, tables, waterfall charts, and more
- **Intelligence Data Support**: Customer, distributor, and competitive intelligence data
- **Stack Overflow Protection**: Iterative algorithms prevent maximum call stack errors

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will run on `http://localhost:3002`

### Production Build

```bash
npm run build
npm start
```

## Vercel Deployment

This project is configured for Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect Next.js and configure the build
3. API routes have extended timeouts (up to 10 minutes) for large file processing
4. Environment variables are not required for basic functionality

### API Routes

- `/api/process-excel` - Process Excel/CSV files (maxDuration: 300s)
- `/api/generate-dashboard` - Generate deployment packages (maxDuration: 600s)
- `/api/process-intelligence-file` - Process intelligence data files
- `/api/process-competitive-intelligence` - Process competitive intelligence data

## Project Structure

```
frontend-clean/
├── app/
│   ├── api/              # API routes
│   ├── dashboard-builder/ # Dashboard builder page
│   └── page.tsx          # Main dashboard page
├── components/           # React components
│   ├── charts/          # Chart components
│   ├── filters/         # Filter components
│   └── dashboard-builder/ # Dashboard builder components
├── lib/                 # Utility libraries
│   ├── json-processor.ts # JSON processing with stack overflow protection
│   ├── data-processor.ts # Data filtering and processing
│   └── dashboard-generator.ts # Deployment package generator
└── excel-upload-tool/   # Excel processing library
```

## Key Features

### Stack Overflow Protection

All recursive functions have been converted to iterative implementations using stack-based algorithms to prevent maximum call stack errors:

- `calculateAggregations()` - Iterative aggregation calculation
- `removeYearData()` - Iterative data structure traversal
- Directory traversal functions - Stack-based file system navigation

### Automatic Aggregation Level Detection

The system automatically determines the appropriate aggregation level based on selected segments, hiding complexity from users.

### Deployment Package Generation

Generate complete, deployment-ready Next.js applications with:
- All necessary configuration files
- Processed data files
- Component and library files
- Ready-to-deploy structure

## License

Private - Coherent Market Insights
