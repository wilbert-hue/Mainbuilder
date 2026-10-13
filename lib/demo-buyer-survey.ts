/**
 * Demo Voice of Customer (B2B) report.
 *
 * Builds the full shape of a buyer survey from the market workbook alone — the
 * same idea as the demo Coherent Quadrant and the static Proposition 1
 * template. The buyer landscape, the sections and the question wording are all
 * written from the market's own name and segmentation, so the preview reads as
 * this market's study.
 *
 * What is deliberately missing is the data: every question carries no options
 * and no takeaway, and the view renders a lock in place of the chart. Selling
 * the questionnaire is the point; the answers are what a subscription buys.
 */

import type { ComparisonData } from '@/lib/types'
import type {
  BuyerSegment,
  BuyerSurveyQuestion,
  BuyerSurveyReport,
  BuyerSurveySegment,
} from '@/lib/buyer-survey-types'

/** Respondent count quoted on the title card and every question header. */
const DEMO_SAMPLE_SIZE = 120

/** "Global Advance Wound Care Market" → "Advance Wound Care". */
function marketSubject(market: string): string {
  let subject = market.trim()
  for (;;) {
    const next = subject
      .replace(/\s*(industry|market|analysis|report)\s*$/i, '')
      .replace(/^(global|worldwide)\s+/i, '')
      .trim()
    if (next === subject || !next) break
    subject = next
  }
  return subject || market.trim()
}

type MarketFlavour = 'healthcare' | 'technology' | 'energy' | 'industrial'

function marketFlavour(subject: string): MarketFlavour {
  const s = subject.toLowerCase()
  if (/(health|medical|clinic|wound|surgical|patient|pharma|diagnost|therapy|care|device)/.test(s)) {
    return 'healthcare'
  }
  if (/(software|platform|cloud|analytics|data|digital|saas|cyber|\bai\b|fintech)/.test(s)) {
    return 'technology'
  }
  if (/(energy|power|oil|gas|solar|battery|grid|utility|renewable|fuel)/.test(s)) return 'energy'
  return 'industrial'
}

/** Who buys, and how each buyer type buys. */
function buyerSegments(flavour: MarketFlavour): { whoBuys: string; segments: BuyerSegment[] } {
  if (flavour === 'healthcare') {
    return {
      whoBuys:
        'Procurement officers, materials managers, and clinical supply chain professionals within healthcare institutions, long term care systems, and medical distribution networks.',
      segments: [
        { name: 'Hospitals and Acute Care Facilities', description: '' },
        { name: 'Specialty Clinics', description: '' },
        { name: 'Long Term Care and Nursing Facilities', description: '' },
        { name: 'Home Healthcare Agencies', description: '' },
      ],
    }
  }
  if (flavour === 'technology') {
    return {
      whoBuys:
        'IT procurement leads, platform owners, and digital transformation managers within enterprise, public sector, and high growth technology organisations.',
      segments: [
        { name: 'Large Enterprise IT Organisations', description: '' },
        { name: 'Managed Service Providers', description: '' },
        { name: 'Public Sector Technology Departments', description: '' },
        { name: 'Mid Market Shared Service Centres', description: '' },
      ],
    }
  }
  if (flavour === 'energy') {
    return {
      whoBuys:
        'Procurement heads, asset managers, and engineering leads within utilities, independent power producers, and heavy industrial energy consumers.',
      segments: [
        { name: 'Utility Operators', description: '' },
        { name: 'Independent Power Producers', description: '' },
        { name: 'Industrial Energy Consumers', description: '' },
        { name: 'Engineering and EPC Contractors', description: '' },
      ],
    }
  }
  return {
    whoBuys:
      'Procurement managers, category leads, and operations heads within manufacturing groups, distribution networks, and public sector buying bodies.',
    segments: [
      { name: 'Manufacturing Groups', description: '' },
      { name: 'Regional Industrial Operators', description: '' },
      { name: 'Distribution and Trading Networks', description: '' },
      { name: 'Public Sector Procurement Bodies', description: '' },
    ],
  }
}

function organisations(flavour: MarketFlavour): string[] {
  if (flavour === 'healthcare') {
    return [
      'Multinational hospital chains',
      'Regional public healthcare networks',
      'Large non profit nursing home networks',
      'Independent private clinics',
      'Mid sized home healthcare groups',
    ]
  }
  if (flavour === 'technology') {
    return [
      'Global enterprise IT organisations',
      'Regional managed service providers',
      'Public sector technology departments',
      'High growth technology companies',
      'Mid market shared service centres',
    ]
  }
  if (flavour === 'energy') {
    return [
      'National utility operators',
      'Independent power producers',
      'Industrial energy consumers',
      'Engineering and EPC contractors',
      'Regional grid infrastructure operators',
    ]
  }
  return [
    'Multinational manufacturing groups',
    'Regional industrial operators',
    'Large distribution and trading networks',
    'Independent mid sized producers',
    'Public sector procurement bodies',
  ]
}

const DESIGNATIONS = [
  'Procurement Manager',
  'Purchasing Specialist',
  'Supply Chain Lead',
  'Category Manager',
  'Head of Operations',
  'Technical Evaluation Lead',
]

/**
 * The questionnaire, as section → questions. `subject` is the market and
 * `segmentType` the taxonomy the market is cut by, so the wording lands on
 * this market rather than reading as boilerplate.
 */
function questionnaire(subject: string, segmentType: string | null): BuyerSurveySegment[] {
  const s = subject.toLowerCase()
  const byType = segmentType ? ` by ${segmentType.toLowerCase()}` : ''

  const sections: { title: string; focus: string; questions: string[] }[] = [
    {
      title: 'Brand and Supplier Choice',
      focus: `Which suppliers buyers of ${s} actually procure from, and how settled those relationships are.`,
      questions: [
        `Which primary brand did your organisation procure most frequently for ${s} over the past year?`,
        `How many suppliers does your organisation currently hold active ${s} contracts with?`,
        `Has your organisation switched its primary ${s} supplier in the last 24 months?`,
        `Which factor most often triggers a review of your current ${s} supplier?`,
      ],
    },
    {
      title: 'Purchase Criteria',
      focus: `What buyers weigh when they compare ${s} offerings${byType}.`,
      questions: [
        `Which criterion carries the most weight when selecting a ${s} supplier?`,
        `How important is total cost of ownership relative to upfront price for ${s}?`,
        `Which product or service attribute most often rules a ${s} vendor out of consideration?`,
        `What level of technical support does your organisation expect bundled with ${s}?`,
      ],
    },
    {
      title: 'Procurement Process',
      focus: `How a ${s} purchase moves from need to signed contract.`,
      questions: [
        `Who holds final approval authority for ${s} purchases in your organisation?`,
        `How long does a typical ${s} procurement cycle take from requirement to contract?`,
        `Which procurement route does your organisation most often use for ${s}?`,
        `How frequently are ${s} contracts renegotiated or re-tendered?`,
      ],
    },
    {
      title: 'Spend and Outlook',
      focus: `Where ${s} budgets are heading over the next twelve months.`,
      questions: [
        `How is your organisation's ${s} budget expected to change over the next 12 months?`,
        `What share of your category spend currently goes to ${s}?`,
        `Which development would most increase your organisation's ${s} spend?`,
        `What is the single biggest barrier to expanding your ${s} procurement?`,
      ],
    },
  ]

  let counter = 0
  return sections.map((section, sectionIndex) => ({
    id: `demo-section-${sectionIndex + 1}`,
    title: section.title,
    focus: section.focus,
    questions: section.questions.map<BuyerSurveyQuestion>((text) => {
      counter += 1
      return {
        id: `Q${counter}`,
        text,
        type: 'single_select',
        chartType: null,
        // Empty by design: the view locks the chart and the takeaway.
        options: [],
        keyInsight: '',
        n: DEMO_SAMPLE_SIZE,
        confidence: null,
        sources: [],
      }
    }),
  }))
}

/**
 * Build the demo B2B survey for a market workbook. Returns null without data,
 * so the caller falls back to "no survey loaded".
 */
export function buildDemoBuyerSurvey(
  data: ComparisonData | null | undefined,
  dashboardName?: string | null
): BuyerSurveyReport | null {
  if (!data?.dimensions) return null

  const market = (dashboardName || data.metadata?.market_name || 'Market').trim()
  const subject = marketSubject(market)
  const flavour = marketFlavour(subject)
  const geo = data.dimensions.geographies?.all_geographies?.[0] || 'Global'
  const segmentType = Object.keys(data.dimensions.segments ?? {})[0] ?? null

  const buyers = buyerSegments(flavour)
  const segments = questionnaire(subject, segmentType)
  const questionCount = segments.reduce((sum, s) => sum + s.questions.length, 0)

  return {
    kind: 'b2b',
    industry: market,
    module: 'Voice of Customer (B2B)',
    geo,
    sector: subject,
    sampleSize: DEMO_SAMPLE_SIZE,
    analystName: '',
    analystTitle: '',
    sampleBreakdown: {},
    landscape: {
      definition: '',
      whoBuys: buyers.whoBuys,
      buyerSegments: buyers.segments,
      organisationsHeading: 'Organisations We Surveyed',
      organisations: organisations(flavour),
      designationsHeading: 'Designations We Spoke To',
      designations: DESIGNATIONS,
      respondentProfile: '',
    },
    methodology: {
      approach: `Structured interviews with verified ${subject.toLowerCase()} buyers, screened on category ownership and recent purchase activity.`,
      sampleSize: DEMO_SAMPLE_SIZE,
      geography: geo,
      module: 'Voice of Customer (B2B)',
      reportCovers: segments.map((s) => s.title),
      whoQualified: DESIGNATIONS,
      reportConfidence: '',
    },
    executiveSummary: null,
    segments,
    questionCount,
  }
}
