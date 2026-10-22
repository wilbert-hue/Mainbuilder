/**
 * A profile for a market no keyword list has heard of.
 *
 * The named industries cover the trades these dashboards see most, but the
 * world has more markets than any list, and falling back to heavy industry
 * made a headphone study survey engineering contractors. So an unrecognised
 * market is composed instead, from two things its name does tell us: who buys
 * it, and what kind of thing it is.
 *
 * The result is never as sharp as a named industry — it says "product quality
 * and consistency" where a spices profile says "residue compliance" — but it
 * is always about the right trade, which is what matters.
 */

import type { IndustryProfile, ScoringParameter } from '@/lib/industry-profiles'
import type { OfferingType } from '@/lib/demo-survey-offering'

const p = (name: string, definition: string): ScoringParameter => ({ name, definition })

/** Who ends up holding the thing: a shopper, or another business. */
export type Audience = 'consumer' | 'business'

/** Scoring parameters by what the market sells. */
const X_PARAMETERS: Record<OfferingType, ScoringParameter[]> = {
  Product: [
    p('Product Quality & Consistency', 'Consistency of what is delivered against specification, measured by defect rate and complaint history.'),
    p('Range Breadth & Variant Coverage', 'Spread across models, sizes and price tiers, and whether one supplier can cover the whole requirement.'),
    p('Manufacturing Capability & Capacity', 'Production capability behind the range, and the capacity to hold supply through a demand peak.'),
    p('Certification & Standards Compliance', 'Conformance with the product standards and approvals required in the markets covered.'),
    p('Design & New Product Development', 'Pace at which new models reach the market, and the design capability behind them.'),
  ],
  Equipment: [
    p('Performance Against Rated Specification', 'Output actually held under the buyer duty cycle, measured against the rating claimed.'),
    p('Reliability & Unplanned Downtime', 'Failure record in service and the production time lost to it.'),
    p('Safety Certification & Operator Protection', 'Machinery safety certification and operator protection under the applicable standards.'),
    p('Energy Efficiency & Running Cost', 'Energy and consumable cost across the service life of the machine.'),
    p('Service Network & Parts Availability', 'Coverage of service capability and the response time committed on breakdown.'),
  ],
  Service: [
    p('Expertise & Delivery Track Record', 'Depth of expertise in the work contracted, and the record of delivering it to scope.'),
    p('Coverage & Response Capability', 'Geographic and capacity coverage, and how quickly the provider responds when called.'),
    p('Service Levels & Contract Terms', 'What the agreement commits to, and the flexibility offered around scope and term.'),
    p('Compliance, Licensing & Credentials', 'Licences, accreditation and insurance held for the work being done.'),
    p('Quality Assurance & Issue Resolution', 'How quality is evidenced during delivery, and how problems are put right.'),
  ],
  'Material / Ingredient': [
    p('Purity & Specification Consistency', 'Conformance to specification and the variation seen across batches in the customer process.'),
    p('Technical Support & Application Fit', 'Support given while the material is qualified into the customer process.'),
    p('Regulatory & Safety Documentation', 'Registrations, safety data and restricted substance documentation for the markets supplied.'),
    p('Capacity & Supply Continuity', 'Installed capacity, second sourcing and the record of holding supply through disruption.'),
    p('Sustainability & Traceability', 'Origin traceability and environmental credentials, with the audit evidence behind them.'),
  ],
  Platform: [
    p('Security, Privacy & Compliance Posture', 'Certification, data handling and audit posture against the regimes the buyer answers to.'),
    p('Functional Depth & Module Coverage', 'How much of the process the platform covers without additional tools.'),
    p('Integration & Interoperability', 'Quality of the interfaces into the systems the buyer already runs.'),
    p('Implementation & Onboarding Support', 'Time to go live and the support available through implementation.'),
    p('Reliability, Uptime & Support', 'Availability record and the responsiveness of support against agreed levels.'),
  ],
  Technology: [
    p('Technical Maturity & Proven Deployments', 'How far the technology has moved beyond pilot, evidenced by deployments at scale.'),
    p('Accuracy & Performance in Operation', 'Performance held in live conditions against the standard the buyer sets.'),
    p('Integration with Existing Systems', 'How readily it fits the systems and workflows already in place.'),
    p('Security & Regulatory Clearance', 'Security posture and the clearances required where it is deployed.'),
    p('Technical Support & Upgrade Path', 'Support model and the route to future capability without replacement.'),
  ],
  System: [
    p('Architecture & Design Suitability', 'Fit of the design for the duty, environment and expansion the buyer plans.'),
    p('Reliability & System Availability', 'Availability held in operation and the failure modes seen.'),
    p('Compatibility with Installed Assets', 'How readily it works with what the buyer already operates.'),
    p('Compliance & Standards Conformity', 'Conformity with the codes and standards governing the installation.'),
    p('Lifecycle Support & Serviceability', 'Spares, support and the ease of maintaining it over the life of the asset.'),
  ],
  Solution: [
    p('Outcome Delivered Against Business Case', 'Whether the outcome bought was achieved, measured against the case made for it.'),
    p('Customisation & Fit to Process', 'How far the solution is shaped to the buyer process rather than the reverse.'),
    p('Implementation Expertise & Delivery', 'Capability to deliver the implementation to scope and schedule.'),
    p('Integration Across Systems & Teams', 'How well the parts work together across the systems and teams involved.'),
    p('Support Model & Commercial Terms', 'Ongoing support offered and the flexibility of the commercial arrangement.'),
  ],
}

/** Consumer markets are bought by the trade that resells them. */
const CONSUMER_TRADE: Omit<IndustryProfile, 'label' | 'xParameters'> = {
  customerBase: p('Retail & Channel Customer Base', 'Coverage across modern trade, specialty retail, ecommerce and institutional channels, and the shelf space held.'),
  triggerSignals: [
    'Category range review opened at a retail chain',
    'New store or outlet format rolling out',
    'Own label or exclusive line launched in the category',
    'Hiring category buyers or merchandisers for the category',
    'Entry into a new region or sales channel',
    'Supplier listing window opening with a major retailer',
  ],
  organisations: [
    'National retail and department store chains',
    'Specialty and category retail groups',
    'Ecommerce and quick commerce platforms',
    'Privately held wholesale distributors',
    'Institutional and corporate bulk buyers',
  ],
  designations: ['Category Buyer', 'Procurement Manager', 'Merchandising Manager', 'Product Manager', 'Supply Chain Lead', 'Quality Manager'],
  buyerSegments: ['Specialty and Electronics Retail', 'Supermarket and Department Stores', 'Ecommerce Platforms', 'Wholesale and Distribution', 'Institutional and Corporate Buyers', 'Brand and Private Label Owners'],
}

/** Business markets are bought by the organisations that use them. */
const BUSINESS_BUYERS: Record<OfferingType, Omit<IndustryProfile, 'label' | 'xParameters'>> = {
  Product: {
    customerBase: p('Manufacturer & Distributor Customer Base', 'Spread of manufacturing, assembly and distribution customers, and the depth of those accounts.'),
    triggerSignals: [
      'New line or facility announced that will need supply',
      'Volume growth outrunning current supplier capacity',
      'Quality escalation opening qualification of a second source',
      'Hiring procurement or quality roles for a new programme',
      'Standards change affecting the approved supplier list',
      'Supply contract approaching renewal or retender',
    ],
    organisations: ['Large multinational manufacturers', 'Mid sized regional producers', 'Contract manufacturers and assemblers', 'Specialist industrial distributors', 'Public sector procurement bodies'],
    designations: ['Procurement Manager', 'Quality Manager', 'Production Manager', 'Design Engineer', 'Supply Chain Lead', 'Sourcing Specialist'],
    buyerSegments: ['Manufacturing and Assembly', 'Contract Manufacturing', 'Industrial Distribution', 'Retail and Consumer Brands', 'Government and Public Agencies', 'Export and Trading'],
  },
  Equipment: {
    customerBase: p('Plant & Contractor Customer Base', 'Spread of plants, contractors and rental fleets operating the equipment.'),
    triggerSignals: [
      'New plant or line announced that will need the equipment',
      'Capacity expansion approved at an operating site',
      'Hiring maintenance or operations engineers to run it',
      'Safety inspection forcing replacement of ageing machines',
      'Fleet renewal cycle opening at an operator',
      'Capital budget released for equipment replacement',
    ],
    organisations: ['Large integrated operating groups', 'Mid sized regional operators', 'Equipment rental and leasing fleets', 'Engineering and maintenance contractors', 'Public sector infrastructure agencies'],
    designations: ['Procurement Manager', 'Maintenance Engineer', 'Plant Manager', 'Project Engineer', 'Operations Lead', 'Reliability Engineer'],
    buyerSegments: ['Manufacturing and Processing', 'Construction and Infrastructure', 'Logistics and Warehousing', 'Energy and Utilities', 'Equipment Rental', 'Government and Public Agencies'],
  },
  Service: {
    customerBase: p('Client Organisation Customer Base', 'Spread of client organisations under contract and the length of those engagements.'),
    triggerSignals: [
      'New site, route or asset added that needs the service',
      'Existing service contract approaching renewal or retender',
      'Hiring roles that manage or supervise the service',
      'Audit or inspection requiring documented compliance',
      'Budget approved to outsource work done in house',
      'Service failure putting the incumbent under review',
    ],
    organisations: ['Large multi site operating companies', 'Mid sized regional businesses', 'Public sector and municipal bodies', 'Asset owners and infrastructure operators', 'Managed service and facilities providers'],
    designations: ['Procurement Manager', 'Operations Lead', 'Contracts Manager', 'Facilities Manager', 'Project Engineer', 'Vendor Manager'],
    buyerSegments: ['Manufacturing and Industrial', 'Infrastructure and Utilities', 'Commercial Property and Facilities', 'Transport and Logistics', 'Government and Public Sector', 'Healthcare and Education'],
  },
  'Material / Ingredient': {
    customerBase: p('Formulator & Processor Customer Base', 'Breadth of formulators and processors qualified on the material.'),
    triggerSignals: [
      'New product line announced that needs the material',
      'Reformulation driven by a regulatory or label change',
      'Capacity expansion lifting consumption at a plant',
      'Hiring formulation or quality roles for a programme',
      'Second source qualification opened after a disruption',
      'Long term supply agreement approaching renewal',
    ],
    organisations: ['Multinational manufacturers and formulators', 'Mid sized processors and blenders', 'Contract manufacturing organisations', 'Specialty material distributors', 'Research and product development centres'],
    designations: ['Procurement Manager', 'Formulation Scientist', 'Quality Assurance Manager', 'Production Manager', 'Regulatory Affairs Specialist', 'Sourcing Specialist'],
    buyerSegments: ['Manufacturing and Formulation', 'Contract Manufacturing', 'Specialty Distribution', 'Consumer Goods Producers', 'Industrial Processing', 'Research and Development'],
  },
  Platform: {
    customerBase: p('Enterprise & Mid Market Customer Base', 'Spread of enterprise, mid market and public sector customers, and the renewal record.'),
    triggerSignals: [
      'Migration or modernisation programme announced',
      'Hiring technology or data roles tied to the platform area',
      'Security or compliance audit forcing a systems review',
      'Funding round or budget cycle releasing software spend',
      'Merger or new site expanding the user base',
      'Current licence approaching its renewal date',
    ],
    organisations: ['Large multinational enterprises', 'Mid market shared service centres', 'Regional managed service providers', 'Public sector technology departments', 'High growth technology companies'],
    designations: ['IT Manager', 'Product Owner', 'Procurement Manager', 'Solution Architect', 'Business Analyst', 'Information Security Manager'],
    buyerSegments: ['Banking and Financial Services', 'Manufacturing and Industrial', 'Retail and Ecommerce', 'Healthcare Providers', 'Government and Public Sector', 'Professional Services'],
  },
  Technology: {
    customerBase: p('Adopter & Integrator Customer Base', 'Spread of organisations that have adopted the technology and the partners deploying it.'),
    triggerSignals: [
      'Pilot or proof of concept started with the technology',
      'Hiring engineering or analytics roles tied to it',
      'Regulatory or reporting change that it is needed to meet',
      'Funding or grant secured for a programme using it',
      'Partnership announced that brings it into the operation',
      'Ageing installed technology reaching end of support',
    ],
    organisations: ['Large multinational enterprises', 'Technology led mid sized firms', 'Public sector innovation programmes', 'Systems integrators and consultancies', 'Research and development centres'],
    designations: ['Technology Manager', 'Procurement Manager', 'Solution Architect', 'Operations Lead', 'Data Manager', 'Project Engineer'],
    buyerSegments: ['Manufacturing and Industrial', 'Financial Services', 'Healthcare and Life Sciences', 'Government and Public Sector', 'Energy and Utilities', 'Transport and Logistics'],
  },
  System: {
    customerBase: p('Operator & Contractor Customer Base', 'Spread of operators and contractors running the installed systems.'),
    triggerSignals: [
      'New facility being built that needs the system installed',
      'Modernisation of ageing installed systems approved',
      'Hiring project or commissioning engineers',
      'Compliance deadline the current system cannot meet',
      'Contract awarded for works that include the system',
      'Capital plan published naming the upgrade',
    ],
    organisations: ['Large integrated operating groups', 'Infrastructure and facility owners', 'Engineering and systems contractors', 'Public sector infrastructure agencies', 'Industrial site operators'],
    designations: ['Project Engineer', 'Procurement Manager', 'Systems Engineer', 'Maintenance Manager', 'Operations Lead', 'Commissioning Engineer'],
    buyerSegments: ['Manufacturing and Processing', 'Infrastructure and Utilities', 'Commercial Buildings', 'Transport and Logistics', 'Government and Public Agencies', 'Engineering Contractors'],
  },
  Solution: {
    customerBase: p('Programme & Enterprise Customer Base', 'Spread of organisations running the solution and the scale of those programmes.'),
    triggerSignals: [
      'Programme announced to deliver the outcome it is bought for',
      'Hiring programme or transformation roles',
      'Existing contract approaching renewal',
      'Expansion into a new site or region extending scope',
      'Audit or compliance change the current approach cannot satisfy',
      'Capital approval released for a rollout',
    ],
    organisations: ['Large multinational enterprises', 'Mid sized operating companies', 'Public sector programme offices', 'Systems integrators and consultancies', 'Infrastructure and asset owners'],
    designations: ['Programme Manager', 'Procurement Manager', 'Solution Architect', 'Operations Lead', 'Transformation Lead', 'Project Engineer'],
    buyerSegments: ['Manufacturing and Industrial', 'Financial Services', 'Government and Public Sector', 'Energy and Utilities', 'Healthcare Providers', 'Transport and Logistics'],
  },
}

/**
 * Build a profile for a market the keyword list does not name, from who buys
 * it and what kind of thing it is.
 */
export function composeProfile(
  subject: string,
  audience: Audience,
  offering: OfferingType
): IndustryProfile {
  const base = audience === 'consumer' ? CONSUMER_TRADE : BUSINESS_BUYERS[offering]
  return {
    label: subject.toLowerCase(),
    xParameters: X_PARAMETERS[offering],
    ...base,
  }
}
