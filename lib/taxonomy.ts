/**
 * Dashboard taxonomy — the report's scope expressed as a numbered outline.
 *
 * Everything here is derived from the uploaded market workbook (metadata +
 * dimensions), so the taxonomy always matches the data the dashboard charts.
 */

import type { ComparisonData } from '@/lib/types'

export interface TaxonomyNode {
  /** Display number, e.g. "1.2" or "1.2.3". */
  number: string
  label: string
  children: TaxonomyNode[]
}

export interface TaxonomyGroup {
  /** Heading, e.g. "System Type Insights (Revenue, USD Mn, 2021 - 2033)". */
  title: string
  nodes: TaxonomyNode[]
}

export interface TaxonomySection {
  title: string
  groups: TaxonomyGroup[]
}

export interface Taxonomy {
  marketName: string
  /** "Revenue, USD Mn, 2021 - 2033" — reused in every group heading. */
  scope: string
  sections: TaxonomySection[]
}

/** "Million" → "Mn", "Billion" → "Bn"; anything else passes through. */
function abbreviateUnit(unit: string): string {
  const u = (unit || '').trim().toLowerCase()
  if (u.startsWith('bn') || u.startsWith('billion')) return 'Bn'
  if (u.startsWith('mn') || u.startsWith('million')) return 'Mn'
  if (u.startsWith('tn') || u.startsWith('trillion')) return 'Tn'
  if (u.startsWith('th') || u.startsWith('thousand')) return 'Th'
  return unit || ''
}

/** "By System Type" → "System Type"; the "Insights" suffix is added by the caller. */
function segmentTypeLabel(type: string): string {
  return type.replace(/^by\s+/i, '').trim() || type
}

export function buildTaxonomy(data: ComparisonData, dashboardName?: string | null): Taxonomy | null {
  if (!data?.dimensions) return null

  const meta = data.metadata
  const years = meta?.years || []
  const first = meta?.start_year ?? years[0]
  const last = meta?.forecast_year ?? years[years.length - 1]
  const unit = [meta?.currency, abbreviateUnit(meta?.value_unit || '')].filter(Boolean).join(' ')
  const scope = ['Revenue', unit, first && last ? `${first} - ${last}` : '']
    .filter(Boolean)
    .join(', ')

  const sections: TaxonomySection[] = []

  // ── Market segmentation ────────────────────────────────────────────────
  const segments = data.dimensions.segments || {}
  const segmentGroups: TaxonomyGroup[] = Object.entries(segments)
    .filter(([, dim]) => dim?.items?.length)
    .map(([type, dim], groupIndex) => {
      const hierarchy = dim.hierarchy || {}
      const nodes = dim.items.map((item, i) => {
        const number = `${groupIndex + 1}.${i + 1}`
        const children = (hierarchy[item] || []).map((child, j) => ({
          number: `${number}.${j + 1}`,
          label: child,
          children: [],
        }))
        return { number, label: item, children }
      })
      return { title: `${segmentTypeLabel(type)} Insights (${scope})`, nodes }
    })

  if (segmentGroups.length) {
    sections.push({ title: 'Market Segmentation', groups: segmentGroups })
  }

  // ── Geographical coverage ──────────────────────────────────────────────
  const geo = data.dimensions.geographies
  const hierarchy = geo?.geography_hierarchy || geo?.countries || {}
  const regions = Object.keys(hierarchy).length
    ? Object.keys(hierarchy)
    : geo?.regions || []

  if (regions.length) {
    const nodes = regions.map((region, i) => ({
      number: `${segmentGroups.length + 1}.${i + 1}`,
      label: region,
      children: (hierarchy[region] || []).map((country, j) => ({
        number: `${segmentGroups.length + 1}.${i + 1}.${j + 1}`,
        label: country,
        children: [],
      })),
    }))
    sections.push({
      title: 'Geographical Coverage',
      groups: [{ title: `Regional Insights (${scope})`, nodes }],
    })
  }

  if (!sections.length) return null

  return {
    marketName: dashboardName || meta?.market_name || 'Market',
    scope,
    sections,
  }
}

/**
 * Leaf geographies (countries) in workbook order, with the covered market
 * first. Used for the country strip above the country-scoped views.
 */
export function countriesFromData(
  data: ComparisonData | null | undefined,
  covered: string,
): string[] {
  const geo = data?.dimensions?.geographies
  const hierarchy = geo?.geography_hierarchy || geo?.countries || {}
  const leaves = Object.values(hierarchy).flat().filter(Boolean)
  const unique = Array.from(new Set(leaves))
  if (!unique.length) return []
  // The covered market leads the strip; it is the default selection.
  return [covered, ...unique.filter((c) => c !== covered)]
}
