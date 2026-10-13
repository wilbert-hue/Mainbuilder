/**
 * Parse the METHODOLOGY block that intelligence workbooks put above the table.
 *
 * The block is a run of rows merged across the sheet's full width, so in the
 * parsed grid each contributes a single populated cell:
 *
 *   METHODOLOGY
 *   1.  Primary Research
 *   Organizations we surveyed
 *   •  Healthcare & Life Sciences
 *   ...
 *   2.  Real-time Trigger Signals
 *   •  Opening new wound care clinic ...
 *   …and 50+ other trigger signals
 *   3.  Intent Capture from Search Results (Real-time)
 *   Intent data is captured through ...
 *
 * Numbered rows open a section, bullets belong to the section, and a short
 * unbulleted row immediately above a bullet is that bullet group's sub-heading.
 * Anything else is prose.
 */

import type { MethodologySection } from '@/lib/intelligence-sheet-types'

/** The row that marks the block. Nothing is parsed unless this is present. */
const METHODOLOGY_TITLE = /^methodology$/i

/** "1.  Primary Research" — the number is the section marker. */
const SECTION_HEADING = /^(\d+)[.)]\s+(.*\S)\s*$/

/** Bullet glyphs Excel templates use, including the "…and 50+ more" ellipsis. */
const BULLET = /^[•▪◦‣·\-–—*]\s*/

/** A sub-heading is a label, not a sentence. */
const MAX_SUBHEADING_CHARS = 80

/** Reduce a grid row to its single meaningful cell. */
function rowText(row: unknown[] | undefined): string {
  if (!row) return ''
  for (const cell of row) {
    const text = cell === null || cell === undefined ? '' : String(cell).trim()
    if (text) return text
  }
  return ''
}

/** True when the sheet opens with a METHODOLOGY block. */
export function hasMethodologyBlock(rows: unknown[][], limit: number): boolean {
  for (let i = 0; i < Math.min(rows.length, limit); i++) {
    if (METHODOLOGY_TITLE.test(rowText(rows[i]))) return true
  }
  return false
}

/**
 * Parse rows `0 … headerStart - 1` into sections.
 * Returns undefined when the block is absent or yields nothing usable.
 */
export function parseMethodologyBlock(
  rows: unknown[][],
  headerStart: number
): MethodologySection[] | undefined {
  const lines: string[] = []
  for (let i = 0; i < headerStart && i < rows.length; i++) {
    const text = rowText(rows[i])
    if (text) lines.push(text)
  }
  if (!lines.some((l) => METHODOLOGY_TITLE.test(l))) return undefined

  const sections: MethodologySection[] = []
  let current: MethodologySection | null = null
  /** The group bullets are currently landing in. */
  let group: MethodologySection['groups'][number] | null = null
  /** A short line held back until we know whether a bullet follows it. */
  let pendingHeading: string | null = null

  const flushPendingAsParagraph = () => {
    if (pendingHeading && current) current.paragraphs.push(pendingHeading)
    pendingHeading = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (METHODOLOGY_TITLE.test(line)) continue

    const heading = SECTION_HEADING.exec(line)
    if (heading) {
      flushPendingAsParagraph()
      current = { title: heading[2].trim(), groups: [], paragraphs: [] }
      sections.push(current)
      group = null
      continue
    }

    if (!current) continue // stray text above the first numbered section

    if (BULLET.test(line)) {
      const item = line.replace(BULLET, '').trim()
      if (!item) continue
      if (pendingHeading !== null) {
        group = { title: pendingHeading, items: [] }
        current.groups.push(group)
        pendingHeading = null
      }
      if (!group) {
        group = { items: [] }
        current.groups.push(group)
      }
      group.items.push(item)
      continue
    }

    // Not a bullet. Short lines followed by a bullet are sub-headings; the rest
    // — including the trailing "…and 50+ other trigger signals" — are prose.
    flushPendingAsParagraph()
    const nextIsBullet = BULLET.test(lines[i + 1] ?? '')
    if (nextIsBullet && line.length <= MAX_SUBHEADING_CHARS) {
      pendingHeading = line
      group = null
    } else {
      current.paragraphs.push(line)
    }
  }
  flushPendingAsParagraph()

  const usable = sections.filter((s) => s.groups.length > 0 || s.paragraphs.length > 0)
  return usable.length > 0 ? usable : undefined
}
