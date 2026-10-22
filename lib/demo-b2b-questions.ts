/**
 * The B2B demo questionnaire: 4 sections of 6 questions, written to the CMI
 * framework's rules.
 *
 *   section 1  buying and suppliers      (opens with the brand choice)
 *   section 2  adoption and use          (brand choice on named parameters)
 *   section 3  performance and value     (experience with the chosen brand)
 *   section 4  future                    (all future or conditional tense)
 *
 * Each offering type has mandatory themes per section; the phrasings below are
 * keyed by theme, so a market only ever gets questions for the themes its own
 * type carries. Rules kept deliberately: one idea per question, closed, no
 * yes/no, no "how often" alone, no calendar years, no hyphens, digits for
 * numbers, and the answers never shown inside the question.
 */

import type { OfferingType } from '@/lib/demo-survey-offering'
import { industryProfile } from '@/lib/industry-profiles'

/** Themes each offering type must cover, in section order. */
const THEMES: Record<OfferingType, [string[], string[], string[], string[]]> = {
  Product: [
    ['brand', 'quality', 'price', 'certifications', 'channel', 'supplyReliability'],
    ['brandParameters', 'application', 'usagePattern', 'format', 'repeatPurchase', 'specifications'],
    ['brandExperience', 'qualityConsistency', 'defects', 'durability', 'roi', 'warranty'],
    ['futureDemand', 'newApplications', 'upgrades', 'pricingOutlook', 'purchasePlans', 'sustainability'],
  ],
  Technology: [
    ['brand', 'technicalMaturity', 'interoperability', 'cybersecurity', 'scalability', 'technicalSupport'],
    ['brandParameters', 'adoptionStage', 'useCases', 'deploymentEnvironment', 'adoptionBarriers', 'integration'],
    ['brandExperience', 'reliability', 'accuracy', 'integrationEase', 'roi', 'upgradePerformance'],
    ['futureTechnology', 'innovationPipeline', 'replacementCycle', 'emergingUseCases', 'investmentIntent', 'rndPriorities'],
  ],
  'Material / Ingredient': [
    ['brand', 'purity', 'batchConsistency', 'supplyContinuity', 'regulatoryDocuments', 'traceability'],
    ['brandParameters', 'formulationRole', 'dosage', 'substitution', 'regulatoryUse', 'formulationCompatibility'],
    ['brandExperience', 'functionalPerformance', 'stability', 'batchVariation', 'costInUse', 'yield'],
    ['newFormulations', 'alternativeInputs', 'cleanLabel', 'capacityExpansion', 'rndInvestment', 'functionalInnovation'],
  ],
  Service: [
    ['provider', 'expertise', 'credentials', 'sla', 'contractFlexibility', 'coverage'],
    ['providerParameters', 'serviceScope', 'engagementDrivers', 'deliveryModel', 'userJourney', 'dependency'],
    ['providerExperience', 'serviceQuality', 'responsiveness', 'issueResolution', 'roi', 'slaCompliance'],
    ['futureRequirements', 'digitisation', 'automation', 'outsourcing', 'capabilityInvestment', 'deliveryModels'],
  ],
  Equipment: [
    ['brand', 'performanceSpecs', 'totalCost', 'safetyCertification', 'spareParts', 'installation'],
    ['brandParameters', 'deployment', 'utilisation', 'capacity', 'operatingEnvironment', 'workflowFit'],
    ['brandExperience', 'availability', 'downtime', 'maintenanceCost', 'payback', 'assetLife'],
    ['capacityExpansion', 'automation', 'nextGeneration', 'replacementPlans', 'capex', 'retrofit'],
  ],
  Platform: [
    ['brand', 'security', 'functionality', 'interoperability', 'vendorReputation', 'implementation'],
    ['brandParameters', 'userGroups', 'modulesUsed', 'accessPattern', 'integration', 'engagement'],
    ['brandExperience', 'uptime', 'usability', 'customerSupport', 'businessValue', 'integrationPerformance'],
    ['newModules', 'analytics', 'ecosystem', 'subscriptionEvolution', 'investmentIntent', 'integrationNeeds'],
  ],
  System: [
    ['brand', 'architecture', 'reliability', 'compliance', 'lifecycleSupport', 'compatibility'],
    ['brandParameters', 'deployment', 'functionalUse', 'infrastructure', 'interoperability', 'dependency'],
    ['brandExperience', 'systemAvailability', 'throughput', 'lifecycleCost', 'roi', 'maintainability'],
    ['capacityExpansion', 'modernisation', 'nextGeneration', 'replacementPlans', 'capex', 'integrationNeeds'],
  ],
  Solution: [
    ['brand', 'outcomeCapability', 'customisation', 'implementationExpertise', 'supportModel', 'commercialFlexibility'],
    ['brandParameters', 'useCase', 'businessProcess', 'problemAddressed', 'workflowIntegration', 'implementationScope'],
    ['brandExperience', 'outcomesAchieved', 'implementationSuccess', 'measurableBenefits', 'totalValue', 'scaledInService'],
    ['futureDemand', 'innovationPipeline', 'expansionScope', 'replacementPlans', 'investmentIntent', 'integrationNeeds'],
  ],
}

/** Questions asked in each section. */
const QUESTIONS_PER_SECTION = 5

type Phrase = (subject: string, geo: string) => string

/**
 * One phrasing per theme. `subject` is the market without its geography, so a
 * question reads "for antioxidants", never "for global antioxidants market".
 */
const PHRASING: Record<string, Phrase> = {
  // ── Section 1: buying and suppliers ──
  brand: (s) => `Which brand did your organisation choose for its ${s} purchase?`,
  provider: (s) => `Which service provider did your organisation choose for ${s}?`,
  quality: (s) => `Which quality requirement mattered most when approving a ${s} supplier?`,
  price: (s) => `How did price weigh against technical fit in your ${s} decision?`,
  certifications: (s) => `Which certification did your organisation require before approving a ${s} supplier?`,
  channel: (s) => `Through which channel does your organisation buy ${s}?`,
  supplyReliability: (s) => `How did your organisation judge supplier reliability before awarding the ${s} contract?`,
  technicalMaturity: (s) => `What level of technical maturity did your organisation require from a ${s} vendor?`,
  interoperability: (s) => `Which interoperability requirement shaped your ${s} vendor shortlist?`,
  cybersecurity: (s) => `Which security requirement did your organisation weigh most in ${s} vendor selection?`,
  scalability: (s) => `How far did expected growth in demand shape your choice of ${s} vendor?`,
  scaledInService: (s) => `How well has ${s} scaled as demand on it grew?`,
  technicalSupport: (s) => `What level of technical support was mandatory in your ${s} contract?`,
  purity: (s) => `Which purity specification did your organisation set for ${s}?`,
  batchConsistency: (s) => `How did your organisation verify batch consistency before approving a ${s} supplier?`,
  traceability: (s) => `What traceability evidence did your organisation require from a ${s} supplier?`,
  regulatoryDocuments: (s) => `Which regulatory documentation decided whether a ${s} supplier qualified?`,
  supplyContinuity: (s) => `How does your organisation secure continuity of ${s} supply?`,
  expertise: (s) => `Which area of expertise mattered most when selecting a ${s} provider?`,
  credentials: (s) => `Which credential did your organisation verify before appointing a ${s} provider?`,
  coverage: (s, geo) => `How much weight did geographic coverage across ${geo} carry in your ${s} decision?`,
  contractFlexibility: (s) => `How did your chosen ${s} provider show commercial flexibility during negotiation?`,
  sla: (s) => `Which service level term was mandatory in your ${s} contract?`,
  performanceSpecs: (s) => `Which performance specification decided your ${s} purchase?`,
  totalCost: (s) => `How did total cost of ownership weigh against purchase price for ${s}?`,
  installation: (s) => `What installation capability did your organisation require from a ${s} supplier?`,
  safetyCertification: (s) => `Which safety certification was mandatory for your ${s} purchase?`,
  spareParts: (s) => `How did spare parts availability shape your choice of ${s} supplier?`,
  security: (s) => `Which security requirement did your organisation weigh most when selecting a ${s} platform?`,
  functionality: (s) => `Which capability gap decided your ${s} platform choice?`,
  vendorReputation: (s) => `How did vendor track record shape your ${s} shortlist?`,
  implementation: (s) => `What implementation capability did your organisation require from a ${s} vendor?`,
  architecture: (s) => `Which architecture requirement shaped your ${s} specification?`,
  reliability: (s) => `What reliability standard did your organisation set for ${s}?`,
  compatibility: (s) => `How did compatibility with installed assets shape your ${s} choice?`,
  compliance: (s) => `Which compliance requirement did a ${s} supplier have to meet?`,
  lifecycleSupport: (s) => `What lifecycle support did your organisation require with ${s}?`,
  outcomeCapability: (s) => `Which outcome capability most influenced your final ${s} vendor choice?`,
  customisation: (s) => `What level of customisation did your chosen ${s} supplier provide?`,
  implementationExpertise: (s) => `Which criterion was most critical when assessing ${s} implementation expertise?`,
  supportModel: (s) => `Which support model did your organisation require with ${s}?`,
  commercialFlexibility: (s) => `How did commercial terms shape your final ${s} vendor choice?`,

  // ── Section 2: adoption and use ──
  brandParameters: (s) =>
    `Based on price, delivery time and after sales support, which brand did your organisation choose for ${s}?`,
  providerParameters: (s) =>
    `Based on responsiveness, coverage and cost, which provider does your organisation use for ${s}?`,
  application: (s) => `In which application does your organisation mainly use ${s}?`,
  usagePattern: (s) => `What mainly drives how much ${s} your organisation consumes?`,
  format: (s) => `Which pack or format does your organisation buy ${s} in?`,
  repeatPurchase: (s) => `What mainly decides whether your organisation reorders the same ${s} supplier?`,
  specifications: (s) => `Which specification does your organisation standardise on for ${s}?`,
  adoptionStage: (s) => `At what stage of adoption is ${s} within your organisation?`,
  useCases: (s) => `Which use case delivered the clearest case for adopting ${s}?`,
  deploymentEnvironment: (s) => `In which operating environment is your ${s} deployed?`,
  integration: (s) => `Which integration requirement shaped how your organisation deployed ${s}?`,
  adoptionBarriers: (s) => `What has most held back wider adoption of ${s} in your organisation?`,
  formulationRole: (s) => `What role does ${s} play in your formulation?`,
  dosage: (s) => `What mainly determines the dosage of ${s} your organisation uses?`,
  substitution: (s) => `What would most often lead your organisation to substitute ${s}?`,
  formulationCompatibility: (s) => `Which compatibility constraint shapes your use of ${s}?`,
  regulatoryUse: (s) => `Which regulatory requirement governs how your organisation uses ${s}?`,
  serviceScope: (s) => `Which part of the ${s} scope does your organisation outsource?`,
  engagementDrivers: (s) => `What mainly drives how frequently your organisation engages a ${s} provider?`,
  deliveryModel: (s) => `Which delivery model does your organisation use for ${s}?`,
  userJourney: (s) => `Which team inside your organisation owns the ${s} engagement?`,
  dependency: (s) => `How dependent is your operation on uninterrupted ${s}?`,
  deployment: (s) => `Where in your operation is ${s} deployed?`,
  utilisation: (s) => `What share of available capacity does your ${s} run at?`,
  capacity: (s) => `Which capacity rating does your organisation standardise on for ${s}?`,
  operatingEnvironment: (s) => `Which operating condition most constrains your ${s}?`,
  workflowFit: (s) => `How well does ${s} fit the workflow it was bought for?`,
  userGroups: (s) => `Which team uses your ${s} platform most?`,
  modulesUsed: (s) => `Which module of your ${s} platform carries the most work?`,
  accessPattern: (s) => `What mainly drives how heavily your teams use ${s}?`,
  engagement: (s) => `What has most improved user engagement with your ${s}?`,
  functionalUse: (s) => `Which function of your ${s} is used most?`,
  infrastructure: (s) => `Which infrastructure constraint shapes your ${s} deployment?`,
  useCase: (s) => `Which business outcome is your ${s} deployed to deliver?`,
  businessProcess: (s) => `Which business process does your ${s} support?`,
  implementationScope: (s) => `How wide was the implementation scope of your ${s}?`,
  workflowIntegration: (s) => `Which workflow did your ${s} have to integrate with?`,
  problemAddressed: (s) => `Which operating problem did your organisation adopt ${s} to solve?`,

  // ── Section 3: performance and value ──
  brandExperience: (s) => `How would you rate your overall experience with the ${s} brand you chose?`,
  providerExperience: (s) => `How would you rate your overall experience with the ${s} provider you chose?`,
  qualityConsistency: (s) => `How consistent has the quality of your ${s} been across deliveries?`,
  defects: (s) => `What has been the main quality issue your organisation has seen with ${s}?`,
  durability: (s) => `How has ${s} held up against the service life your organisation expected?`,
  warranty: (s) => `How well did warranty cover the issues your organisation raised on ${s}?`,
  roi: (s) => `What return has your organisation seen against what it spent on ${s}?`,
  accuracy: (s) => `How accurate has your ${s} proved against the standard your organisation set?`,
  integrationEase: (s) => `How smoothly did ${s} integrate with the systems already in place?`,
  upgradePerformance: (s) => `How well have ${s} upgrades performed since deployment?`,
  functionalPerformance: (s) => `How has ${s} performed against the functional target set for it?`,
  stability: (s) => `How stable has ${s} proved through your processing conditions?`,
  batchVariation: (s) => `What batch to batch variation has your organisation seen in ${s}?`,
  yield: (s) => `What effect has ${s} had on your process yield?`,
  costInUse: (s) => `How has the cost in use of ${s} compared with the alternative considered?`,
  serviceQuality: (s) => `How has the quality of your ${s} compared with what was contracted?`,
  responsiveness: (s) => `How quickly has your ${s} provider responded when problems arose?`,
  slaCompliance: (s) => `How closely has your ${s} provider met its agreed service levels?`,
  issueResolution: (s) => `How well were the issues your organisation raised on ${s} resolved?`,
  availability: (s) => `What availability has your ${s} delivered in service?`,
  downtime: (s) => `What has been the main cause of unplanned downtime on your ${s}?`,
  maintenanceCost: (s) => `How has the maintenance cost of ${s} compared with the budget set?`,
  assetLife: (s) => `How does the service life of your ${s} compare with the expectation at purchase?`,
  payback: (s) => `How does the payback on your ${s} compare with the case made for it?`,
  uptime: (s) => `What uptime has your ${s} platform delivered?`,
  usability: (s) => `How easily have your teams worked with ${s} without support?`,
  integrationPerformance: (s) => `How well has ${s} held up where it connects to other systems?`,
  customerSupport: (s) => `How has vendor support performed on your ${s}?`,
  businessValue: (s) => `What business value has ${s} delivered against the case made for it?`,
  systemAvailability: (s) => `What availability has your ${s} held in operation?`,
  throughput: (s) => `How has the throughput of your ${s} compared with its rating?`,
  maintainability: (s) => `How straightforward has your ${s} been to maintain in service?`,
  lifecycleCost: (s) => `How has the lifecycle cost of ${s} tracked against plan?`,
  outcomesAchieved: (s) => `How far has ${s} delivered the outcome it was bought for?`,
  implementationSuccess: (s) => `How closely did the ${s} implementation run to plan?`,
  measurableBenefits: (s) => `Which measurable benefit from ${s} has been clearest?`,
  totalValue: (s) => `What total value has ${s} returned against its cost?`,

  // ── Section 4: future (future or conditional tense only) ──
  futureDemand: (s) => `How will your organisation's demand for ${s} change over the next 3 years?`,
  newApplications: (s) => `Which new application would lead your organisation to buy more ${s}?`,
  upgrades: (s) => `Which improvement would most influence your next ${s} purchase?`,
  sustainability: (s) => `Which sustainability requirement will your organisation apply to future ${s} purchases?`,
  pricingOutlook: (s) => `How would a sustained rise in ${s} prices change your sourcing plan?`,
  purchasePlans: (s) => `What share of your budget will go to ${s} in the next purchase cycle?`,
  futureTechnology: (s) => `Which next generation capability would most influence your next ${s} decision?`,
  innovationPipeline: (s) => `Which innovation would your organisation most want from ${s} suppliers?`,
  replacementCycle: (s) => `What will mainly drive the timing of your next ${s} replacement?`,
  emergingUseCases: (s) => `Which emerging use case will your organisation extend ${s} into?`,
  rndPriorities: (s) => `Which development priority would your organisation want a ${s} partner to pursue?`,
  investmentIntent: (s) => `How will your organisation's investment in ${s} change over the next 3 years?`,
  newFormulations: (s) => `Which reformulation would change how much ${s} your organisation buys?`,
  alternativeInputs: (s) => `Which alternative input would your organisation trial against ${s}?`,
  cleanLabel: (s) => `How will cleaner label expectations shape your future use of ${s}?`,
  functionalInnovation: (s) => `Which functional improvement in ${s} would your organisation pay more for?`,
  capacityExpansion: (s) => `How will planned capacity changes affect your ${s} requirement?`,
  rndInvestment: (s) => `How much development work would your organisation commit to new ${s} grades?`,
  futureRequirements: (s) => `Which new requirement will your organisation set for ${s} providers?`,
  digitisation: (s) => `Which digital capability would you expect from a future ${s} provider?`,
  automation: (s) => `How would greater automation change what your organisation buys in ${s}?`,
  deliveryModels: (s) => `Which delivery model would your organisation prefer for future ${s}?`,
  outsourcing: (s) => `How much of your ${s} work will your organisation outsource in future?`,
  capabilityInvestment: (s) => `Which capability will your organisation invest in to support ${s}?`,
  retrofit: (s) => `What would lead your organisation to retrofit its ${s} rather than replace it?`,
  nextGeneration: (s) => `Which next generation feature would most influence your next ${s} purchase?`,
  replacementPlans: (s) => `What will mainly trigger your next ${s} replacement?`,
  capex: (s) => `How will your capital budget for ${s} change over the next 3 years?`,
  newModules: (s) => `Which additional module would your organisation add to its ${s}?`,
  analytics: (s) => `Which analytics capability would you expect from a future ${s} release?`,
  ecosystem: (s) => `Which partner integration would your organisation want added to ${s}?`,
  integrationNeeds: (s) => `Which integration will your organisation need from its next ${s}?`,
  subscriptionEvolution: (s) => `Which commercial model would your organisation prefer for future ${s}?`,
  modernisation: (s) => `Which part of your ${s} will your organisation modernise first?`,
  expansionScope: (s) => `Into which part of the operation would your organisation extend ${s}?`,
}

/** Section headings, 2 to 4 words, per offering type where it helps. */
const SECTION_TITLES: Record<OfferingType, [string, string, string, string]> = {
  Product: ['Supplier Selection Criteria', 'Product Use and Formats', 'Quality and Value', 'Future Demand Plans'],
  Technology: ['Vendor Selection Criteria', 'Technology Adoption and Use', 'Reliability and Value', 'Future Technology Investment'],
  'Material / Ingredient': ['Supplier Qualification Criteria', 'Formulation Use', 'Functional Performance and Value', 'Future Formulation Plans'],
  Service: ['Provider Selection Criteria', 'Service Scope and Delivery', 'Service Performance and Value', 'Future Service Needs'],
  Equipment: ['Vendor Selection Criteria', 'Deployment and Utilisation', 'Performance and Value', 'Future Capital Plans'],
  Platform: ['Vendor Selection Criteria', 'Platform Adoption and Use', 'Reliability and Value', 'Future Platform Investment'],
  System: ['Vendor Selection Criteria', 'System Deployment and Use', 'Reliability and Value', 'Future System Investment'],
  Solution: ['Vendor Selection Criteria', 'Deployment and Business Fit', 'Outcomes and Value', 'Future Expansion Plans'],
}

export interface GeneratedQuestion {
  text: string
  /** B2B questions are answered by picking one option. */
  type: 'single_choice'
}

export interface GeneratedSection {
  title: string
  focus: string
  questions: GeneratedQuestion[]
}

const FOCUS: [string, string, string, string] = [
  'How buyers of {s} choose, qualify and contract their suppliers.',
  'How, where and why {s} is used inside the buying organisation.',
  'How {s} has performed in service and what value it returned.',
  'Where demand, upgrades and investment in {s} are heading.',
]

/**
 * A name short enough to sit inside a question. "Power Line, Utility Asset and
 * Vegetation Management Drone" asked 24 times reads as filler, so a long name
 * is shortened to the words that carry it, the way an analyst would say it.
 */
function askableSubject(subject: string): string {
  let cleaned = subject.replace(/,/g, ' ').replace(/\s+/g, ' ').trim()

  // "Lithium Battery Cells for Drone Application" is about the cells, so the
  // trailing phrase goes before any shortening: keeping it would leave the
  // question asking about "for drone application".
  const withoutTail = cleaned.replace(/\s+\b(for|in|across|used in|within)\b\s+.*$/i, '').trim()
  if (withoutTail.split(' ').length >= 2) cleaned = withoutTail

  const words = cleaned.split(' ')
  if (words.length <= 4) return cleaned.toLowerCase()
  // Otherwise keep the words that carry the name, as an analyst would say it.
  return words.slice(-3).join(' ').toLowerCase()
}

/** Build the questionnaire for a market: 4 sections of 5 questions. */
export function buildB2bQuestionnaire(
  subject: string,
  geo: string,
  offering: OfferingType
): GeneratedSection[] {
  const themes = THEMES[offering]
  const titles = SECTION_TITLES[offering]
  const askable = askableSubject(subject)
  const profile = industryProfile(subject)

  /** The industry's scoring parameters, phrased as something a buyer answers. */
  const buyingQuestion = (index: number): string | null => {
    const parameter = profile.xParameters[index]
    if (!parameter) return null
    const it = lowerFirst(parameter.name)
    const forms = [
      `How much weight did ${it} carry in your ${askable} supplier decision?`,
      `What standard did your organisation set for ${it}?`,
      `How far did suppliers differ on ${it} during your evaluation?`,
      `Which evidence of ${it} did your organisation ask a supplier to provide?`,
    ]
    return forms[index % forms.length]
  }
  const performanceQuestion = (index: number): string | null => {
    const parameter = profile.xParameters[index]
    if (!parameter) return null
    const it = lowerFirst(parameter.name)
    const forms = [
      `How has your chosen supplier performed on ${it}?`,
      `Where has ${it} fallen short of what was agreed?`,
      `How does ${it} compare with the supplier used before?`,
      `How consistently has ${it} held up across the contract?`,
    ]
    return forms[index % forms.length]
  }

  return themes.map((sectionThemes, i) => ({
    title: titles[i],
    focus: FOCUS[i].replace('{s}', subject.toLowerCase()),
    questions: sectionThemes.slice(0, QUESTIONS_PER_SECTION).map((theme, position) => {
      // The brand chain keeps its place at the top of each section.
      const industryText =
        position === 0
          ? null
          : i === 0
            ? buyingQuestion(position - 1)
            : i === 2
              ? performanceQuestion(position + 1)
              : null

      const phrase = PHRASING[theme]
      const text =
        industryText ??
        (phrase
          ? phrase(askable, geo)
          : `Which ${theme} requirement shaped your organisation's approach to ${askable}?`)
      return { text, type: 'single_choice' as const }
    }),
  }))
}

/** "Food Safety & Residue Compliance" → "food safety and residue compliance". */
function lowerFirst(name: string): string {
  return name
    .replace(/&/g, 'and')
    .split(' ')
    .map((word) => (/^[A-Z]{2,}$/.test(word) ? word : word.toLowerCase()))
    .join(' ')
}
