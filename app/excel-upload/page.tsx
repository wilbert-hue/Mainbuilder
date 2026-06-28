'use client'

import { useRouter } from 'next/navigation'
import { ExcelUploader } from '@excel-upload-tool/components/ExcelUploader'
import { useDashboardStore } from '@/lib/store'
import type { ComparisonData } from '@/lib/types'
import Image from 'next/image'

export default function ExcelUploadPage() {
  const router = useRouter()
  const { setData, setLoading, setError, clearData } = useDashboardStore()

  const handleDataLoaded = (data: ComparisonData) => {
    // Clear old data first to ensure clean state for new market
    clearData()
    
    // Set new data
    setData(data)
    setLoading(false)
    setError(null)
    
    // Redirect to main dashboard after successful upload
    setTimeout(() => {
      router.push('/')
    }, 1500)
  }

  const handleError = (error: string) => {
    setError(error)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image 
                src="/logo.png" 
                alt="Coherent Market Insights Logo" 
                width={150} 
                height={60}
                className="h-auto w-auto max-w-[150px]"
                priority
              />
              <div>
                <h1 className="text-xl font-bold text-black">Excel Upload</h1>
                <p className="text-sm text-gray-600">Upload your Excel files to generate the dashboard</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/dashboard-builder')}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Dashboard Builder
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-100 rounded-md transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <ExcelUploader 
            onDataLoaded={handleDataLoaded}
            onError={handleError}
          />
        </div>
      </div>
    </div>
  )
}

