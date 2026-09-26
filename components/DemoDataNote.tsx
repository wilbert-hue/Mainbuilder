'use client'

/**
 * Dummy-data disclaimer. Rendered under the KPI row and above every
 * market-analysis chart; the other views carry real directory/survey content
 * and deliberately do not show it.
 */

export const DEMO_DATA_NOTE =
  'All the data consists of dummy number, No real-world data is related to this'

export function DemoDataNote({ className = '' }: { className?: string }) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-md border border-amber-400 bg-amber-100 px-5 py-3.5 ${className}`}
    >
      <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      <p className="text-sm font-medium text-amber-900">
        <span className="font-bold">NOTE:</span> {DEMO_DATA_NOTE}
      </p>
    </div>
  )
}
