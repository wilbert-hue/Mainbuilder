/**
 * Coherent Quadrant report types + parser.
 *
 * Source is the analyst-generated quadrant JSON export (the same generator that
 * produces the standalone "Coherent Quadrant" HTML report). Companies are scored
 * on two axes — typically Product Capability (X) and Business Capability (Y) —
 * and land in one of four quadrants.
 *
 * As with the buyer-survey parser, every input field is optional and normalised
 * here, so the UI never null-checks raw JSON. Key names are accepted in several
 * spellings because the export has shifted naming between generations.
 */

export interface QuadrantParameterDefinition {
  name: string
  definition: string
}

/** One parameter's score + supporting evidence for a single company. */
export interface QuadrantParameterScore {
  name: string
  score: number | null
  /** The "why" paragraph justifying the number. */
  basis: string
  /** Individual verified findings, rendered as bullets. */
  evidence: string[]
}

export interface QuadrantCompany {
  brand: string
  company: string
  hq: string
  role: string
  country: string
  /** "Leaders" | "Challengers" | "Trailblazers" | "Evolving Players" */
  quadrant: string
  xScore: number | null
  yScore: number | null
  overallScore: number | null
  /** Per-parameter detail; present for charted companies, empty for the long tail. */
  xParameters: QuadrantParameterScore[]
  yParameters: QuadrantParameterScore[]
  /** Explicit plot position 0–100 when the export supplies one. */
  xPct: number | null
  /** Y measured from the bottom (axis space). */
  yPct: number | null
  /** Y measured from the top (CSS space) — what cmi-quadrant-v1 supplies. */
  topPct: number | null
}

export interface QuadrantAxis {
  name: string
  parameters: QuadrantParameterDefinition[]
}

export interface QuadrantMethodologyStep {
  title: string
  detail: string
}

export interface QuadrantReport {
  market: string
  geo: string
  /** "B2C" / "B2B" / "Both" */
  marketType: string
  marketDefinition: string
  marketTypeRationale: string
  providerCategories: string[]
  providerRationale: string
  /** Total company count across the whole population. */
  companyCount: number
  xAxis: QuadrantAxis
  yAxis: QuadrantAxis
  /** Companies with full parameter detail — these plot on the chart. */
  charted: QuadrantCompany[]
  /** The remaining population, listed in "Other Noticeable Player". */
  others: QuadrantCompany[]
  methodology: QuadrantMethodologyStep[]
  methodologyNote: string
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
    const m = v.match(/-?\d+(\.\d+)?/)
    if (m) {
      const n = parseFloat(m[0])
      if (Number.isFinite(n)) return n
    }
  }
  return null
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

/** Pick the first key present on the record. */
function pick(rec: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (rec[k] !== undefined && rec[k] !== null && rec[k] !== '') return rec[k]
  }
  return undefined
}

/** Normalise a list that may hold plain strings or objects. */
function asStringList(v: unknown, keys: string[] = []): string[] {
  if (typeof v === 'string') {
    const s = v.trim()
    return s ? [s] : []
  }
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

// ── Section parsers ─────────────────────────────────────────────────────────

function parseParameterDefinitions(raw: unknown): QuadrantParameterDefinition[] {
  if (!Array.isArray(raw)) return []
  const out: QuadrantParameterDefinition[] = []
  for (const item of raw) {
    if (typeof item === 'string') {
      const s = item.trim()
      if (s) out.push({ name: s, definition: '' })
      continue
    }
    const rec = asRecord(item)
    const name = asString(pick(rec, 'name', 'parameter', 'title', 'label'))
    if (!name) continue
    out.push({
      name,
      definition: asString(pick(rec, 'definition', 'description', 'detail', 'meaning', 'measure')),
    })
  }
  return out
}

function parseAxis(
  raw: unknown,
  fallbackName: string,
  /** name → definition map, supplied separately in cmi-quadrant-v1. */
  definitions?: Record<string, unknown>
): QuadrantAxis {
  const withDefinitions = (params: QuadrantParameterDefinition[]) => {
    if (!definitions) return params
    return params.map((p) =>
      p.definition ? p : { ...p, definition: asString(definitions[p.name]) }
    )
  }

  // Accept either { name, parameters: [...] } or a bare array of parameter names.
  if (Array.isArray(raw)) {
    return {
      name: fallbackName,
      parameters: withDefinitions(parseParameterDefinitions(raw)),
    }
  }
  const rec = asRecord(raw)
  return {
    name: asString(pick(rec, 'name', 'title', 'label', 'axis'), fallbackName),
    parameters: withDefinitions(
      parseParameterDefinitions(pick(rec, 'parameters', 'params', 'features', 'items'))
    ),
  }
}

/** Shared evidence/basis extraction for one parameter entry. */
function parameterFrom(name: string, rec: Record<string, unknown>): QuadrantParameterScore {
  return {
    name,
    score: asNumber(pick(rec, 'score', 'value', 'rating', 'points')),
    basis: asString(
      pick(
        rec,
        // "assessed_on" is the cmi-quadrant-v1 spelling.
        'assessed_on',
        'basis',
        'why',
        'rationale',
        'reason',
        'scoring_basis',
        'justification',
        'summary'
      )
    ),
    evidence: asStringList(
      pick(rec, 'evidence', 'points', 'findings', 'takeaways', 'bullets', 'facts'),
      // v1 wraps each finding as { claim: "…" }.
      ['claim', 'text', 'point', 'finding', 'detail']
    ),
  }
}

/**
 * Parameter scores arrive either as an array of named objects, or — in
 * cmi-quadrant-v1 — as `{ parameters: { "<name>": { … } } }` keyed by name.
 */
function parseParameterScores(raw: unknown): QuadrantParameterScore[] {
  if (Array.isArray(raw)) {
    const out: QuadrantParameterScore[] = []
    for (const item of raw) {
      const rec = asRecord(item)
      const name = asString(pick(rec, 'name', 'parameter', 'title', 'label'))
      if (!name) continue
      out.push(parameterFrom(name, rec))
    }
    return out
  }

  const rec = asRecord(raw)
  const keyed = asRecord(pick(rec, 'parameters', 'params', 'features') ?? rec)
  const out: QuadrantParameterScore[] = []
  for (const [name, value] of Object.entries(keyed)) {
    const v = asRecord(value)
    // Skip non-parameter bookkeeping keys that carry no score object.
    if (Object.keys(v).length === 0) continue
    out.push(parameterFrom(name, v))
  }
  return out
}

function parseCompany(raw: unknown): QuadrantCompany | null {
  const rec = asRecord(raw)
  const company = asString(pick(rec, 'company', 'company_name', 'legal_name', 'name'))
  const brand = asString(pick(rec, 'brand', 'display_name', 'brand_name', 'product', 'name'), company)
  if (!company && !brand) return null

  // cmi-quadrant-v1 nests both axes under score_detail.{x,y}.
  const detail = asRecord(pick(rec, 'score_detail', 'scoreDetail', 'detail'))

  // Verified across the sample population: `execution` is the X (product) axis
  // and `innovation` is the Y (business) axis, despite the names suggesting
  // otherwise. Checked against eight companies with differing X and Y values.
  const xScore = asNumber(
    pick(rec, 'x_score', 'xScore', 'execution', 'x', 'product_capability', 'x_axis_score')
  )
  const yScore = asNumber(
    pick(rec, 'y_score', 'yScore', 'innovation', 'y', 'business_capability', 'y_axis_score')
  )

  return {
    brand: brand || company,
    company: company || brand,
    hq: asString(pick(rec, 'hq', 'hq_location', 'headquarters', 'location')),
    role: asString(
      pick(rec, 'role', 'commercial_role', 'provider_role', 'category', 'provider_category')
    ),
    country: asString(pick(rec, 'country', 'hq_country', 'nation')),
    quadrant: asString(pick(rec, 'quadrant', 'positioning', 'relative_positioning', 'segment')),
    xScore,
    yScore,
    overallScore: asNumber(
      pick(rec, 'overall_score', 'overallScore', 'overall', 'total_score', 'score', 'strength')
    ),
    xParameters: parseParameterScores(
      pick(
        rec,
        'x_parameters',
        'xParameters',
        'x_params',
        'product_parameters',
        'x_axis_parameters'
      ) ?? detail.x
    ),
    yParameters: parseParameterScores(
      pick(
        rec,
        'y_parameters',
        'yParameters',
        'y_params',
        'business_parameters',
        'y_axis_parameters'
      ) ?? detail.y
    ),
    // left_pct / top_pct are already CSS-ready percentages from the generator.
    xPct: asNumber(pick(rec, 'x_pct', 'xPct', 'plot_x', 'left_pct')),
    yPct: asNumber(pick(rec, 'y_pct', 'yPct', 'plot_y')),
    topPct: asNumber(pick(rec, 'top_pct', 'topPct')),
  }
}

function parseCompanies(raw: unknown): QuadrantCompany[] {
  if (!Array.isArray(raw)) return []
  const out: QuadrantCompany[] = []
  for (const item of raw) {
    const c = parseCompany(item)
    if (c) out.push(c)
  }
  return out
}

function parseMethodology(raw: unknown): QuadrantMethodologyStep[] {
  const list = Array.isArray(raw) ? raw : asRecord(raw).steps
  if (!Array.isArray(list)) return []
  const out: QuadrantMethodologyStep[] = []
  for (const item of list) {
    if (typeof item === 'string') {
      const s = item.trim()
      if (s) out.push({ title: s, detail: '' })
      continue
    }
    const rec = asRecord(item)
    const title = asString(pick(rec, 'title', 'name', 'step', 'label'))
    if (!title) continue
    out.push({ title, detail: asString(pick(rec, 'detail', 'description', 'text', 'body')) })
  }
  return out
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface ParseQuadrantResult {
  report: QuadrantReport | null
  error: string | null
}

/**
 * A company "charts" when it carries per-parameter detail. The export marks the
 * plotted set either with an explicit flag or simply by including the detail
 * only for those companies, so both signals are honoured.
 */
function isCharted(c: QuadrantCompany, rawItem: unknown): boolean {
  const rec = asRecord(rawItem)
  const flag = pick(rec, 'on_chart', 'charted', 'is_charted', 'top', 'plotted')
  if (typeof flag === 'boolean') return flag
  return c.xParameters.length > 0 || c.yParameters.length > 0
}

export function parseQuadrantReport(raw: unknown): ParseQuadrantResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { report: null, error: 'File is not a JSON object.' }
  }
  const rec = raw as Record<string, unknown>

  // Companies may live under several keys, or be pre-split into two lists.
  // cmi-quadrant-v1 names the list "brands".
  const flatRaw = pick(rec, 'companies', 'brands', 'players', 'vendors', 'entries', 'all_companies')
  const chartedRaw = pick(rec, 'charted', 'top_companies', 'top_20', 'quadrant_companies', 'plotted')
  const othersRaw = pick(
    rec,
    'others',
    'other_companies',
    'other_noticeable_players',
    'other_players',
    'remaining'
  )

  let charted: QuadrantCompany[] = []
  let others: QuadrantCompany[] = []

  if (Array.isArray(chartedRaw) || Array.isArray(othersRaw)) {
    charted = parseCompanies(chartedRaw)
    others = parseCompanies(othersRaw)
  } else {
    const all = Array.isArray(flatRaw) ? flatRaw : []
    const parsed = parseCompanies(all)
    parsed.forEach((c, i) => {
      if (isCharted(c, all[i])) charted.push(c)
      else others.push(c)
    })
  }

  if (charted.length === 0 && others.length === 0) {
    return {
      report: null,
      error:
        'No companies found. Expected a "companies" array (or "charted"/"others"), where each entry has a company name and a "quadrant".',
    }
  }

  // If nothing carried parameter detail, treat the highest-scoring entries as
  // the charted set so the quadrant is never empty.
  if (charted.length === 0) {
    const ranked = [...others].sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))
    charted = ranked.slice(0, 20)
    const chartedSet = new Set(charted)
    others = others.filter((c) => !chartedSet.has(c))
  }

  const meta = asRecord(pick(rec, 'report_meta', 'meta', 'metadata'))
  // cmi-quadrant-v1 puts the axes under `criteria` and the market classification
  // under `criteria.relevance`.
  const criteria = asRecord(pick(rec, 'criteria'))
  const axisLabels = asRecord(pick(criteria, 'axis_labels'))
  const paramDefs = asRecord(pick(criteria, 'parameter_definitions'))
  const classification = asRecord(
    pick(rec, 'market_classification', 'classification') ?? criteria.relevance
  )

  const market = asString(
    pick(rec, 'market', 'market_name', 'industry', 'base_market', 'title') ?? meta.title,
    'Coherent Quadrant'
  )

  return {
    report: {
      market,
      geo: asString(pick(rec, 'geo', 'geography', 'region'), 'global'),
      marketType: asString(
        pick(rec, 'market_type', 'marketType') ?? pick(classification, 'market_type', 'type')
      ),
      marketDefinition: asString(
        pick(rec, 'market_definition', 'definition') ??
          pick(classification, 'market_definition', 'definition')
      ),
      marketTypeRationale: asString(
        pick(rec, 'market_type_rationale', 'classification_rationale', 'type_rationale') ??
          pick(classification, 'market_type_reason', 'rationale', 'reason')
      ),
      providerCategories: asStringList(
        pick(rec, 'provider_categories', 'provider_roles', 'roles', 'categories') ??
          pick(classification, 'keep_roles'),
        ['name', 'title', 'label']
      ),
      providerRationale: asString(
        pick(rec, 'provider_rationale', 'provider_category_rationale', 'role_rationale') ??
          pick(classification, 'player_type_reason')
      ),
      companyCount:
        asNumber(pick(rec, 'company_count', 'total_companies', 'companies_scored')) ??
        charted.length + others.length,
      xAxis: parseAxis(
        pick(rec, 'x_axis', 'xAxis', 'x') ?? criteria.x_axis,
        asString(pick(axisLabels, 'x'), 'Product Capability'),
        asRecord(paramDefs.x)
      ),
      yAxis: parseAxis(
        pick(rec, 'y_axis', 'yAxis', 'y') ?? criteria.y_axis,
        asString(pick(axisLabels, 'y'), 'Business Capability'),
        asRecord(paramDefs.y)
      ),
      charted,
      others,
      methodology: parseMethodology(pick(rec, 'methodology', 'research_methodology', 'method')),
      methodologyNote: asString(pick(rec, 'methodology_note', 'scoring_note', 'footnote')),
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
export function reviveQuadrantReport(stored: unknown): QuadrantReport | null {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null
  const rec = stored as Record<string, unknown>

  const looksNormalised =
    Array.isArray(rec.charted) &&
    Array.isArray(rec.others) &&
    typeof rec.market === 'string' &&
    !!rec.xAxis &&
    !!rec.yAxis

  if (looksNormalised) return stored as QuadrantReport
  return parseQuadrantReport(stored).report
}

// ── Display helpers ─────────────────────────────────────────────────────────

export const QUADRANT_KEYS = ['Leaders', 'Challengers', 'Trailblazers', 'Evolving Players'] as const

/** Display order for every company listing: strongest quadrant first. */
const QUADRANT_ORDER: Record<string, number> = {
  Leaders: 0,
  Challengers: 1,
  Trailblazers: 2,
  'Evolving Players': 3,
}

/**
 * Group companies by quadrant in the canonical order, ranking by overall score
 * within each group so the strongest name in a quadrant leads it.
 */
export function sortByQuadrant<T extends { quadrant: string; overallScore: number | null }>(
  companies: T[]
): T[] {
  return [...companies].sort((a, b) => {
    const qa = QUADRANT_ORDER[normaliseQuadrant(a.quadrant)] ?? 99
    const qb = QUADRANT_ORDER[normaliseQuadrant(b.quadrant)] ?? 99
    if (qa !== qb) return qa - qb
    return (b.overallScore ?? 0) - (a.overallScore ?? 0)
  })
}

/** Normalise free-text quadrant labels onto the four canonical cells. */
export function normaliseQuadrant(label: string): string {
  const l = (label || '').toLowerCase()
  if (l.includes('leader')) return 'Leaders'
  if (l.includes('challenger')) return 'Challengers'
  if (l.includes('trailblazer') || l.includes('innovat')) return 'Trailblazers'
  if (l.includes('evolving') || l.includes('emerging') || l.includes('foundation')) {
    return 'Evolving Players'
  }
  return label || 'Evolving Players'
}

/** Dot colour per quadrant, matching the standalone HTML report. */
export const QUADRANT_COLORS: Record<string, string> = {
  Leaders: '#7CFC00',
  Challengers: '#7EB6FF',
  Trailblazers: '#C4B5FD',
  'Evolving Players': '#A7F3D0',
}

/**
 * Plot position as { left, top } percentages.
 *
 * Explicit coordinates win when the export supplies them. Otherwise the company
 * is placed inside the cell its `quadrant` names, positioned within that cell by
 * its axis scores. Deriving position from the score alone risked landing a dot
 * in a different quadrant than the one the report states, because scores are
 * normalised against the population median rather than a fixed midpoint.
 */
export function plotPosition(c: QuadrantCompany): { left: number; top: number } {
  // cmi-quadrant-v1 ships left_pct/top_pct already in CSS space, laid out by the
  // generator to avoid label collisions — use them verbatim.
  if (c.xPct !== null && c.topPct !== null) {
    return { left: clamp(c.xPct, 3, 97), top: clamp(c.topPct, 3, 97) }
  }
  if (c.xPct !== null && c.yPct !== null) {
    return { left: clamp(c.xPct, 3, 97), top: clamp(100 - c.yPct, 3, 97) }
  }

  const q = normaliseQuadrant(c.quadrant)
  const rightHalf = q === 'Leaders' || q === 'Trailblazers'
  const topHalf = q === 'Leaders' || q === 'Challengers'

  // Scores normalise to roughly 65–100; spread that band across the half-cell.
  const spread = (score: number | null): number => {
    if (score === null) return 0.5
    return clamp((score - 65) / 35, 0, 1)
  }

  const xIn = spread(c.xScore)
  const yIn = spread(c.yScore)

  const left = rightHalf ? 52 + xIn * 42 : 6 + xIn * 40
  const topFromBottom = topHalf ? 52 + yIn * 42 : 6 + yIn * 40

  return { left: clamp(left, 3, 97), top: clamp(100 - topFromBottom, 3, 97) }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Five fixed-size dots, filled left-to-right by score band (0–100). */
export function strengthDots(score: number | null): boolean[] {
  const s = score ?? 0
  const filled = s >= 85 ? 5 : s >= 65 ? 4 : s >= 45 ? 3 : s >= 25 ? 2 : 1
  return [0, 1, 2, 3, 4].map((i) => i < filled)
}
