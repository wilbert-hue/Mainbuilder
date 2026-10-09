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
function xAxisName(market: string): string {
  const m = market.toLowerCase()
  if (/\b(software|platform|analytics|ai\b|cloud|cyber|data|digital)/.test(m)) {
    return 'Technology Capability'
  }
  if (/\b(service|services|training|consult|testing|inspection|maintenance)/.test(m)) {
    return 'Service Capability'
  }
  return 'Product Capability'
}

/** "Battery Fire Safety Industry Analysis" → "Battery Fire Safety". */
function marketSubject(market: string): string {
  let subject = market.trim()
  // Strip repeatedly, so "India Market Analysis" reduces to "India" rather
  // than stopping at "India Market".
  for (;;) {
    const next = subject.replace(/\s*(industry|market|analysis|report)\s*$/i, '').trim()
    if (next === subject || !next) break
    subject = next
  }
  return subject || market
}

function axisParameters(market: string, geo: string, xName: string): {
  x: QuadrantParameterDefinition[]
  y: QuadrantParameterDefinition[]
} {
  const subject = marketSubject(market)
  const where = geo && geo.toLowerCase() !== 'global' ? geo : 'the covered markets'
  const offering = xName === 'Service Capability' ? 'service' : xName === 'Technology Capability' ? 'technology' : 'product'

  return {
    x: [
      {
        name: `${subject} Portfolio Breadth`,
        definition: `Range and depth of the ${offering} portfolio across the ${subject.toLowerCase()} segments covered by this dashboard. Evidence includes published catalogues, specification sheets and segment coverage.`,
      },
      {
        name: `Innovation and R&D in ${subject}`,
        definition: `Investment in research and development, and the pace at which new ${offering} capability reaches the market. Evidence includes patents, product launches and dedicated R&D facilities.`,
      },
      {
        name: 'Quality, Standards and Certification',
        definition: `Conformance with the standards and certifications that apply to ${subject.toLowerCase()} in ${where}. Evidence includes certificate numbers, audit outcomes and approval dates.`,
      },
      {
        name: 'Performance in Deployment',
        definition: `Demonstrated performance of the ${offering} in live deployments, including reliability, test outcomes and published case studies.`,
      },
      {
        name: 'Integration and Interoperability',
        definition: `How readily the ${offering} fits alongside adjacent systems and existing customer infrastructure. Evidence includes documented integrations and partner ecosystems.`,
      },
    ],
    y: [
      {
        name: `Revenue and Growth in ${where}`,
        definition: `Revenue scale and growth rate attributable to ${subject.toLowerCase()} in ${where}. Evidence includes financial statements, investor material and market share reporting.`,
      },
      {
        name: 'Customer Base and Key Accounts',
        definition: `Breadth and quality of the customer base, including named reference accounts and the duration of those relationships.`,
      },
      {
        name: 'Distribution and Channel Reach',
        definition: `Strength of the route to market across ${where} — direct sales, distributors, systems integrators and online channels.`,
      },
      {
        name: 'Delivery and Support Network',
        definition: `Capacity to deliver and support at scale: service points, technical support, warranty terms and response times.`,
      },
      {
        name: 'Regulatory Approvals and Market Access',
        definition: `Approvals, licences and registrations required to trade in ${where}, and the breadth of geographies they unlock.`,
      },
    ],
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
 * Build the demo quadrant for a market workbook. Returns null without data,
 * so the caller can simply fall back to "no quadrant".
 */
export function buildDemoQuadrant(
  data: ComparisonData | null | undefined,
  dashboardName?: string | null
): QuadrantReport | null {
  if (!data?.dimensions) return null

  const market = (dashboardName || data.metadata?.market_name || 'Market').trim()
  const geo = data.dimensions.geographies?.all_geographies?.[0] || 'Global'
  const xName = xAxisName(market)
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
    providerCategories: [],
    providerRationale: '',
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
