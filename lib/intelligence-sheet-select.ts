/**
 * Which sheet of an intelligence workbook holds the directory.
 *
 * Analyst workbooks often open with front matter — a Home or cover sheet, a
 * parameter definition sheet — and put the table third. Reading sheet one
 * gives a handful of scattered labels and no table, so the sheet is chosen by
 * what it contains rather than by its position.
 */

/** Sheets that are front matter, however many rows they carry. */
const FRONT_MATTER =
  /^(home|cover|index|contents?|toc|read\s?me|instructions?|about|legend|glossary|notes?|definitions?|parameter\s+definitions?|field\s+definitions?|disclaimer|sources?|changelog|version|summary)\b/i

/** A row counts towards a table when it carries several populated cells. */
const MIN_CELLS_PER_ROW = 3

/** Row markers that say a table starts here. */
const TABLE_MARKER = /^(s\.?\s*no\.?|sr\.?\s*no\.?|serial\s*no\.?|#|company\s*name|customer\s*name|distributor\s*name)$/i

export interface SheetRows {
  name: string
  rows: unknown[][]
}

function populatedCells(row: unknown[] = []): number {
  return row.filter((c) => c !== undefined && c !== null && String(c).trim() !== '').length
}

/** How much of a table a sheet looks like. */
function tableScore(rows: unknown[][]): number {
  let score = 0
  let widest = 0
  for (const row of rows) {
    const cells = populatedCells(row)
    if (cells >= MIN_CELLS_PER_ROW) score += 1
    if (cells > widest) widest = cells
    const first = String(row?.[0] ?? '').trim()
    // A header marker is worth a lot: it is the table's own label for itself.
    if (TABLE_MARKER.test(first)) score += 25
  }
  // Wide sheets are directories; narrow ones are usually definitions.
  return score + widest * 2
}

/**
 * The sheet holding the directory.
 *
 * Front matter is set aside first; if every sheet looks like front matter the
 * best scoring one is used anyway, so a workbook can still be read when its
 * only sheet is called "Summary".
 */
export function chooseDataSheet(sheets: SheetRows[]): string | null {
  if (sheets.length === 0) return null
  if (sheets.length === 1) return sheets[0].name

  const scored = sheets.map((sheet) => ({
    name: sheet.name,
    frontMatter: FRONT_MATTER.test(sheet.name.trim()),
    score: tableScore(sheet.rows),
  }))

  const candidates = scored.filter((s) => !s.frontMatter && s.score > 0)
  const pool = candidates.length > 0 ? candidates : scored

  // Highest score wins; the earliest sheet breaks a tie, so a workbook with two
  // equally sized tables still reads the first.
  return pool.reduce((best, current) => (current.score > best.score ? current : best)).name
}
