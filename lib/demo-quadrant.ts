/**
 * Demo Coherent Quadrant.
 *
 * Builds a complete, anonymised quadrant from the market workbook alone, so a
 * dashboard can show the module's shape without an analyst's quadrant export —
 * the same idea as the static Proposition 1 template in the intelligence tables.
 *
 * Everything identifying is withheld: companies are "Company 1…n", and the
 * view locks HQ, role and the per-parameter evidence. What is real is the
 * market's own name, geography and currency scope, which thread through the
 * axis titles, the quadrant descriptions and the parameter definitions.
 */

import type { ComparisonData } from '@/lib/types'
import { marketScopeLabel, stripScopePrefix } from '@/lib/market-scope'
import { isTechnologyMarket } from '@/lib/module-labels'
import { isConsumerMarket } from '@/lib/market-flavour'
import { commonBusinessParameters, industryProfile } from '@/lib/industry-profiles'
import type {
  QuadrantAxis,
  QuadrantCompany,
  QuadrantDefinition,
  QuadrantParameterDefinition,
  QuadrantReport,
} from '@/lib/quadrant-types'

const CHARTED_COMPANIES = 20
const OTHER_COMPANIES = 100

/** Canonical cells, strongest first — matches QUADRANT_KEYS in quadrant-types. */
const QUADRANTS = ['Leaders', 'Challengers', 'Trailblazers', 'Evolving Players'] as const

/**
 * Markets whose X axis is better described as technology or service capability
 * than product capability. Mirrors how the analyst exports title that axis.
 */
type MarketKind = 'technology' | 'service' | 'product'

/**
 * Work that is delivered rather than sold as a product or licensed as software.
 * Checked first: a market named "… Services" is a service market even when the
 * work itself is technical.
 */
const SERVICE_MARKET =
  /\b(services?|servicing|consult\w*|training|testing|inspection|maintenance|logistics|outsourc\w*|managed\s+\w+|repair|installation|surveying|monitoring)\b/i

/**
 * What the market mainly sells, read off its name. Drives the X axis title and
 * the provider category, the same way an analyst export states both.
 *
 * The technology test is shared with the channel-partner naming, so a market
 * cannot be a software market for one label and a hardware market for another.
 */
function marketKind(market: string): MarketKind {
  if (SERVICE_MARKET.test(market)) return 'service'
  if (isTechnologyMarket(market)) return 'technology'
  return 'product'
}

function xAxisName(kind: MarketKind): string {
  if (kind === 'technology') return 'Technology Capability'
  if (kind === 'service') return 'Service Capability'
  return 'Product Capability'
}

/** The kind of company the quadrant scores, and why that role was chosen. */
function providerCategory(kind: MarketKind, subject: string): { category: string; rationale: string } {
  if (kind === 'technology') {
    return {
      category: 'Solution Provider',
      rationale: `Solution Provider was chosen because the competitive landscape for ${subject.toLowerCase()} is built around companies developing and licensing the platforms and software that deliver the capability.`,
    }
  }
  if (kind === 'service') {
    return {
      category: 'Service Provider',
      rationale: `Service Provider was chosen because the competitive landscape for ${subject.toLowerCase()} is built around companies delivering the work as a service rather than selling a physical product.`,
    }
  }
  // A consumer market is made by brand owners, not by equipment suppliers.
  if (isConsumerMarket(subject)) {
    return {
      category: 'Brand Owner / Producer',
      rationale: `Brand Owner / Producer was chosen because the competitive landscape for ${subject.toLowerCase()} is built around the companies that produce and brand the goods reaching retail, wholesale and hospitality buyers.`,
    }
  }
  return {
    category: 'Manufacturer',
    rationale: `Manufacturer was chosen because the competitive landscape for ${subject.toLowerCase()} is built around companies producing and selling the physical equipment and materials that define the market.`,
  }
}

/** "Battery Fire Safety Industry Analysis" → "Battery Fire Safety". */
function marketSubject(market: string): string {
  // The geography is stated separately on the quadrant, so the subject drops
  // it: "global scottish whisky" reads as a stutter in the rationale.
  let subject = stripScopePrefix(market)
  // Strip repeatedly, so "India Market Analysis" reduces to "India" rather
  // than stopping at "India Market".
  for (;;) {
    const next = subject.replace(/\s*(industry|market|analysis|report)\s*$/i, '').trim()
    if (next === subject || !next) break
    subject = next
  }
  return subject || market
}

function axisParameters(market: string, geo: string, _xName: string): {
  x: QuadrantParameterDefinition[]
  y: QuadrantParameterDefinition[]
} {
  const where = geo && geo.toLowerCase() !== 'global' ? geo : ''
  const profile = industryProfile(market)

  // The product axis is the industry's own scoring sheet; the business axis is
  // four measures every market shares, plus the customers that matter here.
  return {
    x: profile.xParameters.map((parameter) => ({ ...parameter })),
    y: [...commonBusinessParameters(where), { ...profile.customerBase }],
  }
}

/**
 * Quadrant descriptions. The prose is fixed — it describes the framework, not
 * the market — while the position line is phrased in this market's axis names.
 */
function quadrantDefinitions(xName: string, yName: string): QuadrantDefinition[] {
  return [
    {
      quadrant: 'Leaders',
      title: 'Integrated Market Leaders',
      position: `Best-in-class ${xName}, Best-in-class ${yName}`,
      definition:
        'Companies demonstrating strong product capabilities and robust business execution. They combine mature and differentiated offerings with established market presence, customer reach, commercial scale, and effective growth strategies, positioning them strongly for sustained market leadership.',
    },
    {
      quadrant: 'Challengers',
      title: 'Scale-Driven Challengers',
      position: `Emerging ${xName}, Best-in-class ${yName}`,
      definition:
        'Companies with strong business presence and commercial capabilities, supported by established customer relationships, market reach, channels, or brand strength. However, their product portfolio may have relatively lower differentiation, breadth, maturity, or innovation compared with leading participants.',
    },
    {
      quadrant: 'Trailblazers',
      title: 'Innovation-Driven Trailblazers',
      position: `Best-in-class ${xName}, Emerging ${yName}`,
      definition:
        'Companies demonstrating strong product capabilities, innovation, or differentiated offerings, but with comparatively lower business scale or market penetration. Their growth potential depends on strengthening commercial execution, customer reach, partnerships, geographic presence, and overall market visibility.',
    },
    {
      quadrant: 'Evolving Players',
      title: 'Foundation-Building Evolving',
      position: `Emerging ${xName}, Emerging ${yName}`,
      definition:
        'Companies with developing product capabilities and relatively limited business presence. These participants may be at an earlier stage of market development, serve focused segments or geographies, and have opportunities to strengthen both their product proposition and commercial footprint.',
    },
  ]
}

/**
 * Deterministic pseudo-random in [0,1).
 *
 * Seeded so a dashboard's demo quadrant looks identical on every render and
 * every reload — a random scatter that moved on refresh would read as a bug.
 */
function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Scores sit in the 65–100 band the real exports normalise to, and descend
 * with the company's position inside its quadrant.
 *
 * The view sorts every listing by quadrant and then by score, so a flat random
 * spread would shuffle "Company 1, 2, 3…" into a meaningless order on screen.
 * Ranking by position keeps the generated numbering and the displayed order in
 * step, with a small deterministic jitter so the dots are not in a line.
 */
function scoreFor(rank: number, span: number, salt: number, high: boolean): number {
  const top = high ? 99 : 82
  const floor = high ? 84 : 67
  // Spread the block across its own range, so a long tail does not bottom out
  // and leave every company tied on the same score.
  const step = span > 1 ? (top - floor) / (span - 1) : 0
  const jitter = seeded(rank * 7 + salt) * Math.min(1, step / 2)
  return Math.round(top - rank * step - jitter)
}

function makeCompany(
  index: number,
  rank: number,
  span: number,
  quadrant: string,
  charted: boolean,
  params: { x: QuadrantParameterDefinition[]; y: QuadrantParameterDefinition[] }
): QuadrantCompany {
  const strongX = quadrant === 'Leaders' || quadrant === 'Trailblazers'
  const strongY = quadrant === 'Leaders' || quadrant === 'Challengers'
  const xScore = scoreFor(rank, span, 1, strongX)
  const yScore = scoreFor(rank, span, 2, strongY)
  const name = `Company ${index}`

  // Parameter names are the market's own; the evidence is deliberately absent,
  // and the view renders a locked panel in its place.
  const blankScores = (defs: QuadrantParameterDefinition[]) =>
    defs.map((d) => ({ name: d.name, score: null, basis: '', evidence: [] }))

  return {
    brand: name,
    company: name,
    hq: '',
    role: '',
    country: '',
    quadrant,
    xScore,
    yScore,
    overallScore: Math.round((xScore + yScore) / 2),
    xParameters: charted ? blankScores(params.x) : [],
    yParameters: charted ? blankScores(params.y) : [],
    // Plot inside the company's own quadrant cell, inset from the edges.
    xPct: (strongX ? 52 : 6) + seeded(index * 3 + 5) * 40,
    yPct: null,
    topPct: (strongY ? 6 : 52) + seeded(index * 3 + 9) * 40,
  }
}

/**
 * Build the demo quadrant for a market.
 *
 * A workbook is not required: the market name alone is enough to write the
 * axes, the provider category and the company population, so a dashboard can
 * be the quadrant and nothing else. Returns null only when there is no market
 * to name.
 */
export function buildDemoQuadrant(
  data: ComparisonData | null | undefined,
  dashboardName?: string | null
): QuadrantReport | null {
  const market = (dashboardName || data?.metadata?.market_name || '').trim()
  if (!market) return null

  const geographies = data?.dimensions?.geographies?.all_geographies ?? []
  const geo = geographies[0] || marketScopeLabel(market)
  const kind = marketKind(market)
  const xName = xAxisName(kind)
  const subject = marketSubject(market)
  const provider = providerCategory(kind, subject)
  const yName = 'Business Capability'
  const params = axisParameters(market, geo, xName)

  const xAxis: QuadrantAxis = { name: xName, parameters: params.x }
  const yAxis: QuadrantAxis = { name: yName, parameters: params.y }

  // Quadrants are filled in blocks rather than round-robin, so the companies
  // read 1, 2, 3… down the page once the view sorts them by quadrant.
  const perQuadrant = CHARTED_COMPANIES / QUADRANTS.length
  const charted: QuadrantCompany[] = []
  for (let i = 0; i < CHARTED_COMPANIES; i++) {
    const quadrant = QUADRANTS[Math.floor(i / perQuadrant)]
    charted.push(makeCompany(i + 1, i % perQuadrant, perQuadrant, quadrant, true, params))
  }

  const othersPerQuadrant = OTHER_COMPANIES / QUADRANTS.length
  const others: QuadrantCompany[] = []
  for (let i = 0; i < OTHER_COMPANIES; i++) {
    const quadrant = QUADRANTS[Math.floor(i / othersPerQuadrant)]
    others.push(
      makeCompany(
        CHARTED_COMPANIES + i + 1,
        i % othersPerQuadrant,
        othersPerQuadrant,
        quadrant,
        false,
        params
      )
    )
  }

  return {
    market,
    geo,
    marketType: '',
    marketDefinition: `Illustrative competitive positioning for ${marketSubject(market)}, generated from the segmentation in this dashboard.`,
    marketTypeRationale: '',
    providerCategories: [provider.category],
    providerRationale: provider.rationale,
    companyCount: CHARTED_COMPANIES + OTHER_COMPANIES,
    xAxis,
    yAxis,
    charted,
    others,
    quadrantDefinitions: quadrantDefinitions(xName, yName),
    // Left empty so the view falls back to its standard research methodology.
    methodology: [],
    methodologyNote: '',
  }
}
