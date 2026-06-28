'use client'

import { Users, Building2 } from 'lucide-react'

export type IntelligenceMode = { customer: boolean; distributor: boolean }

/** Kept for `intelligence-data-converter` manual conversion paths */
export interface CustomerData {
  id: string
  name: string
  region: string
  endUserSegment: string
  proposition1?: string
  proposition2?: string
  proposition3?: string
}

export interface DistributorData {
  id: string
  companyName: string
  region: string
  segment: string
  proposition1?: string
  proposition2?: string
  proposition3?: string
  yearEstablished?: string
  headquarters?: string
  email?: string
  phone?: string
}

interface IntelligenceDataInputProps {
  mode: IntelligenceMode
  onModeChange: (mode: IntelligenceMode) => void
}

export function IntelligenceDataInput({ mode, onModeChange }: IntelligenceDataInputProps) {
  const setCustomerChecked = (checked: boolean) => {
    if (!checked && !mode.distributor) return
    onModeChange({ ...mode, customer: checked })
  }

  const setDistributorChecked = (checked: boolean) => {
    if (!checked && !mode.customer) return
    onModeChange({ ...mode, distributor: checked })
  }

  return (
    <div className="space-y-6">
      <div className="builder-panel-nested">
        <label className="mb-4 block text-sm font-medium text-slate-200">
          Intelligence types to include
        </label>
        <p className="mb-3 text-xs text-slate-400">
          Select one or both. Upload your workbook below for each type you enable (customer and
          distributor each use their own file when both are selected).
        </p>
        <div className="flex flex-wrap gap-6">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={mode.customer}
              onChange={(e) => setCustomerChecked(e.target.checked)}
              className="builder-radio h-4 w-4 rounded"
            />
            <Users className="h-5 w-5 text-sky-400/80" />
            <span className="text-sm font-medium text-slate-200">Customer Intelligence</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={mode.distributor}
              onChange={(e) => setDistributorChecked(e.target.checked)}
              className="builder-radio h-4 w-4 rounded"
            />
            <Building2 className="h-5 w-5 text-violet-400/80" />
            <span className="text-sm font-medium text-slate-200">Distributor Intelligence</span>
          </label>
        </div>
      </div>
    </div>
  )
}
