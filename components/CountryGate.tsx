'use client'

/**
 * Country selector shown above every non-market-analysis view.
 *
 * Only the covered geography (India) carries data in these dashboards; every
 * other country is a paywalled placeholder, so selecting one swaps the panel
 * for a subscribe prompt rather than rendering an empty view.
 */

import { useState } from 'react'
import { Lock, Globe } from 'lucide-react'

export const COVERED_COUNTRY = 'India'

export const COUNTRIES = [
  'India',
  'United States',
  'Canada',
  'United Kingdom',
  'Germany',
  'France',
  'Japan',
  'China',
  'Australia',
  'Brazil',
]

export function CountryGate({ children }: { children: React.ReactNode }) {
  const [country, setCountry] = useState(COVERED_COUNTRY)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold text-black">
            <Globe className="h-3.5 w-3.5" />
            Country
          </span>
          {COUNTRIES.map((c) => {
            const isSelected = c === country
            return (
              <button
                key={c}
                onClick={() => setCountry(c)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#52B69A] to-[#34A0A4] text-white shadow-sm'
                    : 'text-black hover:bg-gray-50'
                }`}
              >
                {c}
              </button>
            )
          })}
        </div>
      </div>

      {country === COVERED_COUNTRY ? (
        children
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-20 text-center shadow-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Lock className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-[#0f3d5c]">Data Hidden</h3>
          <p className="mt-2 text-sm text-slate-600">
            Please subscribe for more — {country} coverage is available on request.
          </p>
        </div>
      )}
    </div>
  )
}
