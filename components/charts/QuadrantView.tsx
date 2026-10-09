'use client'

/**
 * Coherent Quadrant dashboard view.
 *
 * Mirrors the standalone HTML report, with three deliberate differences:
 *
 *  1. The HTML report's Tables A and B are replaced by one block per company,
 *     carrying that company's X axis above its Y axis. Each axis lists its
 *     parameters on the left; clicking one expands its rationale and evidence
 *     on the right. The original six-column tables put a long paragraph in
 *     every cell of every row, so each column collapsed to a vertical ribbon of
 *     two or three words and nothing was scannable.
 *
 *  2. "Other Noticeable Player" carries a Relative Positioning column, sourced
 *     from each company's `quadrant` value.
 *
 *  3. Every company listing is ordered by quadrant — Leaders, Challengers,
 *     Trailblazers, then Evolving Players — ranked by overall score within each.
 */

import { useMemo, useState } from 'react'
import { Lock } from 'lucide-react'
import { useDashboardStore } from '@/lib/store'
import { buildDemoQuadrant } from '@/lib/demo-quadrant'
import { DemoDataNote } from '@/components/DemoDataNote'
import {
  normaliseQuadrant,
  sortByQuadrant,
  plotPosition,
  strengthDots,
  QUADRANT_COLORS,
  QUADRANT_KEYS,
  type QuadrantCompany,
  type QuadrantParameterScore,
  type QuadrantReport,
} from '@/lib/quadrant-types'

const NAVY = '#002857'
const SCORE_BLUE = '#1e3a8a'

/** Rows shown before "Other Noticeable Player" is expanded. */
const OTHERS_PREVIEW_ROWS = 4

// ── Small pieces ────────────────────────────────────────────────────────────

function ScoreDisc({ score }: { score: number | null }) {
  return (
    <span
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[0.82rem] font-bold text-white tabular-nums"
      style={{ backgroundColor: SCORE_BLUE }}
    >
      {score ?? '—'}
    </span>
  )
}

/** Axis score disc that expands to show the parameter breakdown. */
function AxisScoreCell({
  score,
  params,
  locked = false,
}: {
  score: number | null
  params: QuadrantParameterScore[]
  /** Demo mode: the parameter names are real, their scores are withheld. */
  locked?: boolean
}) {
  if (params.length === 0) return <ScoreDisc score={score} />
  return (
    <details className="inline-block">
      <summary className="flex cursor-pointer list-none items-center gap-2">
        <ScoreDisc score={score} />
        <span
          className="h-0 w-0 border-y-[6px] border-r-[7px] border-y-transparent transition-transform"
          style={{ borderRightColor: SCORE_BLUE }}
        />
      </summary>
      <div className="mt-2 min-w-[300px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        {params.map((p, i) => (
          <div
            key={i}
            className="flex justify-between gap-4 border-t border-slate-100 py-1 text-[0.82rem] first:border-t-0"
          >
            <span className="text-slate-700">{p.name}</span>
            <span className="font-bold tabular-nums" style={{ color: SCORE_BLUE }}>
              {locked ? <LockedField /> : p.score ?? '—'}
            </span>
          </div>
        ))}
      </div>
    </details>
  )
}

function StrengthDots({ score }: { score: number | null }) {
  const sizes = [7, 10, 13, 16, 19]
  const filled = strengthDots(score)
  return (
    <span className="inline-flex items-center gap-1" title={`Overall score ${score ?? '—'}`}>
      {sizes.map((s, i) => (
        <span
          key={i}
          className="inline-block shrink-0 rounded-full border"
          style={{
            width: s,
            height: s,
            backgroundColor: filled[i] ? SCORE_BLUE : '#e2e8f0',
            borderColor: filled[i] ? SCORE_BLUE : '#cbd5e1',
          }}
        />
      ))}
    </span>
  )
}

/** Pill showing which quadrant a company sits in. */
/** Stands in for a field the demo withholds. */
function LockedField({ label = false }: { label?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-400" title="Available on subscription">
      <Lock className="h-3.5 w-3.5" />
      {label && <span className="text-[0.78rem] italic">Subscribe to access</span>}
    </span>
  )
}

function QuadrantPill({ quadrant }: { quadrant: string }) {
  const q = normaliseQuadrant(quadrant)
  const color = QUADRANT_COLORS[q] || '#cbd5e1'
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.82rem] font-semibold text-slate-800">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {q}
    </span>
  )
}

/**
 * One axis for one company: the parameter list on the left, the selected
 * parameter's evidence expanded on the right.
 *
 * Replaces the wide six-column table, where a long paragraph in every cell of
 * every row left nothing scannable. Here the reader picks the parameter they
 * care about and reads it at full width.
 */
function AxisParameterPanel({
  axisLabel,
  axisName,
  params,
  demoLocked = false,
}: {
  axisLabel: 'X' | 'Y'
  axisName: string
  params: QuadrantParameterScore[]
  /** Demo mode: the parameters are real, the evidence behind them is withheld. */
  demoLocked?: boolean
}) {
  // Default to the first parameter so the detail pane is never empty on open.
  const [selected, setSelected] = useState<string | null>(params[0]?.name ?? null)

  if (params.length === 0) return null
  const active = params.find((p) => p.name === selected) ?? null

  return (
    <div>
      <div className="mb-2 text-[0.78rem] font-bold uppercase tracking-wider text-[#1A759F]">
        {axisLabel} — {axisName}
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(220px,300px)_1fr]">
        {/* Parameter list */}
        <ul className="space-y-1">
          {params.map((p) => {
            const isActive = p.name === selected
            return (
              <li key={p.name}>
                <button
                  onClick={() => setSelected(isActive ? null : p.name)}
                  aria-expanded={isActive}
                  className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
                    isActive
                      ? 'border-[#1A759F] bg-[#eef6fb]'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`h-0 w-0 shrink-0 border-y-[4px] border-l-[6px] border-y-transparent transition-transform ${
                      isActive ? 'rotate-90' : ''
                    }`}
                    style={{ borderLeftColor: isActive ? '#1A759F' : '#94a3b8' }}
                  />
                  <span
                    className={`flex-1 text-[0.84rem] leading-snug ${
                      isActive ? 'font-bold text-[#0f3d5c]' : 'font-medium text-slate-700'
                    }`}
                  >
                    {p.name}
                  </span>
                  {demoLocked ? (
                    <span className="shrink-0 text-slate-400" title="Available on subscription">
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[0.75rem] font-bold tabular-nums text-white"
                      style={{ backgroundColor: SCORE_BLUE }}
                    >
                      {p.score ?? '—'}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        {/* Detail for the selected parameter */}
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          {demoLocked ? (
            <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Lock className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-[#0f3d5c]">
                Kindly subscribe to access these details
              </p>
              {active && <p className="text-[0.8rem] text-slate-500">{active.name}</p>}
            </div>
          ) : active ? (
            <div className="leading-relaxed">
              <div className="mb-2 font-bold text-slate-900">
                {active.name} — scored {active.score ?? '—'}/100
              </div>

              {active.basis && (
                <p className="mb-3 border-l-[3px] border-[#52B69A] pl-3 text-[0.9rem] text-slate-700">
                  {active.basis}
                </p>
              )}

              {active.evidence.length > 0 && (
                <>
                  <div className="mb-1.5 text-[0.72rem] font-bold uppercase tracking-wider text-slate-500">
                    Supporting points
                  </div>
                  <ul className="list-disc space-y-2 pl-5 text-[0.9rem] text-slate-700">
                    {active.evidence.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </>
              )}

              {!active.basis && active.evidence.length === 0 && (
                <p className="text-sm text-slate-500">No supporting detail recorded.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Select a parameter on the left to read its scoring rationale and evidence.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve',
]
const spell = (n: number) => NUMBER_WORDS[n] ?? String(n)
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * The standard research methodology, identical across every quadrant apart from
 * the parameter counts, which are read off the report so the copy cannot drift
 * from what the dashboard actually shows.
 */
function buildMethodologySteps(perAxis: number, total: number) {
  return [
    {
      title: 'Market Definition',
      detail:
        `The market scope and the type of company that qualifies were defined first. ${capitalise(
          spell(perAxis)
        )} parameters were then set for each axis, each with a written definition: the X axis measures core capability (products, services or technology) and the Y axis measures business capability.`,
    },
    {
      title: 'Desk and Primary Research',
      detail:
        'Desk research covered company websites, filings, trade directories, industry publications and news. Primary research drew on B2B marketplace listings, where available, to confirm company offerings. Coverage was extended region by region until no new qualifying companies emerged.',
    },
    {
      title: 'Screening',
      detail:
        "Each candidate was screened against the market's inclusion criteria and required commercial role, and its market activity was verified. Distributors, resellers, consultancies, contract manufacturers and media names were excluded, and duplicate entries were consolidated.",
    },
    {
      title: 'Evidence Compilation',
      detail:
        `Every screened company was assessed on all ${spell(
          total
        )} parameters. For companies profiled on the chart, evidence was recorded parameter by parameter. Findings from B2B marketplace listings are reported as primary research; items not verified through primary research are marked as such.`,
    },
    {
      title: 'Scoring',
      detail:
        `Each parameter is rated on a 0–100 scale against its written definition, based on the evidence available for that company. A company's X and Y scores are the simple average of its ${spell(
          perAxis
        )} parameter ratings on each axis, and its overall score is the average of X and Y.`,
    },
    {
      title: 'Normalization & Selection',
      detail:
        'X and Y scores are rescaled to a 65–100 range across all companies assessed, preserving their rank order. The chart shows an equal number of companies from each of the four quadrants, with boundaries set at the median. All other companies are listed in the table below the chart.',
    },
  ]
}

/**
 * One company block carrying both axes, X above Y.
 *
 * Only the lead company is readable; the rest keep their header (the scores are
 * already public in the Top companies table) with the evidence behind a
 * subscribe overlay.
 */
function CompanyParameterBlock({
  company,
  xAxisName,
  yAxisName,
  locked = false,
  demoLocked = false,
}: {
  company: QuadrantCompany
  xAxisName: string
  yAxisName: string
  locked?: boolean
  demoLocked?: boolean
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* Company header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-[#f7fafc] px-4 py-3">
        <span className="text-[0.98rem] font-bold text-[#0f3d5c]">{company.company}</span>
        {company.brand && company.brand !== company.company && (
          <span className="text-[0.84rem] text-slate-500">{company.brand}</span>
        )}
        <QuadrantPill quadrant={company.quadrant} />
        <span className="ml-auto flex items-center gap-3 text-[0.8rem] text-slate-600">
          <span>
            X <strong className="tabular-nums text-slate-900">{company.xScore ?? '—'}</strong>
          </span>
          <span>
            Y <strong className="tabular-nums text-slate-900">{company.yScore ?? '—'}</strong>
          </span>
          <span>
            Overall{' '}
            <strong className="tabular-nums text-slate-900">{company.overallScore ?? '—'}</strong>
          </span>
        </span>
      </div>

      <div className="relative">
        <div
          className={`space-y-5 p-4 ${locked ? 'pointer-events-none select-none blur-[5px]' : ''}`}
          aria-hidden={locked || undefined}
        >
          <AxisParameterPanel axisLabel="X" axisName={xAxisName} params={company.xParameters} demoLocked={demoLocked} />
          <AxisParameterPanel axisLabel="Y" axisName={yAxisName} params={company.yParameters} demoLocked={demoLocked} />
        </div>

        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-b-lg bg-white/75 backdrop-blur-[3px]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 shadow-sm">
              <Lock className="h-6 w-6" />
            </div>
            <p className="px-6 text-center text-sm font-medium text-[#0f3d5c]">
              Kindly subscribe to access these details
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main view ───────────────────────────────────────────────────────────────

export function QuadrantView() {
  const { quadrantData, b2bSurveyData, data, dashboardName, showDemoQuadrant, showDemoNote } =
    useDashboardStore()
  // Evidence is only paywalled on the survey-backed preview dashboards.
  const isSuitePreview = !!b2bSurveyData?.segments?.length

  const uploaded = quadrantData as QuadrantReport | null
  const hasUploaded = !!(uploaded?.charted?.length || uploaded?.others?.length)
  /** No analyst export, demo toggled on — generate one from the market itself. */
  const demo = useMemo(
    () => (!hasUploaded && showDemoQuadrant ? buildDemoQuadrant(data, dashboardName) : null),
    [hasUploaded, showDemoQuadrant, data, dashboardName]
  )
  /** In demo mode every identifying field is withheld, not just the evidence. */
  const isDemo = !hasUploaded && !!demo
  const report = hasUploaded ? uploaded : demo

  const [search, setSearch] = useState('')
  const [quadrantFilter, setQuadrantFilter] = useState('all')
  const [othersExpanded, setOthersExpanded] = useState(false)

  // Every company listing runs Leaders → Challengers → Trailblazers → Evolving.
  const charted = useMemo(() => (report ? sortByQuadrant(report.charted) : []), [report])

  const filteredOthers = useMemo(() => {
    if (!report) return []
    const term = search.trim().toLowerCase()
    const matched = report.others.filter((c) => {
      if (quadrantFilter !== 'all' && normaliseQuadrant(c.quadrant) !== quadrantFilter) return false
      if (!term) return true
      return (
        c.brand.toLowerCase().includes(term) ||
        c.company.toLowerCase().includes(term) ||
        c.hq.toLowerCase().includes(term)
      )
    })
    return sortByQuadrant(matched)
  }, [report, search, quadrantFilter])

  const visibleOthers = othersExpanded
    ? filteredOthers
    : filteredOthers.slice(0, OTHERS_PREVIEW_ROWS)

  if (!report) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">No quadrant data loaded</p>
          <p className="mt-1 text-xs text-slate-500">
            Upload a Coherent Quadrant JSON export in the Dashboard Builder to populate this view.
          </p>
        </div>
      </div>
    )
  }

  const xNames = report.xAxis.parameters.map((p) => p.name)
  const yNames = report.yAxis.parameters.map((p) => p.name)
  const paramsPerAxis = xNames.length || 5
  // A report that ships its own methodology wins; otherwise the standard steps.
  const methodologySteps =
    report.methodology.length > 0
      ? report.methodology
      : buildMethodologySteps(paramsPerAxis, xNames.length + yNames.length || 10)
  const defaultMethodologyNote = `Scoring inputs: each axis is built from ${spell(
    paramsPerAxis
  )} market-specific parameters, set out in the Parameter Definitions section above. All parameters are equally weighted.`

  // Country mix per quadrant, shown beneath the chart.
  const countryMix = QUADRANT_KEYS.map((q) => {
    const inQ = charted.filter((c) => normaliseQuadrant(c.quadrant) === q)
    const counts = new Map<string, number>()
    inQ.forEach((c) => {
      const key = c.country || c.hq || 'Unknown'
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return { quadrant: q, entries: Array.from(counts.entries()) }
  }).filter((m) => m.entries.length > 0)

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div
        className="rounded-xl px-7 py-6 text-slate-50"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0d9488 100%)',
        }}
      >
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Vendor Intelligence (Coherent Quadrant)</h1>
        <p className="opacity-90">
          {report.market} · {report.geo} · {report.companyCount}{' '}
          {report.providerCategories[0] || 'companies'} scored on {report.xAxis.name} (X) and{' '}
          {report.yAxis.name} (Y)
        </p>
      </div>

      {showDemoNote && <DemoDataNote />}

      {/* Market classification */}
      {(report.marketDefinition || report.providerCategories.length > 0) && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Market Classification</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="mb-1 font-bold text-slate-900">Market</div>
              <div className="mb-3 text-[0.92rem] text-slate-700">{report.market}</div>
              {/* Only the definition prose: the B2B/B2C label and the
                  "this market is B2B because…" rationale add nothing here. */}
              {report.marketDefinition && (
                <>
                  <div className="mb-1 font-bold text-slate-900">Market Type</div>
                  <div className="text-[0.92rem] text-slate-700">{report.marketDefinition}</div>
                </>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="mb-2 font-bold text-slate-900">Provider Categories in this Market</div>
              <ol className="list-decimal space-y-1 pl-5 text-slate-700">
                {report.providerCategories.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
              {report.providerRationale && (
                <div className="mt-2 text-[0.84rem] text-slate-500">{report.providerRationale}</div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Scoring parameters at a glance — definitions follow at the end */}
      {(xNames.length > 0 || yNames.length > 0) && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-bold text-slate-900">Market Scoring Parameters</h2>
          <p className="mb-4 text-[0.92rem] leading-relaxed text-slate-500">
            The X and Y axes and these {xNames.length + yNames.length} parameters were defined for{' '}
            <strong className="text-slate-700">{report.market}</strong> and form the basis of the
            company scores below.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { label: `X — ${report.xAxis.name}`, names: xNames },
              { label: `Y — ${report.yAxis.name}`, names: yNames },
            ].map((axis) => (
              <div
                key={axis.label}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="mb-2 font-bold text-slate-900">{axis.label}</div>
                <ol className="list-decimal space-y-1.5 pl-5 text-[0.92rem] font-semibold text-[#0f3d5c]">
                  {axis.names.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quadrant chart */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-slate-900">
          Quadrant Positioning{' '}
          <span className="text-[0.85rem] font-medium opacity-75">
            ({charted.length} on chart · {report.companyCount} in total)
          </span>
        </h2>

        <div className="flex items-stretch gap-2">
          <div className="flex items-center">
            <div
              className="text-center text-[0.72rem] font-bold uppercase tracking-wider text-slate-600"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              {report.yAxis.name} ( Y AXIS ) · EMERGING → BEST-IN-CLASS →
            </div>
          </div>

          <div
            className="relative h-[600px] flex-1 overflow-hidden rounded border-2"
            style={{
              borderColor: '#93c5fd',
              background:
                'repeating-linear-gradient(-45deg, #0b1f3a, #0b1f3a 8px, #0d2748 8px, #0d2748 16px)',
            }}
          >
            {/* Crosshairs */}
            <div className="absolute inset-x-0 top-1/2 z-[1] h-px bg-white/35" />
            <div className="absolute inset-y-0 left-1/2 z-[1] w-px bg-white/35" />

            {/* Quadrant labels */}
            <span className="absolute left-3 top-2.5 z-[2] text-[0.78rem] font-semibold text-white/85">
              Challengers
            </span>
            <span className="absolute right-3 top-2.5 z-[2] text-[0.78rem] font-semibold text-white/85">
              Leaders
            </span>
            <span className="absolute bottom-2.5 left-3 z-[2] text-[0.78rem] font-semibold text-white/85">
              Evolving Players
            </span>
            <span className="absolute bottom-2.5 right-3 z-[2] text-[0.78rem] font-semibold text-white/85">
              Trailblazers
            </span>

            {/* Axis bounds */}
            <span className="absolute left-1.5 top-2 z-[2] text-[0.7rem] text-white/55">100</span>
            <span className="absolute bottom-2 left-1.5 z-[2] text-[0.7rem] text-white/55">0</span>
            <span className="absolute bottom-1 left-7 z-[2] text-[0.7rem] text-white/55">0</span>
            <span className="absolute bottom-1 right-2 z-[2] text-[0.7rem] text-white/55">100</span>

            {/* Dots */}
            {charted.map((c, i) => {
              const pos = plotPosition(c)
              const color = QUADRANT_COLORS[normaliseQuadrant(c.quadrant)] || '#7EB6FF'
              const labelRight = pos.left < 70
              return (
                <div
                  key={i}
                  className="absolute z-[3] h-3 w-3 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
                  title={`${c.brand} (${c.country || c.hq}) — ${normaliseQuadrant(c.quadrant)} · X ${c.xScore ?? '—'} / Y ${c.yScore ?? '—'}`}
                >
                  <span
                    className="block h-3 w-3 rounded-full border-2 border-white"
                    style={{ backgroundColor: color }}
                  />
                  <span
                    className="pointer-events-none absolute top-1/2 -translate-y-1/2 truncate text-[0.62rem] font-semibold text-white"
                    style={{
                      textShadow: '0 1px 2px rgba(0,0,0,0.75)',
                      maxWidth: 100,
                      ...(labelRight ? { left: 14 } : { right: 14 }),
                    }}
                  >
                    {c.brand}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-2 text-center text-[0.72rem] font-bold uppercase tracking-wider text-slate-600">
          {report.xAxis.name} ( X AXIS ) · EMERGING → BEST-IN-CLASS →
        </div>

        {countryMix.length > 0 && (
          <div className="mt-3 text-[0.82rem] leading-relaxed text-slate-600">
            <div className="mb-1 font-semibold">Countries on chart (by quadrant)</div>
            {countryMix.map((m, i) => (
              <span key={m.quadrant}>
                {i > 0 && ' · '}
                <strong>{m.quadrant}</strong>:{' '}
                {m.entries.map(([c, n]) => `${c}×${n}`).join(', ')}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* What each quadrant means */}
      {report.quadrantDefinitions.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-slate-900">What Each Quadrant Means</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {report.quadrantDefinitions.map((q) => {
              const color = QUADRANT_COLORS[normaliseQuadrant(q.quadrant)] || '#cbd5e1'
              return (
                <div
                  key={q.quadrant + q.title}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4"
                  style={{ borderLeft: `4px solid ${color}` }}
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold text-slate-900"
                      style={{ backgroundColor: color }}
                    >
                      {q.quadrant}
                    </span>
                    <span className="font-bold text-slate-900">{q.title}</span>
                  </div>
                  {q.position && (
                    <div className="mt-1 text-[0.8rem] font-medium text-slate-500">{q.position}</div>
                  )}
                  {q.definition && (
                    <p className="mt-2 text-[0.88rem] leading-relaxed text-slate-700">
                      {q.definition}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Top companies */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-slate-900">
          Top {charted.length} Companies{' '}
          <span className="text-[0.85rem] font-medium opacity-75">
            (plotted on the chart above · click a score for the breakdown)
          </span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.88rem]">
            <thead>
              <tr>
                {[
                  'Brand',
                  'Company',
                  'HQ',
                  'Role',
                  'Quadrant',
                  `X (${report.xAxis.name})`,
                  `Y (${report.yAxis.name})`,
                  'Overall Score',
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2.5 text-left text-[0.72rem] font-semibold uppercase tracking-wide text-white"
                    style={{ backgroundColor: NAVY }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {charted.map((c, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-slate-100/70' : ''}>
                  <td className="border-b border-slate-200 px-3 py-2.5 font-medium text-slate-900">
                    {c.brand}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5 text-slate-800">
                    {c.company}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5 text-slate-700">
                    {isDemo ? <LockedField /> : c.hq}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5 text-slate-700">
                    {isDemo ? <LockedField /> : c.role}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5">
                    <QuadrantPill quadrant={c.quadrant} />
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5">
                    <AxisScoreCell score={c.xScore} params={c.xParameters} locked={isDemo} />
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5">
                    <AxisScoreCell score={c.yScore} params={c.yParameters} locked={isDemo} />
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5">
                    <ScoreDisc score={c.overallScore} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Other noticeable players */}
      {report.others.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-slate-900">
            Other Noticeable Player{' '}
            <span className="text-[0.85rem] font-medium opacity-75">
              ({report.others.length} companies)
            </span>
          </h2>

          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Brand, company or HQ…"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1A759F] focus:outline-none focus:ring-1 focus:ring-[#1A759F]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Relative Positioning
              </span>
              <select
                value={quadrantFilter}
                onChange={(e) => setQuadrantFilter(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#1A759F] focus:outline-none focus:ring-1 focus:ring-[#1A759F]"
              >
                <option value="all">All quadrants</option>
                {QUADRANT_KEYS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="mb-2 text-xs text-slate-600">
            {filteredOthers.length} compan{filteredOthers.length === 1 ? 'y' : 'ies'}
            {filteredOthers.length !== report.others.length && (
              <span className="text-slate-400"> of {report.others.length}</span>
            )}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[0.88rem]">
              <thead>
                <tr>
                  {['Brand', 'Company', 'HQ', 'Role', 'Relative Positioning', 'Strength'].map(
                    (h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-3 py-2.5 text-left text-[0.72rem] font-semibold uppercase tracking-wide text-white"
                        style={{ backgroundColor: NAVY }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleOthers.map((c, i) => (
                  <tr key={i} className={i % 2 === 1 ? 'bg-slate-100/70' : ''}>
                    <td className="border-b border-slate-200 px-3 py-2.5 font-medium text-slate-900">
                      {c.brand}
                    </td>
                    <td className="border-b border-slate-200 px-3 py-2.5 text-slate-800">
                      {isDemo ? <LockedField /> : c.company}
                    </td>
                    <td className="border-b border-slate-200 px-3 py-2.5 text-slate-700">
                      {isDemo ? <LockedField /> : c.hq}
                    </td>
                    <td className="border-b border-slate-200 px-3 py-2.5 text-slate-700">
                      {isDemo ? <LockedField /> : c.role}
                    </td>
                    <td className="border-b border-slate-200 px-3 py-2.5">
                      <QuadrantPill quadrant={c.quadrant} />
                    </td>
                    <td className="border-b border-slate-200 px-3 py-2.5">
                      <StrengthDots score={c.overallScore} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOthers.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-300 bg-white py-8 text-center text-sm text-slate-500">
                No companies match the current filters.
              </div>
            )}
          </div>

          {/* Collapsed by default: a 167-row table would otherwise bury the
              per-company parameter detail below it. */}
          {filteredOthers.length > OTHERS_PREVIEW_ROWS && (
            <button
              onClick={() => setOthersExpanded((v) => !v)}
              aria-expanded={othersExpanded}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-[#1A759F] transition-colors hover:bg-slate-100"
            >
              <span
                className={`h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent transition-transform ${
                  othersExpanded ? 'rotate-180' : ''
                }`}
                style={{ borderTopColor: '#1A759F' }}
              />
              {othersExpanded
                ? `Show fewer — collapse to ${OTHERS_PREVIEW_ROWS} rows`
                : `Show all ${filteredOthers.length} companies`}
            </button>
          )}
        </section>
      )}


      {/* Per-company parameter detail — X axis above Y axis for each company */}
      {charted.length > 0 && (xNames.length > 0 || yNames.length > 0) && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-slate-900">
            Parameter Detail by Company{' '}
            <span className="text-[0.85rem] font-medium opacity-75">
              ({report.xAxis.name} and {report.yAxis.name} evidence for the {charted.length}{' '}
              companies on the chart)
            </span>
          </h2>
          <p className="mb-4 text-[0.86rem] text-slate-500">
            Click any parameter to read its scoring rationale and supporting evidence.
            {isSuitePreview &&
              ' Full evidence is shown for the leading company; the rest is available on subscription.'}
          </p>
          <div className="space-y-4">
            {charted.map((c, i) => (
              <CompanyParameterBlock
                key={i}
                company={c}
                xAxisName={report.xAxis.name}
                yAxisName={report.yAxis.name}
                locked={isSuitePreview && i > 0}
                demoLocked={isDemo}
              />
            ))}
          </div>
        </section>
      )}

      {/* Scoring parameters */}
      {(xNames.length > 0 || yNames.length > 0) && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-bold text-slate-900">Parameter Definitions</h2>
          <p className="mb-4 text-[0.92rem] leading-relaxed text-slate-500">
            X and Y axes and these {xNames.length + yNames.length} parameters are defined for{' '}
            <strong className="text-slate-700">{report.market}</strong> and used to calculate the
            company scores below.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { label: `X — ${report.xAxis.name}`, params: report.xAxis.parameters },
              { label: `Y — ${report.yAxis.name}`, params: report.yAxis.parameters },
            ].map((axis) => (
              <div
                key={axis.label}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="mb-2 font-bold text-slate-900">{axis.label}</div>
                <ol className="list-decimal space-y-2 pl-5 text-slate-700">
                  {axis.params.map((p, i) => (
                    <li key={i}>
                      <span className="font-semibold text-slate-900">{p.name}</span>
                      {p.definition && (
                        <div className="mt-0.5 text-[0.88rem] leading-relaxed text-slate-600">
                          {p.definition}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Research Methodology — closes every quadrant */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Research Methodology</h2>
        <p className="mb-5 text-[0.92rem] leading-relaxed text-slate-500">
          This quadrant was compiled independently through structured desk research, supplemented by
          primary research where available. It is not based on a survey or on vendor
          self-submission. The steps below describe how companies were identified, screened,
          evidenced and scored.
        </p>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
          {methodologySteps.map((step, i) => (
            <div key={step.title} className="flex flex-1 items-stretch gap-3">
              <div
                className="flex-1 rounded-xl px-4 py-4 text-slate-50"
                style={{ background: 'linear-gradient(160deg, #0f172a, #1e3a5f)' }}
              >
                <div
                  className="mb-3 flex h-8 w-8 items-center justify-center rounded-full text-[0.85rem] font-bold"
                  style={{ backgroundColor: '#0d9488' }}
                >
                  {i + 1}
                </div>
                <div className="mb-2 text-[0.92rem] font-bold leading-snug">{step.title}</div>
                <div className="text-[0.8rem] leading-relaxed opacity-90">{step.detail}</div>
              </div>
              {i < methodologySteps.length - 1 && (
                <div className="hidden items-center text-slate-400 lg:flex" aria-hidden>
                  →
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-5 border-t border-slate-200 pt-4 text-[0.86rem] leading-relaxed text-slate-500">
          {report.methodologyNote || defaultMethodologyNote}
        </p>
      </section>

    </div>
  )
}
