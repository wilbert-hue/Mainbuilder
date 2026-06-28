'use client'

import { useState, useRef, DragEvent } from 'react'
import { Upload, File, X, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

// ComparisonData type - will be properly typed when used in frontend-clean
// Using any for now to avoid circular dependencies
export type ComparisonData = any

interface ExcelUploaderProps {
  onDataLoaded?: (data: ComparisonData) => void
  onError?: (error: string) => void
}

export function ExcelUploader({ onDataLoaded, onError }: ExcelUploaderProps) {
  const [valueFile, setValueFile] = useState<File | null>(null)
  const [volumeFile, setVolumeFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  
  const valueFileInputRef = useRef<HTMLInputElement>(null)
  const volumeFileInputRef = useRef<HTMLInputElement>(null)

  const handleValueFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (isValidExcelFile(file)) {
        setValueFile(file)
        setStatus('idle')
        setStatusMessage('')
      } else {
        setStatus('error')
        setStatusMessage('Please select a valid Excel or CSV file (.xlsx, .xls, or .csv)')
        if (onError) {
          onError('Invalid file type for value file')
        }
      }
    }
  }

  const handleVolumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (isValidExcelFile(file)) {
        setVolumeFile(file)
        setStatus('idle')
        setStatusMessage('')
      } else {
        setStatus('error')
        setStatusMessage('Please select a valid Excel or CSV file (.xlsx, .xls, or .csv)')
        if (onError) {
          onError('Invalid file type for volume file')
        }
      }
    }
  }

  const isValidExcelFile = (file: File): boolean => {
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const fileName = file.name.toLowerCase()
    return validExtensions.some(ext => fileName.endsWith(ext))
  }

  const handleRemoveValueFile = () => {
    setValueFile(null)
    if (valueFileInputRef.current) {
      valueFileInputRef.current.value = ''
    }
  }

  const handleRemoveVolumeFile = () => {
    setVolumeFile(null)
    if (volumeFileInputRef.current) {
      volumeFileInputRef.current.value = ''
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>, fileType: 'value' | 'volume') => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && isValidExcelFile(file)) {
      if (fileType === 'value') {
        setValueFile(file)
      } else {
        setVolumeFile(file)
      }
      setStatus('idle')
      setStatusMessage('')
    } else {
      setStatus('error')
      setStatusMessage('Please drop a valid Excel or CSV file (.xlsx, .xls, or .csv)')
    }
  }

  const handleUpload = async () => {
    if (!valueFile) {
      setStatus('error')
      setStatusMessage('Please select a value file')
      return
    }

    try {
      setIsProcessing(true)
      setStatus('idle')
      setStatusMessage('')
      
      const formData = new FormData()
      formData.append('valueFile', valueFile)
      if (volumeFile) {
        formData.append('volumeFile', volumeFile)
      }

      const response = await fetch('/api/process-excel', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || `Failed to process Excel/CSV files: ${response.statusText}`
        const debugInfo = errorData.debug ? `\n\nDebug Info:\n${typeof errorData.debug === 'string' ? errorData.debug : JSON.stringify(errorData.debug, null, 2)}` : ''
        throw new Error(`${errorMessage}${debugInfo}`)
      }

      const raw = await response.json()
      const { _ingestMetrics, ...data } = raw as ComparisonData & {
        _ingestMetrics?: Record<string, number>
      }
      if (_ingestMetrics) {
        console.log('[process-excel] server metrics:', _ingestMetrics)
      }

      setStatus('success')
      setStatusMessage('Excel/CSV files processed successfully!')
      
      if (onDataLoaded) {
        onDataLoaded(data)
      }
      
      // Clear status message after 3 seconds
      setTimeout(() => {
        setStatus('idle')
        setStatusMessage('')
      }, 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while processing Excel/CSV files'
      setStatus('error')
      setStatusMessage(errorMessage)
      
      if (onError) {
        onError(errorMessage)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-black mb-2">Upload Excel/CSV Files</h3>
        <p className="text-sm text-gray-600">
          Upload your value and volume Excel or CSV files to generate the dashboard. The files should have hierarchical segmentation columns (Region, Segment, Sub-segment, etc.) and year columns.
        </p>
      </div>

      {/* Value File Upload */}
      <div>
        <label className="block text-sm font-medium text-black mb-2">
          Value File <span className="text-red-500">*</span>
        </label>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'value')}
        >
          {valueFile ? (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <File className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-black">{valueFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(valueFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemoveValueFile}
                className="text-gray-400 hover:text-red-600 transition-colors"
                disabled={isProcessing}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div>
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop your Excel or CSV file here, or
              </p>
              <button
                onClick={() => valueFileInputRef.current?.click()}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                disabled={isProcessing}
              >
                browse files
              </button>
              <input
                ref={valueFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleValueFileChange}
                className="hidden"
                disabled={isProcessing}
              />
            </div>
          )}
        </div>
      </div>

      {/* Volume File Upload (Optional) */}
      <div>
        <label className="block text-sm font-medium text-black mb-2">
          Volume File <span className="text-gray-500 text-xs">(Optional)</span>
        </label>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'volume')}
        >
          {volumeFile ? (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <File className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-black">{volumeFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(volumeFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemoveVolumeFile}
                className="text-gray-400 hover:text-red-600 transition-colors"
                disabled={isProcessing}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div>
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop your Excel or CSV file here, or
              </p>
              <button
                onClick={() => volumeFileInputRef.current?.click()}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                disabled={isProcessing}
              >
                browse files
              </button>
              <input
                ref={volumeFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleVolumeFileChange}
                className="hidden"
                disabled={isProcessing}
              />
            </div>
          )}
        </div>
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={isProcessing || !valueFile}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing Excel/CSV files...
          </>
        ) : (
          <>
            <Upload className="h-5 w-5" />
            Process Excel/CSV Files
          </>
        )}
      </button>

      {/* Status Message */}
      {status !== 'idle' && (
        <div
          className={`flex items-start gap-3 p-4 rounded-lg ${
            status === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {status === 'success' ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">{statusMessage}</p>
          </div>
        </div>
      )}

      {/* Format Information */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-600">
            <p className="font-medium text-black mb-1">Expected Excel/CSV Format:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>First row: Headers</li>
              <li>Segmentation columns: Region, Segment, Sub-segment, Sub-segment 1, etc.</li>
              <li>Year columns: 2018, 2019, 2020, etc. (4-digit years)</li>
              <li>Optional: CAGR column</li>
              <li>Data rows: Hierarchical structure with values in year columns</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

