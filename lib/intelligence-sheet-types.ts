/** Intelligence proposition table shape stored in MongoDB and Zustand. */

/** A sub-heading inside a methodology section, with its bullet points. */
export interface MethodologyGroup {
  /** e.g. "Organizations we surveyed". Absent when the bullets stand alone. */
  title?: string
  items: string[]
}

/** One numbered methodology section, shown as a collapsible panel. */
export interface MethodologySection {
  /** e.g. "Primary Research" — the leading "1." is stripped. */
  title: string
  groups: MethodologyGroup[]
  /** Prose that is not a bullet, e.g. the intent-capture paragraph. */
  paragraphs: string[]
}

/**
 * The intent-capture paragraph, fixed across every intelligence table.
 *
 * The section describes a platform capability rather than anything particular
 * to one market, so it reads identically on a demo and on a real upload, and
 * is not taken from whatever the source sheet happened to say.
 */
export const INTENT_CAPTURE_PARAGRAPH =
  'Intent data is captured through our proprietary intent-intelligence technology, which continuously monitors real-time search activity, content consumption and digital engagement across the web to identify organizations actively researching solutions in this market. Signals are scored and refreshed in real time, so the accounts surfaced reflect current buying interest rather than static firmographics.'

/** The heading the paragraph sits under. */
export const INTENT_CAPTURE_TITLE = 'Intent Capture from Search Results (Real-time)'

const isIntentCapture = (title: string) => /intent\s*capture/i.test(title)

/**
 * Give a methodology block the standard intent-capture section: the fixed
 * wording, and the section itself when the block has none.
 *
 * Applied both where a block is produced (upload and demo) and on the way out
 * of storage, so dashboards built before this was settled read the same as new
 * ones without each having to be rewritten.
 */
export function withStandardIntentCapture(sections: MethodologySection[]): MethodologySection[] {
  const out = sections.map((s) =>
    isIntentCapture(s.title) ? { ...s, paragraphs: [INTENT_CAPTURE_PARAGRAPH] } : s
  )
  if (!out.some((s) => isIntentCapture(s.title))) {
    out.push({ title: INTENT_CAPTURE_TITLE, groups: [], paragraphs: [INTENT_CAPTURE_PARAGRAPH] })
  }
  return out
}

export interface IntelligenceSheetData {
  headers: string[]
  rows: Record<string, unknown>[]
  parentHeaders?: { name: string; startCol: number; colSpan: number }[] | null
  /** Human-readable sheet label (e.g. "Engines", "Filters"). Defaults to "Proposition N" in the UI when absent. */
  sheetLabel?: string
  /** Title / definition lines that sit above the table in the source sheet. */
  notes?: string[]
  /** Parsed METHODOLOGY block, when the sheet opens with one. */
  methodology?: MethodologySection[]
}

/** Validate API/Mongo payload before hydrating the client store. */
export function parseIntelligenceSheet(data: unknown): IntelligenceSheetData | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.headers) || !Array.isArray(d.rows)) return null
  return {
    headers: d.headers as string[],
    rows: d.rows as Record<string, unknown>[],
    parentHeaders: Array.isArray(d.parentHeaders)
      ? (d.parentHeaders as IntelligenceSheetData['parentHeaders'])
      : d.parentHeaders === null
        ? null
        : undefined,
    sheetLabel: typeof d.sheetLabel === 'string' ? d.sheetLabel : undefined,
    notes: Array.isArray(d.notes)
      ? (d.notes as unknown[]).filter((n): n is string => typeof n === 'string' && n.trim() !== '')
      : undefined,
    methodology: parseMethodology(d.methodology),
  }
}

/** Validate a stored methodology block, dropping anything malformed. */
export function parseMethodology(value: unknown): MethodologySection[] | undefined {
  if (!Array.isArray(value)) return undefined
  const strings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim() !== '') : []

  const sections = value
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s) => ({
      title: typeof s.title === 'string' ? s.title : '',
      groups: Array.isArray(s.groups)
        ? s.groups
            .filter((g): g is Record<string, unknown> => !!g && typeof g === 'object')
            .map((g) => ({
              title: typeof g.title === 'string' && g.title.trim() ? g.title : undefined,
              items: strings(g.items),
            }))
            .filter((g) => g.items.length > 0 || !!g.title)
        : [],
      paragraphs: strings(s.paragraphs),
    }))
    .filter((s) => s.title && (s.groups.length > 0 || s.paragraphs.length > 0))

  return sections.length > 0 ? withStandardIntentCapture(sections) : undefined
}
