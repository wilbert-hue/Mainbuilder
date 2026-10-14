/**
 * Guard against model commentary reaching the dashboard as data.
 *
 * Taxonomies are often transcribed from a report's region and segment panels
 * with an LLM's help. When that transcription includes the model's own working
 * — "I need to reconstruct the full regional hierarchy…", "Level 1: Europe",
 * "From the images, I can piece together:" — those lines arrive here looking
 * exactly like geography names, and the dashboard dutifully charts them.
 *
 * A real geography or segment label is a short noun phrase. Anything that
 * reads as a sentence, a list, or an annotation is dropped: better to lose a
 * row than to put a model's thinking in front of a client.
 */

import type { ComparisonData } from '@/lib/types'

/** Longer than any real geography or segment label in these reports. */
const MAX_LABEL_CHARS = 60

/** Longer than any real label, counted in words. */
const MAX_LABEL_WORDS = 10

/** Phrases that only ever appear in a model's narration of its own work. */
const NARRATION =
  /\b(i need to|i can|i should|let me|we need to|re-?reading|from the (image|table|chart|screenshot)|piece together|as (shown|listed)|no sub-?items|standalone|appears as|note that|assuming|looks like|it seems)\b/i

/** "Level 1: Europe", "L2 - Germany" — an annotation, not a name. */
const OUTLINE_PREFIX = /^(level|lvl|l|tier|row|col(umn)?)\s*\d+\s*[:.\-–]/i

/**
 * True when a label reads as prose, an annotation or a list rather than a name.
 * Used for geography and segment labels alike.
 */
export function isProseLabel(value: unknown): boolean {
  if (value === null || value === undefined) return false
  const text = String(value).trim()
  if (!text) return false

  if (text.length > MAX_LABEL_CHARS) return true
  if (text.split(/\s+/).length > MAX_LABEL_WORDS) return true
  if (NARRATION.test(text)) return true
  if (OUTLINE_PREFIX.test(text)) return true
  // An annotation in brackets, or a quoted fragment of someone's prose.
  if (text.startsWith('(') || text.startsWith('[')) return true
  if (text.includes('"') || text.includes('“') || text.includes('”')) return true
  // A trailing colon introduces something; a name never does.
  if (text.endsWith(':')) return true

  return false
}

/**
 * True when a label is not a usable geography. Adds one rule to the prose
 * test: a comma means several places were run together on one line
 * ("U.S., Canada"), which is a list rather than a geography.
 */
export function isProseGeography(value: unknown): boolean {
  if (isProseLabel(value)) return true
  const text = String(value ?? '').trim()
  return text.includes(',')
}

/** Keep the entries that read as names. */
function keepNames(values: unknown, geography: boolean): string[] {
  if (!Array.isArray(values)) return []
  const reject = geography ? isProseGeography : isProseLabel
  return values.filter((v) => typeof v === 'string' && v.trim() !== '' && !reject(v)) as string[]
}

/**
 * Drop model commentary from a processed dashboard: the geography and segment
 * dimensions, and any matrix record filed under a label that was dropped.
 *
 * Returns the same object when nothing needed removing, so this is safe to run
 * on every load.
 */
export function sanitiseComparisonData<T extends ComparisonData | null | undefined>(data: T): T {
  if (!data?.dimensions) return data

  const removed: string[] = []
  const note = (values: string[], kept: string[]) => {
    for (const v of values) if (!kept.includes(v)) removed.push(v)
  }

  const geo = data.dimensions.geographies ?? ({} as ComparisonData['dimensions']['geographies'])
  const allGeographies = Array.isArray(geo.all_geographies) ? geo.all_geographies : []
  const keptGeographies = keepNames(allGeographies, true)
  note(allGeographies, keptGeographies)

  const keptRegions = keepNames(geo.regions, true)
  const keptGlobal = keepNames((geo as { global?: unknown }).global, true)

  // countries is keyed by region; prune both the keys and their lists.
  const countries: Record<string, string[]> = {}
  for (const [region, list] of Object.entries(geo.countries ?? {})) {
    if (isProseGeography(region)) {
      removed.push(region)
      continue
    }
    countries[region] = keepNames(list, true)
  }

  // Segment types and their members.
  const segments: ComparisonData['dimensions']['segments'] = {}
  for (const [type, dimension] of Object.entries(data.dimensions.segments ?? {})) {
    if (isProseLabel(type)) {
      removed.push(type)
      continue
    }
    const items = keepNames(dimension?.items, false)
    // The hierarchy is keyed by parent label; prune both sides of it.
    const hierarchy: Record<string, string[]> = {}
    for (const [parent, children] of Object.entries(dimension?.hierarchy ?? {})) {
      if (isProseLabel(parent)) continue
      hierarchy[parent] = keepNames(children, false)
    }
    if (items.length !== (dimension?.items?.length ?? 0)) {
      note(dimension.items ?? [], items)
    }
    segments[type] = { ...dimension, items, hierarchy }
  }

  if (removed.length === 0) return data

  const droppedGeographies = new Set(
    allGeographies.filter((g) => !keptGeographies.includes(g))
  )
  const droppedSegmentTypes = new Set(
    Object.keys(data.dimensions.segments ?? {}).filter((t) => !(t in segments))
  )

  /** A record filed under a dropped label describes nothing real. */
  const pruneRecords = <R extends { geography?: unknown; segment_type?: unknown }>(
    records: R[] | undefined
  ): R[] =>
    (records ?? []).filter(
      (r) =>
        !droppedGeographies.has(String(r.geography)) &&
        !droppedSegmentTypes.has(String(r.segment_type))
    )

  console.warn(
    `[label-sanity] dropped ${removed.length} label(s) that read as commentary:`,
    removed.slice(0, 5)
  )

  return {
    ...data,
    dimensions: {
      ...data.dimensions,
      geographies: {
        ...geo,
        global: keptGlobal,
        regions: keptRegions,
        countries,
        all_geographies: keptGeographies,
      },
      segments,
    },
    data: {
      ...data.data,
      value: {
        ...data.data?.value,
        geography_segment_matrix: pruneRecords(data.data?.value?.geography_segment_matrix),
      },
      volume: {
        ...data.data?.volume,
        geography_segment_matrix: pruneRecords(data.data?.volume?.geography_segment_matrix),
      },
    },
  } as T
}
