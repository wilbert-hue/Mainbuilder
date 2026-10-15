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
import { marketScopeLabel, stripScopePrefix } from '@/lib/market-scope'
import type {
  BuyerSegment,
  BuyerSurveyQuestion,
  BuyerSurveyReport,
  BuyerSurveySegment,
} from '@/lib/buyer-survey-types'

/** Respondent count quoted on the title card and every question header. */
const DEMO_SAMPLE_SIZE = 120

/** "Brazil Advance Wound Care Market" → "Advance Wound Care". */
function marketSubject(market: string): string {
  let subject = stripScopePrefix(market)
  for (;;) {
    const next = subject.replace(/\s*(industry|market|analysis|report)\s*$/i, '').trim()
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

/** Consumer-side job titles do not apply; a B2C panel is profiled instead. */
const B2C_RESPONDENT_PROFILE = [
  'Primary household purchase decision maker',
  'Joint decision maker with a partner',
  'Buys for personal use only',
  'Buys on behalf of a dependent or family member',
  'First-time category buyer in the last 12 months',
  'Repeat buyer across multiple brands',
]

/** Who the consumer respondents are, by household rather than by firm. */
const B2C_HOUSEHOLDS = [
  'Urban single-person households',
  'Young families with children at home',
  'Dual-income households without children',
  'Multi-generational households',
  'Retired and empty-nest households',
]

/**
 * The B2C questionnaire: one shopper answering for themselves, so it asks
 * about habit, price sensitivity and where they buy — not contracts, budgets
 * or approval authority, which no consumer has.
 */
function consumerQuestionnaire(subject: string, segmentType: string | null): BuyerSurveySegment[] {
  const s = subject.toLowerCase()
  const byType = segmentType ? ` by ${segmentType.toLowerCase()}` : ''

  return buildSections(
    [
      {
        title: 'Brand Choice and Loyalty',
        focus: `Which ${s} brands shoppers actually buy, and how readily they switch.`,
        questions: [
          `Which ${s} brand did you purchase most recently?`,
          `How long have you been buying your current ${s} brand?`,
          `How likely are you to switch ${s} brand on your next purchase?`,
          `What would most often make you try a different ${s} brand?`,
        ],
      },
      {
        title: 'Purchase Drivers',
        focus: `What a shopper weighs in the aisle when comparing ${s}${byType}.`,
        questions: [
          `Which factor matters most when you choose a ${s} product?`,
          `How much does price influence your ${s} purchase decision?`,
          `Which claim on the packaging most influences your ${s} choice?`,
          `Would you pay more for a premium or improved ${s} product?`,
        ],
      },
      {
        title: 'Where and How You Buy',
        focus: `The channels and occasions behind a ${s} purchase.`,
        questions: [
          `Where do you most often buy ${s}?`,
          `How often do you purchase ${s}?`,
          `Do you research ${s} online before buying in store?`,
          `Which promotion type most often prompts you to buy ${s}?`,
        ],
      },
      {
        title: 'Experience and Outlook',
        focus: `Satisfaction with ${s} today, and intent over the year ahead.`,
        questions: [
          `How satisfied are you with the ${s} product you currently use?`,
          `Would you recommend your current ${s} brand to family or friends?`,
          `Do you expect to spend more or less on ${s} over the next 12 months?`,
          `What would most improve your experience of buying ${s}?`,
        ],
      },
    ],
    'single_select'
  )
}

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

  return buildSections(sections, 'single_select')
}

/** Number the questions across the whole report and leave the answers empty. */
function buildSections(
  sections: { title: string; focus: string; questions: string[] }[],
  type: string
): BuyerSurveySegment[] {
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
        type,
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

/** Who buys, when the buyer is a shopper rather than a firm. */
function consumerSegments(subject: string): { whoBuys: string; segments: BuyerSegment[] } {
  return {
    whoBuys: `Individual shoppers who have bought ${subject.toLowerCase()} for themselves or their household in the last 12 months, screened on category purchase and decision-making role.`,
    segments: [
      { name: 'Regular Category Buyers', description: '' },
      { name: 'Occasional and Seasonal Buyers', description: '' },
      { name: 'First-Time Buyers', description: '' },
      { name: 'Premium and Brand-Led Buyers', description: '' },
    ],
  }
}

/**
 * Build the demo buyer survey for a market.
 *
 * A workbook is not required — the market name carries the questionnaire — so
 * a dashboard can be this survey and nothing else. The B2C variant asks a
 * shopper about habit, price and channel; the B2B one asks a firm about
 * contracts, budget and approval. Returns null only when there is no market
 * to name.
 */
export function buildDemoBuyerSurvey(
  data: ComparisonData | null | undefined,
  dashboardName?: string | null,
  kind: 'b2b' | 'b2c' = 'b2b'
): BuyerSurveyReport | null {
  const market = (dashboardName || data?.metadata?.market_name || '').trim()
  if (!market) return null

  const subject = marketSubject(market)
  const flavour = marketFlavour(subject)
  const geo = data?.dimensions?.geographies?.all_geographies?.[0] || marketScopeLabel(market)
  const segmentType = Object.keys(data?.dimensions?.segments ?? {})[0] ?? null

  const isConsumer = kind === 'b2c'
  const buyers = isConsumer ? consumerSegments(subject) : buyerSegments(flavour)
  const segments = isConsumer
    ? consumerQuestionnaire(subject, segmentType)
    : questionnaire(subject, segmentType)
  const questionCount = segments.reduce((sum, s) => sum + s.questions.length, 0)
  const module = isConsumer ? 'Voice of Customer (B2C)' : 'Voice of Customer (B2B)'

  return {
    kind,
    industry: market,
    module,
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
      organisationsHeading: isConsumer ? 'Households We Surveyed' : 'Organisations We Surveyed',
      organisations: isConsumer ? B2C_HOUSEHOLDS : organisations(flavour),
      designationsHeading: isConsumer ? 'Who We Spoke To' : 'Designations We Spoke To',
      designations: isConsumer ? B2C_RESPONDENT_PROFILE : DESIGNATIONS,
      respondentProfile: '',
    },
    methodology: {
      approach: isConsumer
        ? `An online panel of verified ${subject.toLowerCase()} shoppers, screened on category purchase in the last 12 months and on their role in the household decision.`
        : `Structured interviews with verified ${subject.toLowerCase()} buyers, screened on category ownership and recent purchase activity.`,
      sampleSize: DEMO_SAMPLE_SIZE,
      geography: geo,
      module,
      reportCovers: segments.map((s) => s.title),
      whoQualified: isConsumer ? B2C_RESPONDENT_PROFILE : DESIGNATIONS,
      reportConfidence: '',
    },
    executiveSummary: null,
    segments,
    questionCount,
  }
}
