/**
 * The buyer landscape and methodology blocks of a demo survey.
 *
 * Written to the CMI rules:
 *   buyer segments        4 to 7 industries or end user groups that buy
 *   organisations         4 to 6 kinds of buying organisation, each qualified
 *                         by size, ownership or business model, never a repeat
 *                         of a segment and never a company name
 *   designations          5 or 6 working and mid level titles, never CEO or MD
 *   report confidence     names public sources; never interviews, dates,
 *                         fieldwork, margin of error or market share
 *
 * B2B respondents are always organisations. The consumer variant instead
 * describes who took part and the four behavioural profiles the guide asks for.
 */

import type { MarketFlavour } from '@/lib/market-flavour'
import type { OfferingType } from '@/lib/demo-survey-offering'

export interface LandscapeCopy {
  definition: string
  whoBuys: string
  /** Industries and end user groups that buy. */
  segments: { name: string; description: string }[]
  /** Kinds of buying organisation, qualified by size, ownership or model. */
  organisations: string[]
  /** Working and mid level job titles. */
  designations: string[]
}

/** Industries that buy, by what kind of market it is. */
const SEGMENTS: Record<MarketFlavour, string[]> = {
  healthcare: [
    'Hospitals and Health Systems',
    'Specialty Clinics',
    'Diagnostic Laboratories',
    'Long Term Care Providers',
    'Pharmaceutical Manufacturers',
    'Medical Distributors',
  ],
  technology: [
    'Cloud and Hyperscale Operators',
    'Telecommunications and Networks',
    'Banking and Financial Services',
    'Manufacturing and Industrial',
    'Government and Public Sector',
    'Healthcare and Life Sciences',
  ],
  energy: [
    'Electric Utilities',
    'Renewable Energy Operators',
    'Oil and Gas Operators',
    'Engineering Procurement Construction Firms',
    'Industrial Energy Consumers',
    'Government Power Agencies',
  ],
  consumer: [
    'Supermarket and Grocery Retail',
    'Specialty and Convenience Retail',
    'Hotels Restaurants and Catering',
    'Wholesale and Distribution',
    'Ecommerce and Quick Commerce',
    'Contract Manufacturers',
  ],
  industrial: [
    'Manufacturing and Processing',
    'Construction and Infrastructure',
    'Transport and Logistics',
    'Mining and Metals',
    'Agriculture and Food Processing',
    'Government and Public Agencies',
  ],
}

/**
 * Kinds of buying organisation. Each carries a size, ownership or business
 * model qualifier, so none of them simply restates a segment above.
 */
const ORGANISATIONS: Record<MarketFlavour, string[]> = {
  healthcare: [
    'Multi site private hospital groups',
    'State run tertiary care hospitals',
    'Mid sized single speciality chains',
    'Independent diagnostic chains',
    'Contract manufacturing organisations',
  ],
  technology: [
    'Large multinational enterprises',
    'Mid market shared service centres',
    'Regional managed service providers',
    'State owned telecom operators',
    'Government technology agencies',
  ],
  energy: [
    'State owned transmission utilities',
    'Private power distribution licensees',
    'Renewable energy independent power producers',
    'Large thermal and hydro generation utilities',
    'Mid sized engineering contractors',
  ],
  consumer: [
    'National supermarket chains',
    'Regional convenience retail groups',
    'Privately held wholesale distributors',
    'Quick commerce platforms',
    'Mid sized contract packers',
  ],
  industrial: [
    'Large integrated manufacturing groups',
    'Mid sized regional processors',
    'Privately held engineering contractors',
    'Public sector infrastructure agencies',
    'Independent distribution businesses',
  ],
}

/** Mid level titles that really do the buying, by offering type. */
const DESIGNATIONS: Record<OfferingType, string[]> = {
  Product: ['Procurement Manager', 'Category Manager', 'Sourcing Specialist', 'Quality Manager', 'Supply Chain Manager', 'Operations Lead'],
  Technology: ['IT Manager', 'Digital Transformation Lead', 'Procurement Manager', 'Solution Architect', 'Operations Lead', 'Information Security Manager'],
  'Material / Ingredient': ['Procurement Manager', 'Formulation Scientist', 'Quality Assurance Manager', 'Production Manager', 'Regulatory Affairs Specialist', 'Sourcing Specialist'],
  Service: ['Procurement Manager', 'Operations Lead', 'Contracts Manager', 'Maintenance Engineer', 'Project Engineer', 'Vendor Manager'],
  Equipment: ['Procurement Manager', 'Maintenance Engineer', 'Plant Manager', 'Project Engineer', 'Operations Lead', 'Technical Services Manager'],
  Platform: ['IT Manager', 'Product Owner', 'Procurement Manager', 'Systems Administrator', 'Digital Transformation Lead', 'Business Analyst'],
  System: ['Project Engineer', 'Procurement Manager', 'Systems Engineer', 'Maintenance Manager', 'Operations Lead', 'Commissioning Engineer'],
  Solution: ['Procurement Manager', 'Infrastructure Manager', 'Programme Manager', 'Solution Architect', 'Operations Lead', 'Facilities Engineer'],
}

/** The functions that decide, named in the "who buys" line. */
const DECISION_MAKERS: Record<OfferingType, string> = {
  Product: 'procurement, quality and operations teams',
  Technology: 'technology, security and procurement teams',
  'Material / Ingredient': 'procurement, formulation and quality teams',
  Service: 'procurement, operations and contracts teams',
  Equipment: 'engineering, maintenance and procurement teams',
  Platform: 'technology, product and procurement teams',
  System: 'engineering, projects and procurement teams',
  Solution: 'infrastructure, programme and procurement teams',
}

/** What the offering is called in a sentence. */
const NOUN: Record<OfferingType, string> = {
  Product: 'products',
  Technology: 'technology',
  'Material / Ingredient': 'ingredient supply',
  Service: 'services',
  Equipment: 'equipment',
  Platform: 'platforms',
  System: 'systems',
  Solution: 'solutions',
}

export function buildLandscape(
  subject: string,
  geo: string,
  flavour: MarketFlavour,
  offering: OfferingType
): LandscapeCopy {
  const lower = subject.toLowerCase()
  const where = /^global$/i.test(geo.trim()) ? 'worldwide' : `across ${geo}`

  return {
    definition: `Organisations that buy ${lower} ${NOUN[offering]} ${where} for their own operations.`,
    whoBuys: `${capitalise(DECISION_MAKERS[offering])} that specify, approve and contract ${lower} for their organisation.`,
    segments: SEGMENTS[flavour].slice(0, 6).map((name) => ({ name, description: '' })),
    organisations: ORGANISATIONS[flavour],
    designations: DESIGNATIONS[offering],
  }
}

/** Public sources the figures were checked against, named for the geography. */
export function reportConfidence(subject: string, geo: string): string {
  const lower = subject.toLowerCase()
  const isGlobal = /^global$/i.test(geo.trim())
  const sources = isGlobal
    ? 'international trade statistics, company annual reports and regulator filings'
    : `${geo} regulator databases, national trade statistics and company annual reports`
  return `Figures reported for ${lower} were cross checked against ${sources}.`
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

// ── Consumer side ───────────────────────────────────────────────────────────

/** The four behavioural profiles the consumer guide asks for. */
export function consumerProfiles(subject: string): { name: string; description: string }[] {
  const lower = subject.toLowerCase()
  return [
    {
      name: 'Value Led Buyer',
      description: `Compares prices closely and buys the ${lower} that keeps the monthly budget steady.`,
    },
    {
      name: 'Brand Loyalist',
      description: `Sticks with one brand of ${lower} and rarely looks at the alternatives.`,
    },
    {
      name: 'Quality Seeker',
      description: `Pays more for ${lower} that performs consistently and reads the label before buying.`,
    },
    {
      name: 'Convenience Shopper',
      description: `Buys ${lower} wherever it is quickest, online or at the nearest store.`,
    },
  ]
}

/** Who took part: who they are, never how or when they were reached. */
export function consumerRespondents(subject: string, geo: string): string[] {
  const lower = subject.toLowerCase()
  const place = /^global$/i.test(geo.trim()) ? 'across the markets covered' : `in ${geo}`
  return [
    `Adults aged 25 to 60 who buy ${lower} ${place}`,
    'Buyers who decide, or share the decision, for their household',
    `Buyers of both branded and unbranded ${lower}`,
    'Buyers across urban and semi urban areas',
  ]
}
