'use client'

import { Factory, ShoppingCart } from 'lucide-react'

export type BuyerSurveyMode = { b2b: boolean; b2c: boolean }

interface BuyerSurveyDataInputProps {
  mode: BuyerSurveyMode
  onModeChange: (mode: BuyerSurveyMode) => void
}

/**
 * Survey-type selector for the B2B / B2C builder tab.
 *
 * Mirrors IntelligenceDataInput: at least one type must stay enabled, and each
 * enabled type gets its own JSON upload slot below.
 */
export function BuyerSurveyDataInput({ mode, onModeChange }: BuyerSurveyDataInputProps) {
  const setB2bChecked = (checked: boolean) => {
    if (!checked && !mode.b2c) return
    onModeChange({ ...mode, b2b: checked })
  }

  const setB2cChecked = (checked: boolean) => {
    if (!checked && !mode.b2b) return
    onModeChange({ ...mode, b2c: checked })
  }

  return (
    <div className="space-y-6">
      <div className="builder-panel-nested">
        <label className="mb-4 block text-sm font-medium text-slate-200">
          Survey types to include
        </label>
        <p className="mb-3 text-xs text-slate-400">
          Select one or both. Upload the survey JSON export below for each type you enable (B2B and
          B2C each use their own file when both are selected).
        </p>
        <div className="flex flex-wrap gap-6">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={mode.b2b}
              onChange={(e) => setB2bChecked(e.target.checked)}
              className="builder-radio h-4 w-4 rounded"
            />
            <Factory className="h-5 w-5 text-sky-400/80" />
            <span className="text-sm font-medium text-slate-200">B2B Survey</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={mode.b2c}
              onChange={(e) => setB2cChecked(e.target.checked)}
              className="builder-radio h-4 w-4 rounded"
            />
            <ShoppingCart className="h-5 w-5 text-emerald-400/80" />
            <span className="text-sm font-medium text-slate-200">B2C Survey</span>
          </label>
        </div>
      </div>
    </div>
  )
}
