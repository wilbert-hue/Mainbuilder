/**
 * Buyer Survey (B2B / B2C) report types + parser.
 *
 * Source of truth is the analyst-generated JSON export, e.g.
 *   pharmacy_automation___dispensing_systems_buyer_b2b.json
 *
 * Two JSON variants exist in the wild and both must parse:
 *   • "pharmacy" shape  — has `base_market` + `report_meta`, landscape copy nested
 *                         under `buyer_landscape` (organisations_surveyed, etc.)
 *   • "smartwatch" shape — has `executive_summary`, `market_definition`, `sections`
 *
 * The parser is deliberately forgiving: every field is optional on input and is
 * normalised to a predictable shape here, so the UI never has to null-check the
 * raw JSON. A file only fails to parse when it has no usable questions at all.
 */

export type BuyerSurveyKind = 'b2b' | 'b2c'

export interface BuyerSurveyOption {
  label: string
  /** Percentage 0–100. multi_select questions can sum well above 100. */
  pct: number
  source?: string
}

export interface BuyerSurveyQuestion {
  /** "Q1", "Q2"… falls back to positional id when absent. */
  id: string
  text: string
  /** single_select | multi_select | … (free-form, used only for labelling) */
  type: string
  /** pie | donut | horizontal_bar | vertical_bar | lollipop | null */
  chartType: string | null
  options: BuyerSurveyOption[]
  /** Rendered under the "Takeaways" heading on each question card. */
  keyInsight: string
  /** Respondent count for this specific question. */
  n: number | null
  /** tier_1 | tier_2 | tier_3 — drives the confidence filter dropdown. */
  confidence: string | null
  sources: string[]
}

export interface BuyerSurveySegment {
  id: string
  title: string
  focus: string
  questions: BuyerSurveyQuestion[]
}

export interface BuyerSurveyExecutiveSummary {
  headline: string
  keyFindings: string[]
  marketSignal: string
  methodologyNote: string
}

export interface BuyerSurveyMethodology {
  approach: string
  sampleSize: number | null
  geography: string
  module: string
  reportCovers: string[]
  whoQualified: string[]
  reportConfidence: string
}

/** One buyer type in the "Buyers" panel. */
export interface BuyerSegment {
  name: string
  description: string
}

export interface BuyerSurveyLandscape {
  definition: string
  whoBuys: string
  /** Buyer types with their buying behaviour — rendered as the Buyers panel. */
  buyerSegments: BuyerSegment[]
  organisationsHeading: string
  organisations: string[]
  designationsHeading: string
  designations: string[]
  respondentProfile: string
}

export interface BuyerSurveyReport {
  kind: BuyerSurveyKind
  /** Market/industry name shown as the card title. */
  industry: string
  /** e.g. "Customer Intelligence (B2B)" — shown as the kicker above the title. */
  module: string
  /** "North America", "India", "Global"… */
  geo: string
  sector: string
  sampleSize: number | null
  analystName: string
  analystTitle: string
  /** { "North America": 35 } — per-region respondent split. */
  sampleBreakdown: Record<string, number>
  landscape: BuyerSurveyLandscape
  methodology: BuyerSurveyMethodology
  /** Absent in some exports; the summary card is skipped when null. */
  executiveSummary: BuyerSurveyExecutiveSummary | null
  segments: BuyerSurveySegment[]
  questionCount: number
}

// ── Coercion helpers ────────────────────────────────────────────────────────

function asString(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return fallback
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    // Handles "160 verified respondents — Global panel: …"
    const m = v.match(/\d+(\.\d+)?/)
    if (m) {
      const n = parseFloat(m[0])
      if (Number.isFinite(n)) return n
    }
  }
  return null
}

/**
 * Normalises a list that may arrive as plain strings or as objects.
 * Objects are probed for the first populated key in `keys`.
 */
function asStringList(v: unknown, keys: string[] = []): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const item of v) {
    if (typeof item === 'string') {
      const s = item.trim()
      if (s) out.push(s)
    } else if (item && typeof item === 'object') {
      const rec = item as Record<string, unknown>
      for (const k of keys) {
        const s = asString(rec[k])
        if (s) {
          out.push(s)
          break
        }
      }
    }
  }
  return out
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function asNumberMap(v: unknown): Record<string, number> {
  const src = asRecord(v)
  const out: Record<string, number> = {}
  for (const [k, val] of Object.entries(src)) {
    const n = asNumber(val)
    if (n !== null) out[k] = n
  }
  return out
}

// ── Section parsers ─────────────────────────────────────────────────────────

function parseOptions(raw: unknown): BuyerSurveyOption[] {
  if (!Array.isArray(raw)) return []
  const out: BuyerSurveyOption[] = []
  for (const item of raw) {
    const rec = asRecord(item)
    const label = asString(rec.label ?? rec.name ?? rec.option)
    const pct = asNumber(rec.pct ?? rec.percent ?? rec.percentage ?? rec.value)
    if (!label) continue
    out.push({
      label,
      pct: pct ?? 0,
      source: asString(rec.source) || undefined,
    })
  }
  return out
}

function parseQuestions(raw: unknown): BuyerSurveyQuestion[] {
  if (!Array.isArray(raw)) return []
  const out: BuyerSurveyQuestion[] = []
  raw.forEach((item, index) => {
    const rec = asRecord(item)
    const text = asString(rec.text ?? rec.question ?? rec.title)
    const options = parseOptions(rec.options ?? rec.answers ?? rec.choices)
    // A question with neither text nor options carries no signal — skip it.
    if (!text && options.length === 0) return
    out.push({
      id: asString(rec.id) || `Q${index + 1}`,
      text,
      type: asString(rec.type, 'single_select'),
      chartType: asString(rec.chart_type ?? rec.chartType) || null,
      options,
      keyInsight: asString(rec.key_insight ?? rec.keyInsight ?? rec.takeaway),
      n: asNumber(rec.n ?? rec.sample_size),
      confidence: asString(rec.confidence) || null,
      sources: asStringList(rec.sources, ['title', 'name', 'url']),
    })
  })
  return out
}

function parseSegments(raw: unknown): BuyerSurveySegment[] {
  if (!Array.isArray(raw)) return []
  const out: BuyerSurveySegment[] = []
  raw.forEach((item, index) => {
    const rec = asRecord(item)
    const questions = parseQuestions(rec.questions ?? rec.items)
    if (questions.length === 0) return
    out.push({
      id: asString(rec.id) || `S${index + 1}`,
      title: asString(rec.title ?? rec.name ?? rec.source_title, `Section ${index + 1}`),
      focus: asString(rec.focus ?? rec.description ?? rec.summary),
      questions,
    })
  })
  return out
}

function parseExecutiveSummary(raw: unknown): BuyerSurveyExecutiveSummary | null {
  const rec = asRecord(raw)
  const headline = asString(rec.headline ?? rec.title)
  const keyFindings = asStringList(rec.key_findings ?? rec.keyFindings ?? rec.findings, [
    'text',
    'finding',
  ])
  const marketSignal = asString(rec.market_signal ?? rec.marketSignal ?? rec.signal)
  const methodologyNote = asString(rec.methodology_note ?? rec.methodologyNote)
  if (!headline && keyFindings.length === 0 && !marketSignal) return null
  return { headline, keyFindings, marketSignal, methodologyNote }
}

function parseLandscape(raw: unknown): BuyerSurveyLandscape {
  const rec = asRecord(raw)
  // Organisations: prefer the explicit surveyed list, then the richer
  // entity objects, then the industries-served list.
  const organisations =
    asStringList(rec.organisations_surveyed).length > 0
      ? asStringList(rec.organisations_surveyed)
      : asStringList(rec.entities_surveyed, ['type', 'name']).length > 0
      ? asStringList(rec.entities_surveyed, ['type', 'name'])
      : asStringList(rec.industries_served).length > 0
      ? asStringList(rec.industries_served)
      : asStringList(rec.buyer_segments, ['name', 'title'])

  const designations =
    asStringList(rec.designations_spoken_to).length > 0
      ? asStringList(rec.designations_spoken_to)
      : asStringList(rec.designations_surveyed, ['title', 'role', 'name']).length > 0
      ? asStringList(rec.designations_surveyed, ['title', 'role', 'name'])
      : asStringList(rec.decision_makers, ['role', 'title', 'name'])

  // Buyer types: name + how that type buys.
  const buyerSegments: BuyerSegment[] = []
  const rawSegments = rec.buyer_segments ?? rec.buyerSegments ?? rec.buyer_types
  if (Array.isArray(rawSegments)) {
    for (const item of rawSegments) {
      if (typeof item === 'string') {
        const s = item.trim()
        if (s) buyerSegments.push({ name: s, description: '' })
        continue
      }
      const r = asRecord(item)
      const name = asString(r.name ?? r.title ?? r.type ?? r.segment)
      if (!name) continue
      buyerSegments.push({
        name,
        description: asString(r.description ?? r.detail ?? r.summary ?? r.behaviour),
      })
    }
  }

  return {
    definition: asString(rec.definition),
    whoBuys: asString(rec.who_buys ?? rec.whoBuys),
    buyerSegments,
    organisationsHeading: asString(rec.organisations_heading, 'Organisations We Surveyed'),
    organisations,
    designationsHeading: asString(rec.designations_heading, 'Designations We Spoke To'),
    designations,
    respondentProfile: asString(rec.respondent_profile ?? rec.respondentProfile),
  }
}

function parseMethodology(
  raw: unknown,
  fallbacks: { sampleSize: number | null; geo: string; module: string }
): BuyerSurveyMethodology {
  const rec = asRecord(raw)
  return {
    approach: asString(rec.approach ?? rec.method ?? rec.summary),
    sampleSize: asNumber(rec.sample_size ?? rec.sampleSize) ?? fallbacks.sampleSize,
    geography: asString(rec.geography ?? rec.geo, fallbacks.geo),
    module: asString(rec.module, fallbacks.module),
    reportCovers: asStringList(rec.report_covers ?? rec.reportCovers, ['title', 'name']),
    // "who_qualified" in the pharmacy export, "respondent_screening" in the smartwatch one.
    whoQualified: asStringList(
      rec.who_qualified ?? rec.whoQualified ?? rec.respondent_screening,
      ['text', 'criterion']
    ),
    reportConfidence: asString(rec.report_confidence ?? rec.reportConfidence),
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface ParseBuyerSurveyResult {
  report: BuyerSurveyReport | null
  error: string | null
}

/**
 * Parse a raw survey JSON export into the normalised report shape.
 *
 * `kind` is supplied by the caller (which upload slot the file went into)
 * rather than sniffed from the file, so a B2C slot always yields a B2C report
 * even when the export's `module` string still says B2B.
 */
export function parseBuyerSurvey(raw: unknown, kind: BuyerSurveyKind): ParseBuyerSurveyResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { report: null, error: 'File is not a JSON object.' }
  }

  const rec = raw as Record<string, unknown>
  const segments = parseSegments(rec.segments ?? rec.sections)

  if (segments.length === 0) {
    return {
      report: null,
      error:
        'No survey questions found. Expected a "segments" array where each entry has a "questions" list.',
    }
  }

  const reportMeta = asRecord(rec.report_meta)
  const industry = asString(
    rec.industry ?? rec.base_market ?? rec.market ?? reportMeta.title,
    'Buyer Survey'
  )
  const moduleLabel = asString(
    rec.module ?? reportMeta.module_label,
    kind === 'b2c' ? 'Customer Intelligence (B2C)' : 'Customer Intelligence (B2B)'
  )
  const geo = asString(rec.geo ?? rec.geography, 'Global')
  const sampleSize = asNumber(rec.sample_size)

  const questionCount = segments.reduce((sum, s) => sum + s.questions.length, 0)

  const methodology = parseMethodology(rec.survey_methodology, {
    sampleSize,
    geo,
    module: moduleLabel,
  })
  // Exports without an explicit report_covers list still describe their coverage
  // through the section titles — use those so the panel is never empty.
  if (methodology.reportCovers.length === 0) {
    methodology.reportCovers = segments.map((s) => s.title)
  }

  return {
    report: {
      kind,
      industry,
      module: moduleLabel,
      geo,
      sector: asString(rec.sector),
      sampleSize,
      analystName: asString(rec.analyst_name),
      analystTitle: asString(rec.analyst_title),
      sampleBreakdown: asNumberMap(rec.sample_breakdown),
      landscape: parseLandscape(rec.buyer_landscape ?? rec.market_definition),
      methodology,
      executiveSummary: parseExecutiveSummary(rec.executive_summary),
      segments,
      questionCount,
    },
    error: null,
  }
}

/**
 * Rebuild a report from a persisted snapshot.
 *
 * Saved dashboards store the already-normalised report, so the common path is a
 * cheap shape check. Anything that does not look normalised is run back through
 * the full parser, which also covers docs that stored the raw export.
 */
export function reviveBuyerSurvey(stored: unknown, kind: BuyerSurveyKind): BuyerSurveyReport | null {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null
  const rec = stored as Record<string, unknown>

  const segments = rec.segments
  const looksNormalised =
    Array.isArray(segments) &&
    segments.length > 0 &&
    typeof rec.industry === 'string' &&
    !!rec.methodology &&
    Array.isArray((segments[0] as Record<string, unknown>)?.questions)

  if (looksNormalised) {
    // Force `kind` to the slot it was restored into, so a B2C tab never renders
    // a report tagged b2b by an older save.
    return { ...(stored as BuyerSurveyReport), kind }
  }

  return parseBuyerSurvey(stored, kind).report
}

/** Human-readable label for a confidence tier key. */
export function confidenceLabel(tier: string | null): string {
  if (!tier) return 'Unrated'
  const map: Record<string, string> = {
    tier_1: 'Tier 1 — High',
    tier_2: 'Tier 2 — Medium',
    tier_3: 'Tier 3 — Indicative',
  }
  return map[tier] || tier.replace(/_/g, ' ')
}

/** Collect the distinct confidence tiers present in a report, in tier order. */
export function collectConfidenceTiers(report: BuyerSurveyReport | null): string[] {
  if (!report) return []
  const seen = new Set<string>()
  report.segments.forEach((s) =>
    s.questions.forEach((q) => {
      if (q.confidence) seen.add(q.confidence)
    })
  )
  return Array.from(seen).sort()
}
