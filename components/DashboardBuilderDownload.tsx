'use client'

/**
 * ShareDashboard – floating widget shown on the live dashboard.
 *
 * Generates a permanent, unique share-link for the current dashboard so it
 * can be sent to any client and opened in any browser at any time.
 */

import { useState } from 'react'
import { useDashboardStore } from '@/lib/store'
import { Link2, Copy, Check, Loader2, RefreshCw, X } from 'lucide-react'
import { postDashboardSave } from '@/lib/share-upload'

export function DashboardBuilderDownload() {
  const {
    data,
    dashboardName,
    currency,
    intelligenceType,
    rawIntelligenceData,
    proposition2Data,
    proposition3Data,
    distributorRawIntelligenceData,
    distributorProposition2Data,
    distributorProposition3Data,
    pricingAnalysisData,
    showDemoNote,
    dashboardId,
    setDashboardId,
    fromDashboardBuilder,
    dashboardBuilderFiles,
  } = useDashboardStore()

  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  // Only show when actual data is present and originated from the builder
  const hasData = !!(data || rawIntelligenceData?.rows?.length || pricingAnalysisData)
  const shouldShow =
    !dismissed &&
    hasData &&
    (fromDashboardBuilder || dashboardBuilderFiles?.valueFile || rawIntelligenceData || pricingAnalysisData)

  if (!shouldShow) return null

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const payload = {
        name: dashboardName || 'Untitled Dashboard',
        currency: currency || 'USD',
        dashboardId: dashboardId ?? undefined, // pass so the API can upsert the existing doc
        data: data ?? null,
        intelligenceType: intelligenceType ?? null,
        rawIntelligenceData: rawIntelligenceData ?? null,
        proposition2Data: proposition2Data ?? null,
        proposition3Data: proposition3Data ?? null,
        distributorRawIntelligenceData: distributorRawIntelligenceData ?? null,
        distributorProposition2Data: distributorProposition2Data ?? null,
        distributorProposition3Data: distributorProposition3Data ?? null,
        pricingAnalysisData: pricingAnalysisData ?? null,
        showDemoNote: showDemoNote ?? false,
      }

      // Estimate payload size to give user a heads-up on very large datasets
      const serialised = JSON.stringify(payload)
      const estimatedMB = serialised.length / 1_048_576

      if (estimatedMB > 48) {
        setError(
          `Dashboard data is too large (~${estimatedMB.toFixed(0)} MB). ` +
          'Try reducing the number of segments or geographies before sharing.'
        )
        setIsGenerating(false)
        return
      }

      const res = await postDashboardSave(payload)

      let body: any
      try {
        body = await res.json()
      } catch {
        body = {}
      }

      if (!res.ok) {
        throw new Error(body?.error || `Server error (${res.status})`)
      }

      if (!body?.shareUrl) {
        throw new Error('Server returned no share URL')
      }

      setShareUrl(body.shareUrl)
      if (body.id && typeof body.id === 'string') {
        setDashboardId(body.id)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error – please try again.'
      setError(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // Clipboard API unavailable (non-HTTPS or old browser) – use execCommand fallback
      const el = document.createElement('input')
      el.value = shareUrl
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.focus()
      el.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleReset = () => {
    setShareUrl(null)
    setError(null)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold text-white">Share Dashboard</span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-blue-200 hover:text-white transition-colors"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {!shareUrl && !error && (
            <>
              <p className="text-xs text-gray-500 mb-3">
                Generate a permanent link unique to this dashboard. Share it with your client — it works on any browser, any device, any time.
              </p>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Saving dashboard…</>
                ) : (
                  <><Link2 className="h-4 w-4" />Generate Shareable Link</>
                )}
              </button>
            </>
          )}

          {error && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <svg className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-red-700">{error}</p>
              </div>
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </button>
            </div>
          )}

          {shareUrl && (
            <div className="space-y-2">
              <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                Link ready — share with your client
              </p>

              {/* URL display */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onClick={e => (e.target as HTMLInputElement).select()}
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg text-gray-700 cursor-text"
                />
                <button
                  onClick={handleCopy}
                  title={copied ? 'Copied!' : 'Copy to clipboard'}
                  className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    copied
                      ? 'bg-green-600 text-white scale-95'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <button
                onClick={handleReset}
                className="text-xs text-gray-400 hover:text-gray-600 underline-offset-2 hover:underline transition-colors"
              >
                Generate a new link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
