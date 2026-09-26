'use client'

/**
 * Buyer Survey (B2B / B2C) dashboard view.
 *
 * Layout, top to bottom:
 *   1. Title card        — module kicker + market name
 *   2. Buyers           — who buys, and how each buyer type buys
 *   3. Buyer landscape   — "Organisations We Surveyed" / "Designations We Spoke To"
 *   4. Executive summary — headline, key findings, market signal (when present)
 *   5. Segment tabs      — numbered 01, 02, … from the JSON segments
 *   6. Filter bar        — free-text search + confidence tier, with a question count
 *   7. Question cards    — Q badge, text, n, chart, takeaway
 *   8. Methodology       — respondents / geography tiles, approach, coverage
 */

import { useMemo, useState } from 'react'
import { useDashboardStore } from '@/lib/store'
import {
  confidenceLabel,
  collectConfidenceTiers,
  type BuyerSurveyKind,
  type BuyerSurveyQuestion,
  type BuyerSurveyReport,
} from '@/lib/buyer-survey-types'
import { BuyerSurveyChart, BuyerSurveyLegend } from './BuyerSurveyChart'

interface Props {
  /** Which report to render. */
  kind: BuyerSurveyKind
}

// ── Sub-components ──────────────────────────────────────────────────────────

/** Buyer types and how each buys — the "Buyers" panel above the landscape. */
function BuyersPanel({ report }: { report: BuyerSurveyReport }) {
  const { landscape } = report
  const segments = landscape.buyerSegments
  if (segments.length === 0 && !landscape.whoBuys) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-l-4 border-[#52B69A] p-5">
        <h3 className="mb-2 inline-block border-b-2 border-[#52B69A] pb-0.5 text-base font-bold text-[#0f3d5c]">
          Buyers
        </h3>

        {landscape.whoBuys && (
          <p className="mb-4 text-sm leading-relaxed text-slate-700">{landscape.whoBuys}</p>
        )}

        {segments.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {segments.map((s, i) => (
              <div key={i} className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="mb-1 text-sm font-bold text-[#0f3d5c]">{s.name}</div>
                {s.description && (
                  <p className="text-[0.85rem] leading-relaxed text-slate-600">{s.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LandscapePanel({ report }: { report: BuyerSurveyReport }) {
  const { landscape } = report
  const hasOrgs = landscape.organisations.length > 0
  const hasDesignations = landscape.designations.length > 0
  if (!hasOrgs && !hasDesignations) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="max-h-[22rem] overflow-y-auto border-l-4 border-[#1A759F] p-5">
        {hasOrgs && (
          <>
            <h4 className="mb-2 inline-block border-b-2 border-[#52B69A] pb-0.5 text-base font-bold text-[#0f3d5c]">
              {landscape.organisationsHeading}
            </h4>
            <ul className="mb-5 space-y-1.5">
              {landscape.organisations.map((o, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-800">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#1A759F]" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {hasDesignations && (
          <>
            <h4 className="mb-2 inline-block border-b-2 border-[#52B69A] pb-0.5 text-base font-bold text-[#0f3d5c]">
              {landscape.designationsHeading}
            </h4>
            <ul className="space-y-1.5">
              {landscape.designations.map((d, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-800">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#1A759F]" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </>
        )}

      </div>
    </div>
  )
}

function ExecutiveSummaryCard({ report }: { report: BuyerSurveyReport }) {
  const summary = report.executiveSummary
  if (!summary) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-[#f7fafc] p-6 shadow-sm">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#1A759F]">
        Executive Summary
      </p>
      {summary.headline && (
        <h3 className="mb-4 text-lg font-bold leading-snug text-[#0f3d5c]">{summary.headline}</h3>
      )}

      {summary.keyFindings.length > 0 && (
        <ul className="space-y-2.5">
          {summary.keyFindings.map((f, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-800">
              <span className="mt-0.5 shrink-0 font-bold text-[#1A759F]">›</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}

      {summary.marketSignal && (
        <p className="mt-4 text-sm italic leading-relaxed text-slate-600">{summary.marketSignal}</p>
      )}
      {summary.methodologyNote && (
        <p className="mt-3 text-xs text-slate-500">{summary.methodologyNote}</p>
      )}
    </div>
  )
}

function QuestionCard({ question, index }: { question: BuyerSurveyQuestion; index: number }) {
  const label = question.id || `Q${index + 1}`
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Question header */}
      <div className="flex flex-wrap items-center gap-3 border-l-4 border-[#1A759F] bg-[#eef6fb] px-4 py-3">
        <span className="shrink-0 rounded bg-[#E8833A] px-2 py-1 text-xs font-bold text-white">
          {label}
        </span>
        <span className="flex-1 text-sm font-bold leading-snug text-[#0f3d5c]">
          {question.text}
        </span>
        {question.n !== null && (
          <span className="shrink-0 text-xs text-slate-500">Sample Size - {question.n} Respondents</span>
        )}
      </div>

      {/* Chart */}
      <div className="px-4 pt-5">
        <BuyerSurveyChart options={question.options} chartType={question.chartType} />
        <BuyerSurveyLegend options={question.options} />
      </div>

      {/* Takeaway */}
      {question.keyInsight && (
        <div className="mt-4 border-t border-slate-200 px-4 py-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#1A759F]">
            Takeaways
          </p>
          <p className="text-sm leading-relaxed text-slate-700">{question.keyInsight}</p>
        </div>
      )}
    </div>
  )
}

function MethodologyPanel({ report }: { report: BuyerSurveyReport }) {
  const m = report.methodology
  const breakdown = Object.entries(report.sampleBreakdown)
  const hasAnything =
    m.approach || m.reportCovers.length > 0 || m.whoQualified.length > 0
  if (!hasAnything && breakdown.length === 0) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0f3d5c]">
        Methodology at a Glance
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-slate-200 p-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Respondents
          </p>
          <p className="text-sm font-bold text-[#0f3d5c]">
            Sample Size - {m.sampleSize ?? report.sampleSize ?? '—'} Respondents (verified procurement professionals)
          </p>
        </div>
        <div className="rounded-md border border-slate-200 p-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Geography
          </p>
          <p className="text-sm font-bold text-[#0f3d5c]">{m.geography || report.geo}</p>
        </div>
      </div>

      {breakdown.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {breakdown.map(([region, count]) => (
            <span
              key={region}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
            >
              {region}: <span className="font-semibold">{count}</span>
            </span>
          ))}
        </div>
      )}

      {m.approach && (
        <p className="mt-4 text-sm leading-relaxed text-slate-700">{m.approach}</p>
      )}

      {m.reportCovers.length > 0 && (
        <>
          <h4 className="mb-2 mt-5 inline-block border-b-2 border-[#52B69A] pb-0.5 text-base font-bold text-[#0f3d5c]">
            What This Report Covers
          </h4>
          <ul className="space-y-1.5">
            {m.reportCovers.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-800">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#1A759F]" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {m.whoQualified.length > 0 && (
        <>
          <h4 className="mb-2 mt-5 inline-block border-b-2 border-[#52B69A] pb-0.5 text-base font-bold text-[#0f3d5c]">
            Who Qualified
          </h4>
          <ul className="space-y-1.5">
            {m.whoQualified.map((q, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-800">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#1A759F]" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {(report.analystName || report.analystTitle) && (
        <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Analyst:</span>{' '}
          {[report.analystName, report.analystTitle].filter(Boolean).join(', ')}
        </p>
      )}
    </div>
  )
}

// ── Main view ───────────────────────────────────────────────────────────────

export function BuyerSurveyView({ kind }: Props) {
  const { b2bSurveyData, b2cSurveyData } = useDashboardStore()
  const report = kind === 'b2c' ? b2cSurveyData : b2bSurveyData

  const [activeSegment, setActiveSegment] = useState(0)
  const [search, setSearch] = useState('')
  const [confidenceFilter, setConfidenceFilter] = useState('all')

  const tiers = useMemo(() => collectConfidenceTiers(report), [report])

  // Clamp the segment index so a smaller report never leaves us on a dead tab.
  const segmentIndex = report && activeSegment < report.segments.length ? activeSegment : 0
  const segment = report?.segments[segmentIndex] ?? null

  const visibleQuestions = useMemo(() => {
    if (!segment) return []
    const term = search.trim().toLowerCase()
    return segment.questions.filter((q) => {
      if (confidenceFilter !== 'all' && q.confidence !== confidenceFilter) return false
      if (!term) return true
      return (
        q.text.toLowerCase().includes(term) ||
        q.keyInsight.toLowerCase().includes(term) ||
        q.options.some((o) => o.label.toLowerCase().includes(term))
      )
    })
  }, [segment, search, confidenceFilter])

  if (!report) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">
            No {kind.toUpperCase()} survey data loaded
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Upload a {kind.toUpperCase()} survey JSON file in the Dashboard Builder to populate this
            view.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* 1 — Title card */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-l-4 border-[#1A759F] px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#1A759F]">
            {report.module}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-[#0f3d5c]">{report.industry}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <span>{report.geo}</span>
            {report.sampleSize !== null && <span>Sample Size - {report.sampleSize} Respondents</span>}
            <span>
              {report.segments.length} section{report.segments.length === 1 ? '' : 's'} ·{' '}
              {report.questionCount} question{report.questionCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* 2 — Buyers */}
      <BuyersPanel report={report} />

      {/* 3 — Organisations & designations */}
      <LandscapePanel report={report} />

      {/* 4 — Executive summary */}
      <ExecutiveSummaryCard report={report} />

      {/* 5 — Segment tabs */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap border-b border-slate-200">
          {report.segments.map((s, i) => {
            const isActive = i === segmentIndex
            return (
              <button
                key={s.id}
                onClick={() => setActiveSegment(i)}
                className={`flex items-center gap-2 px-5 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-[#0f3d5c] font-semibold text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
                title={s.focus}
              >
                <span
                  className={`text-xs font-bold ${
                    isActive ? 'text-[#B5E48C]' : 'text-slate-400'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={isActive ? 'text-[#D9ED92]' : ''}>{s.title}</span>
              </button>
            )
          })}
        </div>

        {/* Accent rule under the tab strip */}
        <div className="h-[3px] bg-gradient-to-r from-[#1A759F] via-[#52B69A] to-[#D9ED92]" />

        {/* 5 — Filters */}
        <div className="space-y-3 border-b border-slate-200 p-4">
          {segment?.focus && (
            <p className="text-xs leading-relaxed text-slate-600">{segment.focus}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Question or insight text…"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1A759F] focus:outline-none focus:ring-1 focus:ring-[#1A759F]"
              />
            </label>
            {tiers.length > 1 && (
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Confidence
                </span>
                <select
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#1A759F] focus:outline-none focus:ring-1 focus:ring-[#1A759F]"
                >
                  <option value="all">All confidence</option>
                  {tiers.map((t) => (
                    <option key={t} value={t}>
                      {confidenceLabel(t)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <p className="text-xs text-slate-600">
            {visibleQuestions.length} question{visibleQuestions.length === 1 ? '' : 's'}
            {visibleQuestions.length !== (segment?.questions.length ?? 0) && (
              <span className="text-slate-400"> of {segment?.questions.length}</span>
            )}
          </p>
        </div>

        {/* 6 — Question cards */}
        <div className="space-y-5 bg-slate-50/60 p-4">
          {visibleQuestions.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500">
              No questions match the current filters.
            </div>
          ) : (
            visibleQuestions.map((q, i) => <QuestionCard key={q.id + i} question={q} index={i} />)
          )}
        </div>
      </div>

      {/* 7 — Methodology */}
      <MethodologyPanel report={report} />
    </div>
  )
}
