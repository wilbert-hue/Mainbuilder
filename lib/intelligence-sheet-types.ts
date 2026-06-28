/** Intelligence proposition table shape stored in MongoDB and Zustand. */

export interface IntelligenceSheetData {
  headers: string[]
  rows: Record<string, unknown>[]
  parentHeaders?: { name: string; startCol: number; colSpan: number }[] | null
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
  }
}
