# Excel Upload Tool

This tool allows users to upload Excel files (value and volume) and automatically converts them to the hierarchical JSON structure required by the dashboard.

## Overview

The Excel Upload Tool consists of:

1. **Excel Processor** (`lib/excel-processor.ts`) - Converts Excel files to JSON format
2. **API Endpoint** (`frontend-clean/app/api/process-excel/route.ts`) - Handles file uploads and processing
3. **Upload Component** (`components/ExcelUploader.tsx`) - React component for file upload UI
4. **Upload Page** (`frontend-clean/app/excel-upload/page.tsx`) - Dedicated page for Excel upload

## Features

- Drag-and-drop file upload
- Support for `.xlsx` and `.xls` formats
- Automatic detection of segmentation columns (Region, Segment, Sub-segment, etc.)
- Automatic detection of year columns (4-digit years)
- Variable depth support (3, 4, 5, 6+ levels of segmentation)
- Validation of Excel file format
- Converts Excel to JSON and processes through existing dashboard pipeline

## Expected Excel Format

The Excel files should follow this structure:

### Headers (First Row)
- **Segmentation columns**: Region, Segment, Sub-segment, Sub-segment 1, Sub-segment 2, etc.
- **Year columns**: 2018, 2019, 2020, etc. (4-digit years)
- **Optional**: CAGR column

### Data Rows
- Hierarchical structure with values in year columns
- Empty cells are allowed (will be treated as null)
- Consecutive repeated values in segmentation columns are automatically handled

### Example Structure

```
| Region | Segment | Sub-segment | 2018 | 2019 | 2020 | CAGR |
|--------|---------|-------------|------|------|------|------|
| India  | Type A  | Sub A1      | 100  | 110  | 120  | 10%  |
| India  | Type A  | Sub A2      | 200  | 220  | 240  | 10%  |
| India  | Type B  | Sub B1      | 150  | 165  | 180  | 10%  |
```

## Usage

### For Users

1. Navigate to `/excel-upload` page
2. Upload your value Excel file (required)
3. Optionally upload your volume Excel file
4. Click "Process Excel Files"
5. Wait for processing to complete
6. You'll be redirected to the dashboard with your data loaded

### For Developers

#### Import the Excel Processor

```typescript
import { convertExcelToJson, convertExcelFiles } from '../excel-upload-tool/lib/excel-processor'

// Convert single Excel file
const jsonData = convertExcelToJson(excelBuffer)

// Convert multiple Excel files
const { value, volume } = convertExcelFiles(valueBuffer, volumeBuffer)
```

#### Use the Upload Component

```typescript
import { ExcelUploader } from '../excel-upload-tool/components/ExcelUploader'

<ExcelUploader 
  onDataLoaded={(data) => {
    // Handle loaded data
    console.log(data)
  }}
  onError={(error) => {
    // Handle error
    console.error(error)
  }}
/>
```

## Installation

The tool requires the `xlsx` package. Install it in the frontend-clean directory:

```bash
cd frontend-clean
npm install xlsx @types/xlsx
```

## File Structure

```
excel-upload-tool/
├── lib/
│   └── excel-processor.ts          # Excel to JSON conversion logic
├── components/
│   └── ExcelUploader.tsx           # Upload UI component
├── package.json                    # Package configuration
└── README.md                       # This file

frontend-clean/
├── app/
│   ├── api/
│   │   └── process-excel/
│   │       └── route.ts            # API endpoint
│   └── excel-upload/
│       └── page.tsx                # Upload page
└── ...
```

## Processing Flow

1. User uploads Excel files through the UI
2. Files are sent to `/api/process-excel` endpoint
3. Excel files are converted to JSON using `excel-processor.ts`
4. JSON files are temporarily saved
5. JSON files are processed through existing `loadAndProcessJsonFiles()` pipeline
6. `ComparisonData` is returned and loaded into the dashboard
7. Temporary files are cleaned up

## Column Detection

The tool automatically detects:

- **Segmentation columns**: Looks for patterns like:
  - Region, Geography
  - Segment
  - Sub-segment, Sub-segment 1, Sub-segment 2, etc.
  - Level 1, Level 2, etc.
  - Category, Sub-category

- **Year columns**: 4-digit numbers (e.g., 2018, 2019, 2020)

## Validation

The tool validates:
- File format (must be .xlsx or .xls)
- Presence of segmentation columns
- Presence of year columns
- Data rows exist

## Error Handling

Errors are caught and displayed to the user with helpful messages:
- Invalid file format
- Missing required columns
- Processing errors
- File read errors

## Notes

- The tool handles variable depth segmentation automatically
- Consecutive repeated values in segmentation columns are handled (keeps last row)
- Empty cells are converted to null
- Numbers are automatically parsed
- Percentages are preserved as strings

