/**
 * What competing actually looks like, industry by industry.
 *
 * Generated content used to be one template with the market name dropped into
 * it, so a spices quadrant and a water recycling quadrant scored the same five
 * things. A spice supplier is judged on sourcing and food safety; a water
 * recycling supplier on recovery rate and discharge compliance; a software
 * vendor on security and uptime. Those are different trades.
 *
 * Each profile carries what a buyer in that industry actually weighs: the five
 * product-side scoring parameters, the customer base that matters, the events
 * that open a buying window, the kinds of organisation that buy, and the job
 * titles that sign. The classifier reads the market name; anything it does not
 * recognise falls back to a general industrial profile.
 */

import { composeProfile } from '@/lib/profile-composer'
import { offeringTypeOf } from '@/lib/demo-survey-offering'
import { isConsumerMarket } from '@/lib/market-flavour'
import { stripScopePrefix } from '@/lib/market-scope'

export interface ScoringParameter {
  name: string
  definition: string
}

export interface IndustryProfile {
  /** Human label, used in copy where the industry needs naming. */
  label: string
  /** The X axis: what makes a strong supplier in this industry. */
  xParameters: ScoringParameter[]
  /** The Y axis parameter that differs by industry: whose business matters. */
  customerBase: ScoringParameter
  /** Observable events that say a buyer is about to buy. */
  triggerSignals: string[]
  /** Kinds of buying organisation, qualified by size, ownership or model. */
  organisations: string[]
  /** Working and mid level titles that really buy this. */
  designations: string[]
  /** Industries and end user groups that buy. */
  buyerSegments: string[]
}

const p = (name: string, definition: string): ScoringParameter => ({ name, definition })

export const INDUSTRY_PROFILES = {
  spices: {
    label: 'spices and seasonings',
    xParameters: [
      p('Spice Sourcing & Supply Chain Control', 'Control over origin sourcing, farmer networks and traceability from field to plant, and the ability to hold grade through a volatile crop cycle.'),
      p('Product Portfolio Breadth & Customization', 'Range across whole spices, ground spices, blends and seasonings, and the ability to formulate to a customer specification.'),
      p('Manufacturing Scale & Quality Systems', 'Cleaning, grinding, sterilisation and packing capacity, held to food safety certification and audited hygiene standards.'),
      p('Food Safety & Residue Compliance', 'Pesticide residue, aflatoxin and adulteration control against the limits of each export market, evidenced by lab results and recall history.'),
      p('Processing Technology & Innovation', 'Steam sterilisation, cryogenic grinding, oleoresin extraction and shelf life technology relative to the rest of the field.'),
    ],
    customerBase: p('Institutional & Foodservice Customer Base', 'Breadth of food manufacturer, foodservice, quick service restaurant and retail private label accounts, and how long those relationships have held.'),
    triggerSignals: [
      'New blending or grinding line commissioned at a processing plant',
      'Private label contract won with a retail or foodservice chain',
      'Export approval secured for a new destination market',
      'Hiring quality or food safety roles for a new facility',
      'Recall or residue finding forcing a change of supplier',
      'Harvest shortfall at an origin pushing buyers to a second source',
    ],
    organisations: [
      'Multinational packaged food manufacturers',
      'Regional spice blending and packing companies',
      'Quick service restaurant supply chains',
      'Private label manufacturers for retail chains',
      'Export houses and commodity trading firms',
    ],
    designations: ['Procurement Manager', 'Category Buyer', 'Quality Assurance Manager', 'Product Development Chef', 'Supply Chain Lead', 'Sourcing Specialist'],
    buyerSegments: ['Packaged Food Manufacturers', 'Foodservice and Restaurant Chains', 'Retail and Private Label', 'Meat and Convenience Processing', 'Nutraceutical and Supplement Makers', 'Export and Trading Houses'],
  },

  food_ingredients: {
    label: 'food ingredients',
    xParameters: [
      p('Purity & Specification Consistency', 'Assay, particle size and functional specification held batch to batch, evidenced by certificates of analysis and customer audit outcomes.'),
      p('Formulation Compatibility & Technical Support', 'How readily the ingredient works in customer formulations, and the applications support offered during trials and scale up.'),
      p('Regulatory & Label Documentation', 'Food contact, novel food, GRAS and label claim documentation for each market the customer sells into.'),
      p('Production Capacity & Supply Continuity', 'Installed capacity, dual sourcing and inventory policy, and the record of holding supply through a demand spike.'),
      p('Clean Label & Sustainability Credentials', 'Non GMO, organic, allergen and sustainable sourcing credentials, and the audit evidence behind them.'),
    ],
    customerBase: p('Manufacturer & Formulator Customer Base', 'Breadth of food, beverage, infant nutrition and supplement manufacturers using the ingredient, and the depth of those qualifications.'),
    triggerSignals: [
      'New product line announced that needs the ingredient in its formulation',
      'Reformulation underway to meet a new label or regulatory rule',
      'Processing capacity expanded, lifting ingredient volumes',
      'Hiring formulation or quality roles for a new programme',
      'Supplier audit opened for a second approved source',
      'Export approval secured that requires documented sourcing',
    ],
    organisations: [
      'Multinational food and beverage manufacturers',
      'Infant and clinical nutrition producers',
      'Contract manufacturers and co packers',
      'Mid sized regional ingredient blenders',
      'Specialty ingredient distributors and importers',
    ],
    designations: ['Procurement Manager', 'Formulation Scientist', 'Quality Assurance Manager', 'Regulatory Affairs Specialist', 'Production Manager', 'Sourcing Specialist'],
    buyerSegments: ['Food and Beverage Manufacturers', 'Infant and Clinical Nutrition', 'Nutraceutical and Supplements', 'Dairy Processing', 'Animal Nutrition', 'Ingredient Distribution'],
  },

  pharma: {
    label: 'pharmaceuticals',
    xParameters: [
      p('Regulatory Approvals & Filing Strength', 'Marketing authorisations, dossier quality and the record of approvals across the markets this study covers.'),
      p('Manufacturing Quality & GMP Compliance', 'Inspection history, deviation record and remediation track record across the sites that supply this market.'),
      p('Product Pipeline & Therapeutic Breadth', 'Depth of the marketed portfolio and the pipeline behind it across the therapy areas in scope.'),
      p('Clinical Evidence & Published Outcomes', 'Trial data, real world evidence and guideline inclusion supporting the products in use.'),
      p('Supply Reliability & Cold Chain Capability', 'Continuity of supply, shortage history and the validated cold chain where the product requires one.'),
    ],
    customerBase: p('Hospital & Formulary Customer Base', 'Formulary listings, hospital group contracts and retail chain coverage, and how long those have been held.'),
    triggerSignals: [
      'Formulary review opened at a hospital group',
      'Tender published by a public procurement agency',
      'Patent expiry opening a therapy area to new suppliers',
      'Hiring procurement or pharmacy roles for a new facility',
      'Regulatory approval granted for a new indication',
      'Supply shortage forcing qualification of an alternative source',
    ],
    organisations: [
      'Multi site private hospital groups',
      'State run tertiary care hospitals',
      'National pharmacy retail chains',
      'Pharmaceutical distributors and wholesalers',
      'Government medical supply agencies',
    ],
    designations: ['Procurement Manager', 'Chief Pharmacist', 'Formulary Committee Member', 'Supply Chain Lead', 'Quality Assurance Manager', 'Regulatory Affairs Specialist'],
    buyerSegments: ['Hospitals and Health Systems', 'Retail Pharmacy Chains', 'Government Health Agencies', 'Specialty Clinics', 'Wholesale Distribution', 'Contract Manufacturers'],
  },

  medical_devices: {
    label: 'medical devices',
    xParameters: [
      p('Clinical Performance & Outcome Evidence', 'Published clinical outcomes, healing or success rates and the strength of the evidence behind the claims made.'),
      p('Regulatory Clearance & Standards Compliance', 'Device clearances, quality system certification and conformity with the standards applying in each market covered.'),
      p('Product Range & Size Coverage', 'Breadth of the range across indications, sizes and formats, and the ability to supply a full protocol from one source.'),
      p('Ease of Use & Clinician Training', 'How readily clinical staff adopt the device, and the training, protocols and in service support provided.'),
      p('Manufacturing Quality & Batch Traceability', 'Sterility assurance, batch traceability and the complaint and recall record across supplying sites.'),
    ],
    customerBase: p('Hospital & Care Setting Customer Base', 'Coverage across acute hospitals, specialty clinics, long term care and home care, and the depth of those contracts.'),
    triggerSignals: [
      'New department, ward or clinic opening that will use the device',
      'Accreditation or inspection due that covers the clinical practice',
      'Tender published by a hospital group or buying consortium',
      'Treatment protocol updated to include the device category',
      'Hiring clinical or procurement roles tied to the specialty',
      'Capital grant released for equipment or supply',
    ],
    organisations: [
      'Multi site private hospital groups',
      'State run tertiary care hospitals',
      'Specialty clinic chains',
      'Long term and home care providers',
      'Medical device distributors and dealers',
    ],
    designations: ['Procurement Manager', 'Clinical Nurse Specialist', 'Biomedical Engineer', 'Materials Manager', 'Category Manager', 'Supply Chain Lead'],
    buyerSegments: ['Hospitals and Acute Care', 'Specialty Clinics', 'Long Term Care Facilities', 'Home Healthcare Providers', 'Government Health Agencies', 'Medical Distribution'],
  },

  water_treatment: {
    label: 'water recycling and reuse',
    xParameters: [
      p('Treatment Performance & Recovery Rate', 'Water recovered as a share of influent and the consistency of treated quality against the discharge or reuse standard.'),
      p('Technology Fit for Effluent Type', 'Suitability of the process train for the contaminant load it will see, from municipal sewage to industrial effluent.'),
      p('Energy & Operating Cost per Cubic Metre', 'Power, chemical and membrane replacement cost per cubic metre treated across the plant life.'),
      p('Regulatory & Discharge Compliance Record', 'Record of meeting discharge consents and reuse standards, evidenced by monitoring data and regulator findings.'),
      p('Engineering, Commissioning & Service Network', 'Capability to design, build and commission on site, and the response time of the service network afterwards.'),
    ],
    customerBase: p('Municipal & Industrial Customer Base', 'Spread of municipal utilities and industrial plants served, and the length of the operating and maintenance contracts held.'),
    triggerSignals: [
      'New discharge consent or reuse rule tightening at an existing site',
      'Industrial plant expansion that raises effluent volume',
      'Tender published by a municipal water utility',
      'Water scarcity restrictions imposed on an industrial user',
      'Hiring plant or environmental engineers for a treatment site',
      'Capital budget released to replace an ageing treatment plant',
    ],
    organisations: [
      'Municipal water and wastewater utilities',
      'Large chemical and pharmaceutical manufacturing sites',
      'Private water concession operators',
      'Engineering procurement and construction contractors',
      'Textile and food processing plants under discharge limits',
    ],
    designations: ['Plant Manager', 'Environmental Engineer', 'Procurement Manager', 'Operations Lead', 'Project Engineer', 'Maintenance Manager'],
    buyerSegments: ['Municipal Water Utilities', 'Chemical and Pharmaceutical Plants', 'Food and Beverage Processing', 'Textile and Leather Processing', 'Thermal Power and Refineries', 'Engineering and EPC Contractors'],
  },

  power_grid: {
    label: 'power and grid infrastructure',
    xParameters: [
      p('Grid Reliability & Fault Performance', 'Performance under fault conditions and the contribution to outage minutes across the assets installed.'),
      p('Standards Compliance & Type Testing', 'Type test certification and conformity with the grid codes and utility specifications that apply.'),
      p('Capacity & Voltage Class Coverage', 'Range across voltage classes and ratings, and the ability to supply a full substation or corridor scope.'),
      p('Installation & Commissioning Capability', 'Site capability to install, test and energise, including outage planning and commissioning record.'),
      p('Asset Life & Maintenance Burden', 'Expected service life, maintenance interval and the spares and support needed to keep assets in service.'),
    ],
    customerBase: p('Utility & Independent Producer Customer Base', 'Coverage across transmission utilities, distribution licensees and independent power producers, and the contracts held with them.'),
    triggerSignals: [
      'Transmission or distribution capacity expansion approved',
      'Renewable project reaching grid connection stage',
      'Tender published by a state utility for substation works',
      'Regulator ordering reliability improvement at a licensee',
      'Hiring project or commissioning engineers for grid works',
      'Capital plan published naming network reinforcement',
    ],
    organisations: [
      'State owned transmission utilities',
      'Private power distribution licensees',
      'Renewable energy independent power producers',
      'Large thermal and hydro generation utilities',
      'Mid sized engineering contractors',
    ],
    designations: ['Procurement Manager', 'Project Engineer', 'Substation Engineer', 'Asset Maintenance Engineer', 'Operations Lead', 'Technical Services Manager'],
    buyerSegments: ['Electric Utilities', 'Renewable Energy Operators', 'Industrial Captive Power', 'Engineering Contractors', 'Government Power Agencies', 'Railways and Metro'],
  },

  renewables_hydrogen: {
    label: 'renewable energy and hydrogen',
    xParameters: [
      p('Efficiency & Energy Conversion Performance', 'Conversion efficiency and degradation over the operating life, measured under the duty cycle the buyer will run.'),
      p('Scale & Capacity Range Offered', 'Range of unit sizes and the ability to supply at the project scale planned, including modular build out.'),
      p('Durability in Operating Conditions', 'Performance through load cycling, intermittency and the climate conditions at the project site.'),
      p('Safety Certification & Compliance', 'Certification for pressurised, electrical and hazardous area operation under the applicable regimes.'),
      p('Levelised Cost & Project Economics', 'Capital and operating cost per unit of output, and the terms that shape the project business case.'),
    ],
    customerBase: p('Developer & Industrial Offtaker Base', 'Spread of project developers, utilities and industrial offtakers served, and the size of the projects delivered.'),
    triggerSignals: [
      'Project reaching financial close with equipment yet to be ordered',
      'Government subsidy or incentive scheme opening applications',
      'Industrial site committing to a decarbonisation target',
      'Hiring project development or commissioning engineers',
      'Grid connection approval granted for a new site',
      'Offtake agreement signed that requires new capacity',
    ],
    organisations: [
      'Renewable project development companies',
      'State owned energy utilities',
      'Large industrial energy consumers',
      'Engineering procurement and construction contractors',
      'Infrastructure investment funds',
    ],
    designations: ['Project Engineer', 'Procurement Manager', 'Operations Lead', 'Commissioning Engineer', 'Asset Manager', 'Technical Due Diligence Lead'],
    buyerSegments: ['Project Developers', 'Electric Utilities', 'Industrial Manufacturers', 'Oil and Gas Operators', 'Engineering Contractors', 'Government Energy Agencies'],
  },

  chemicals: {
    label: 'chemicals and polymers',
    xParameters: [
      p('Product Purity & Technical Specification', 'Conformance to the technical specification and the variation seen across batches in customer processes.'),
      p('Application Development & Technical Service', 'Depth of applications laboratory support and the help given to customers qualifying the material in their process.'),
      p('Regulatory Registration & Safety Documentation', 'Chemical registrations, safety data and restricted substance documentation for each market supplied.'),
      p('Plant Capacity & Supply Security', 'Installed capacity, feedstock position and the record of holding supply through disruption.'),
      p('Sustainability & Emissions Profile', 'Carbon intensity, recycled or bio based content and the evidence behind the environmental claims made.'),
    ],
    customerBase: p('Processor & Converter Customer Base', 'Breadth of converters, compounders and end product manufacturers qualified on the material.'),
    triggerSignals: [
      'New production line commissioned that consumes the material',
      'Reformulation driven by a restricted substance rule',
      'Second source qualification opened after a supply disruption',
      'Hiring process or quality engineers for a new plant',
      'Capacity expansion announced at a converter site',
      'Long term supply contract approaching renewal',
    ],
    organisations: [
      'Large integrated chemical manufacturers',
      'Mid sized compounders and converters',
      'Specialty formulation houses',
      'Industrial distributors and importers',
      'Contract manufacturing organisations',
    ],
    designations: ['Procurement Manager', 'Process Engineer', 'Formulation Chemist', 'Quality Manager', 'Plant Manager', 'Sourcing Specialist'],
    buyerSegments: ['Plastics and Polymer Processing', 'Coatings and Adhesives', 'Automotive Components', 'Construction Materials', 'Packaging Converters', 'Industrial Distribution'],
  },

  software_platform: {
    label: 'software platforms',
    xParameters: [
      p('Security, Privacy & Compliance Posture', 'Certification, data residency and audit posture against the regimes the buyer is held to.'),
      p('Functional Depth & Module Coverage', 'Breadth of modules and how much of the end to end process the platform covers without bolt ons.'),
      p('Integration & API Ecosystem', 'Quality of the interfaces into the systems the buyer already runs, and the breadth of prebuilt connectors.'),
      p('Implementation Speed & Partner Network', 'Typical time to go live and the depth of the implementation partner network available.'),
      p('Reliability, Uptime & Support Responsiveness', 'Published availability, incident history and the responsiveness of support against the agreed levels.'),
    ],
    customerBase: p('Enterprise & Mid Market Customer Base', 'Spread of enterprise, mid market and public sector customers, their seat counts and renewal record.'),
    triggerSignals: [
      'Migration or modernisation programme announced',
      'Hiring technology or data roles tied to the platform area',
      'Security or compliance audit forcing a systems review',
      'Funding round or budget cycle releasing software spend',
      'Merger or new site expanding the user base',
      'Current licence approaching its renewal date',
    ],
    organisations: [
      'Large multinational enterprises',
      'Mid market shared service centres',
      'Regional managed service providers',
      'Public sector technology departments',
      'High growth technology companies',
    ],
    designations: ['IT Manager', 'Product Owner', 'Procurement Manager', 'Solution Architect', 'Business Analyst', 'Information Security Manager'],
    buyerSegments: ['Banking and Financial Services', 'Manufacturing and Industrial', 'Retail and Ecommerce', 'Healthcare Providers', 'Government and Public Sector', 'Professional Services'],
  },

  datacenter: {
    label: 'data centre infrastructure',
    xParameters: [
      p('Power & Cooling Efficiency', 'Power usage effectiveness and cooling performance at the densities the buyer runs.'),
      p('Scalability & Modular Deployment', 'Ability to add capacity in steps without redesign, and the lead time for each step.'),
      p('Redundancy & Uptime Design', 'Resilience of the design against single points of failure, and the availability it is engineered to hold.'),
      p('Integration with Existing Facility Systems', 'How readily the equipment fits the installed electrical, mechanical and monitoring systems.'),
      p('Serviceability & Spare Parts Network', 'On site service coverage, response times and parts availability across the regions operated.'),
    ],
    customerBase: p('Operator & Enterprise Customer Base', 'Coverage across colocation operators, hyperscale builds and enterprise estates, and the scale of those deployments.'),
    triggerSignals: [
      'New facility or campus announced that needs the equipment',
      'Capacity expansion approved at an existing site',
      'Density upgrade driven by new compute workloads',
      'Hiring facility or critical infrastructure engineers',
      'Power or sustainability commitment forcing an upgrade',
      'Maintenance contract approaching renewal',
    ],
    organisations: [
      'Multinational colocation operators',
      'Regional colocation and edge operators',
      'Large enterprises running their own estates',
      'State owned telecom operators',
      'Government technology agencies',
    ],
    designations: ['Infrastructure Manager', 'Facilities Engineer', 'Procurement Manager', 'Critical Systems Engineer', 'Programme Manager', 'Operations Lead'],
    buyerSegments: ['Colocation Providers', 'Cloud and Hyperscale Operators', 'Telecommunications', 'Banking and Financial Services', 'Government and Public Sector', 'Large Enterprises'],
  },

  drones_geospatial: {
    label: 'drone and geospatial services',
    xParameters: [
      p('Survey Accuracy & Data Quality', 'Positional accuracy and completeness of the deliverable against the survey tolerance the client sets.'),
      p('Fleet, Sensor & Payload Capability', 'Range of platforms and sensors available, and their fit for the terrain and asset types flown.'),
      p('Regulatory Approvals & Flight Permissions', 'Operator certification, airspace permissions and beyond visual line of sight approvals held.'),
      p('Data Processing & Analytics Capability', 'Capability to turn captured data into usable outputs, including defect detection and change analysis.'),
      p('Coverage, Turnaround & Field Capacity', 'Geographic coverage, crew availability and the time from survey to delivered output.'),
    ],
    customerBase: p('Asset Owner & Contractor Customer Base', 'Spread of utilities, infrastructure owners and contractors served, and the length of the survey programmes held.'),
    triggerSignals: [
      'New corridor, route or site added to an inspection programme',
      'Existing inspection contract approaching renewal or retender',
      'Regulator inspection requiring documented asset condition',
      'Hiring roles that manage inspection or survey programmes',
      'Outage or failure putting current inspection practice under review',
      'Budget approved to move inspection from manual to aerial',
    ],
    organisations: [
      'State owned transmission utilities',
      'Private power distribution licensees',
      'National highway and rail authorities',
      'Large construction and mining operators',
      'Mid sized survey and engineering contractors',
    ],
    designations: ['Procurement Manager', 'Asset Maintenance Engineer', 'Survey Manager', 'Operations Lead', 'Project Engineer', 'GIS Manager'],
    buyerSegments: ['Electric Utilities', 'Transport Infrastructure', 'Construction and Mining', 'Oil and Gas', 'Telecom Tower Operators', 'Government Agencies'],
  },

  industrial_equipment: {
    label: 'industrial equipment',
    xParameters: [
      p('Throughput & Performance Specification', 'Rated output and the performance actually held under the buyer duty cycle and operating conditions.'),
      p('Reliability, Uptime & Mean Time Between Failures', 'Failure record in service and the downtime it causes across the installed base.'),
      p('Safety Certification & Operator Protection', 'Machinery safety certification, guarding and operator protection against the applicable standards.'),
      p('Energy Efficiency & Running Cost', 'Energy and consumable cost per unit produced across the service life of the machine.'),
      p('Service Network, Spares & Response Time', 'Coverage of the service network, parts availability and the response time committed on breakdown.'),
    ],
    customerBase: p('Plant & Contractor Customer Base', 'Spread of manufacturing plants, contractors and rental fleets running the equipment, and the size of those fleets.'),
    triggerSignals: [
      'New plant or line announced that will need the equipment',
      'Capacity expansion approved that lifts equipment requirement',
      'Hiring maintenance or operations engineers to run it',
      'Safety inspection forcing an upgrade of ageing machines',
      'Rental fleet renewal cycle opening',
      'Capital budget released for equipment replacement',
    ],
    organisations: [
      'Large integrated manufacturing groups',
      'Mid sized regional processors',
      'Equipment rental and leasing fleets',
      'Privately held engineering contractors',
      'Public sector infrastructure agencies',
    ],
    designations: ['Procurement Manager', 'Maintenance Engineer', 'Plant Manager', 'Project Engineer', 'Operations Lead', 'Technical Services Manager'],
    buyerSegments: ['Manufacturing and Processing', 'Construction and Infrastructure', 'Mining and Metals', 'Logistics and Warehousing', 'Equipment Rental', 'Government and Public Agencies'],
  },

  automotive: {
    label: 'automotive',
    xParameters: [
      p('Component Quality & Defect Rate', 'Parts per million defect rate and the warranty return record across supplied programmes.'),
      p('Programme Capacity & Delivery Performance', 'Ability to hold schedule across model programmes, measured by on time delivery and line stoppage record.'),
      p('Homologation & Safety Compliance', 'Type approval, safety and emissions compliance for the markets the vehicle sells into.'),
      p('Engineering & Co Development Capability', 'Design capability and the record of co developing to a customer specification from concept to launch.'),
      p('Cost Competitiveness & Localisation', 'Landed cost position and the degree of local content in the markets covered.'),
    ],
    customerBase: p('OEM & Tier One Customer Base', 'Spread of vehicle makers and tier one suppliers served, and the programmes currently nominated on.'),
    triggerSignals: [
      'New vehicle programme sourcing opening for nomination',
      'Model refresh or platform change requiring requalification',
      'Localisation mandate pushing sourcing into the region',
      'Hiring supplier quality or programme engineers',
      'Capacity expansion announced at an assembly plant',
      'Supplier quality escalation opening a second source',
    ],
    organisations: [
      'Vehicle manufacturers with local assembly',
      'Tier one component suppliers',
      'Commercial vehicle and bus builders',
      'Electric vehicle start up manufacturers',
      'Aftermarket distribution groups',
    ],
    designations: ['Purchasing Manager', 'Supplier Quality Engineer', 'Programme Manager', 'Design Engineer', 'Supply Chain Lead', 'Manufacturing Engineer'],
    buyerSegments: ['Passenger Vehicle OEMs', 'Commercial Vehicle Makers', 'Electric Vehicle Manufacturers', 'Tier One Suppliers', 'Aftermarket and Retrofit', 'Fleet Operators'],
  },

  cosmetics: {
    label: 'cosmetics and personal care',
    xParameters: [
      p('Formulation Performance & Sensory Profile', 'How the formulation performs in use and the sensory result it delivers against the claim made.'),
      p('Claim Substantiation & Testing Evidence', 'Clinical, instrumental and consumer testing behind efficacy and safety claims.'),
      p('Regulatory Compliance & Ingredient Restrictions', 'Compliance with cosmetic regulation, restricted ingredient lists and labelling rules in each market.'),
      p('Portfolio Breadth & Format Range', 'Range across categories, formats and price tiers, and the speed of bringing a new format to shelf.'),
      p('Sustainable Sourcing & Packaging Credentials', 'Ingredient traceability, cruelty free and recyclable packaging credentials, with the audits behind them.'),
    ],
    customerBase: p('Retail & Brand Customer Base', 'Coverage across retail chains, ecommerce platforms and brand owners, and the shelf space held.'),
    triggerSignals: [
      'Category range review opened at a retail chain',
      'Own label programme launched in the category',
      'New store or outlet format rolling out',
      'Reformulation driven by an ingredient restriction',
      'Hiring category buyers or brand managers',
      'Entry into a new country requiring local registration',
    ],
    organisations: [
      'National beauty and drug retail chains',
      'Ecommerce and quick commerce platforms',
      'Contract manufacturers and private label packers',
      'Regional distribution and wholesale groups',
      'Specialty salon and professional channels',
    ],
    designations: ['Category Buyer', 'Procurement Manager', 'Product Development Manager', 'Regulatory Affairs Specialist', 'Brand Manager', 'Supply Chain Lead'],
    buyerSegments: ['Beauty and Drug Retail', 'Ecommerce Platforms', 'Brand Owners', 'Contract Manufacturers', 'Professional and Salon Channels', 'Distribution and Wholesale'],
  },

  logistics: {
    label: 'logistics and supply chain',
    xParameters: [
      p('Network Coverage & Lane Density', 'Reach across the lanes and regions the customer ships, and the frequency offered on each.'),
      p('On Time Performance & Transit Reliability', 'Record of delivering to committed transit times, and the variance seen across a season.'),
      p('Capacity, Fleet & Warehouse Assets', 'Owned and contracted capacity available, and the ability to absorb a demand peak.'),
      p('Visibility, Tracking & Systems Integration', 'Shipment visibility offered and how readily the systems connect to the customer platform.'),
      p('Compliance, Customs & Cargo Safety', 'Customs capability, licences held and the loss, damage and claims record.'),
    ],
    customerBase: p('Shipper & Manufacturer Customer Base', 'Breadth of manufacturing, retail and ecommerce shippers served, and the length of those contracts.'),
    triggerSignals: [
      'New warehouse, plant or distribution centre opening',
      'Freight contract approaching renewal or retender',
      'Entry into a new export market needing new lanes',
      'Service failure putting the incumbent under review',
      'Hiring logistics or supply chain planning roles',
      'Peak season volumes exceeding current capacity',
    ],
    organisations: [
      'Multinational manufacturing groups',
      'National retail and ecommerce chains',
      'Mid sized regional distributors',
      'Third party logistics providers',
      'Export houses and trading companies',
    ],
    designations: ['Logistics Manager', 'Procurement Manager', 'Supply Chain Lead', 'Warehouse Manager', 'Transport Planner', 'Customs Compliance Officer'],
    buyerSegments: ['Manufacturing and Processing', 'Retail and Ecommerce', 'Automotive and Industrial', 'Pharmaceuticals and Healthcare', 'Food and Agriculture', 'Export and Trading'],
  },

  construction: {
    label: 'construction and building materials',
    xParameters: [
      p('Material Performance & Structural Compliance', 'Strength, durability and fire performance against the building codes that apply.'),
      p('Certification & Standards Approval', 'Product certification, test reports and approvals accepted by specifiers and authorities.'),
      p('Supply Capacity & Project Delivery', 'Capacity to supply at project scale and the record of delivering to a construction programme.'),
      p('Installation Support & Contractor Training', 'Site support, method statements and contractor training offered during installation.'),
      p('Sustainability & Embodied Carbon', 'Environmental product declarations, recycled content and embodied carbon against alternatives.'),
    ],
    customerBase: p('Contractor & Developer Customer Base', 'Spread of contractors, developers and public agencies specified with, and the projects delivered.'),
    triggerSignals: [
      'Project awarded that puts the material into specification',
      'Building code or fire regulation change forcing a switch',
      'New plant or precast facility commissioned',
      'Hiring site or procurement engineers for a project',
      'Framework agreement with a public agency opening',
      'Supply shortage pushing contractors to a second source',
    ],
    organisations: [
      'Large contracting and construction groups',
      'Property developers and project owners',
      'Public sector infrastructure agencies',
      'Precast and building material manufacturers',
      'Regional builders merchants and distributors',
    ],
    designations: ['Procurement Manager', 'Site Engineer', 'Project Manager', 'Quantity Surveyor', 'Design Engineer', 'Materials Manager'],
    buyerSegments: ['Construction Contractors', 'Property Developers', 'Public Infrastructure Agencies', 'Precast Manufacturers', 'Builders Merchants', 'Architecture and Design Firms'],
  },

  packaging: {
    label: 'packaging',
    xParameters: [
      p('Barrier Performance & Product Protection', 'Protection delivered against moisture, oxygen and handling across the shelf life required.'),
      p('Food Contact & Regulatory Compliance', 'Food contact approval, migration testing and labelling compliance in each market supplied.'),
      p('Format Range & Line Compatibility', 'Range of formats offered and how readily they run on the customer filling and packing lines.'),
      p('Recyclability & Sustainable Material Content', 'Recycled content, recyclability and compliance with packaging waste rules.'),
      p('Print Quality, Lead Time & Minimum Runs', 'Print and finish quality, artwork turnaround and the minimum order quantity accepted.'),
    ],
    customerBase: p('Brand Owner & Co Packer Customer Base', 'Spread of brand owners, co packers and private label producers supplied, and the volumes held.'),
    triggerSignals: [
      'New product launch requiring a new pack format',
      'Packaging waste rule forcing a material change',
      'Filling line installed that needs compatible packaging',
      'Private label contract won with a retail chain',
      'Hiring packaging development or procurement roles',
      'Rebrand or artwork refresh across a product range',
    ],
    organisations: [
      'Multinational food and beverage manufacturers',
      'Contract packers and co manufacturers',
      'Pharmaceutical and personal care producers',
      'Regional private label manufacturers',
      'Ecommerce fulfilment operators',
    ],
    designations: ['Packaging Development Manager', 'Procurement Manager', 'Production Manager', 'Quality Assurance Manager', 'Category Buyer', 'Supply Chain Lead'],
    buyerSegments: ['Food and Beverage Manufacturers', 'Pharmaceuticals and Healthcare', 'Personal Care and Cosmetics', 'Ecommerce and Retail', 'Contract Packers', 'Industrial Goods'],
  },

  agriculture: {
    label: 'agricultural inputs',
    xParameters: [
      p('Field Efficacy & Yield Response', 'Measured yield or protection response across the crops and conditions in the region covered.'),
      p('Registration & Residue Compliance', 'Product registrations held and conformity with residue limits in the markets the crop is sold into.'),
      p('Crop & Application Coverage', 'Breadth across crops, pests and application windows, and fit with the local cropping calendar.'),
      p('Distribution Depth & Dealer Network', 'Reach into rural dealer and retailer networks, and the stock availability through the season.'),
      p('Agronomy Support & Farmer Advisory', 'Field trial, demonstration and advisory support offered to growers and dealers.'),
    ],
    customerBase: p('Grower & Agribusiness Customer Base', 'Spread of farmer producer organisations, plantations and agribusinesses buying, and the acreage covered.'),
    triggerSignals: [
      'Registration granted for a new crop or application',
      'Pest or disease outbreak reported in the region',
      'Government subsidy or procurement scheme announced',
      'Dealer network expansion into a new district',
      'Hiring agronomy or field development roles',
      'Contract farming programme launched with a processor',
    ],
    organisations: [
      'Farmer producer organisations and cooperatives',
      'Large plantation and estate companies',
      'Agri input distribution and dealer networks',
      'Contract farming and agribusiness firms',
      'Government agriculture departments',
    ],
    designations: ['Procurement Manager', 'Agronomy Manager', 'Field Development Officer', 'Category Manager', 'Supply Chain Lead', 'Quality Manager'],
    buyerSegments: ['Farmer Producer Organisations', 'Plantation and Estate Companies', 'Agri Input Distributors', 'Contract Farming Operators', 'Food Processors', 'Government Agencies'],
  },

  electronics: {
    label: 'electronics and semiconductors',
    xParameters: [
      p('Device Performance & Technical Specification', 'Speed, power and thermal performance against the specification the design requires.'),
      p('Yield, Quality & Defect Density', 'Production yield and field failure rate across the parts supplied.'),
      p('Process Node & Fabrication Capability', 'Manufacturing capability and the technology generations available for new designs.'),
      p('Design Support & Reference Ecosystem', 'Reference designs, toolchains and engineering support available to the customer design team.'),
      p('Supply Security & Lead Time Stability', 'Allocation behaviour, lead time stability and performance through shortage cycles.'),
    ],
    customerBase: p('OEM & Design House Customer Base', 'Spread of equipment makers, design houses and contract manufacturers designed into.'),
    triggerSignals: [
      'New product design starting that needs the component',
      'End of life notice on a currently designed in part',
      'Capacity expansion at a contract manufacturing site',
      'Hiring hardware or firmware engineers for a programme',
      'Shortage forcing qualification of an alternative part',
      'Localisation incentive moving sourcing into the region',
    ],
    organisations: [
      'Electronics original equipment manufacturers',
      'Electronic manufacturing services providers',
      'Industrial automation equipment makers',
      'Automotive electronics suppliers',
      'Authorised component distributors',
    ],
    designations: ['Hardware Design Engineer', 'Procurement Manager', 'Component Engineer', 'Supply Chain Lead', 'Quality Engineer', 'Programme Manager'],
    buyerSegments: ['Consumer Electronics', 'Industrial Automation', 'Automotive Electronics', 'Telecom Equipment', 'Medical Electronics', 'Contract Manufacturing'],
  },

  telecom: {
    label: 'telecom networks',
    xParameters: [
      p('Network Performance & Capacity', 'Throughput, latency and capacity held under load across the deployed footprint.'),
      p('Interoperability & Standards Compliance', 'Conformance with network standards and interoperability with the vendors already deployed.'),
      p('Deployment Speed & Rollout Capability', 'Capability to roll out at scale and the record of hitting site delivery milestones.'),
      p('Energy Efficiency & Site Operating Cost', 'Power draw and site running cost across the equipment life.'),
      p('Security & Regulatory Clearance', 'Security certification and clearance under the national rules governing network equipment.'),
    ],
    customerBase: p('Operator & Tower Company Customer Base', 'Coverage across mobile operators, tower companies and enterprise networks, and the scale deployed.'),
    triggerSignals: [
      'Spectrum award requiring network build out',
      'Tower or fibre expansion programme announced',
      'Network modernisation budget approved',
      'Hiring radio or transmission engineers for rollout',
      'Regulator setting a coverage or quality obligation',
      'Managed services contract approaching renewal',
    ],
    organisations: [
      'National mobile network operators',
      'Independent tower companies',
      'Fibre and broadband network operators',
      'State owned telecom operators',
      'Network deployment contractors',
    ],
    designations: ['Network Planning Engineer', 'Procurement Manager', 'Rollout Manager', 'Operations Lead', 'Transmission Engineer', 'Vendor Manager'],
    buyerSegments: ['Mobile Network Operators', 'Tower Companies', 'Fibre and Broadband Providers', 'Enterprise Networks', 'Government and Defence', 'Deployment Contractors'],
  },

  mining: {
    label: 'mining and metals',
    xParameters: [
      p('Throughput & Recovery Performance', 'Processing throughput and recovery rate achieved on the ore body or feedstock treated.'),
      p('Durability in Abrasive Conditions', 'Wear life and reliability under the abrasive, dusty duty the site imposes.'),
      p('Safety Compliance & Site Approval', 'Compliance with mine safety regulation and the approvals required to operate on site.'),
      p('Maintenance Burden & Availability', 'Planned maintenance requirement and the availability achieved across the installed base.'),
      p('Site Service Coverage & Response Time', 'Proximity of service capability to remote sites and the response time committed.'),
    ],
    customerBase: p('Mine Operator & Processor Customer Base', 'Spread of mining operators, smelters and processors served, and the length of the site contracts.'),
    triggerSignals: [
      'New mine or processing plant reaching construction',
      'Expansion approved that lifts processing throughput',
      'Safety incident forcing equipment replacement',
      'Hiring maintenance or metallurgical engineers',
      'Ore body change requiring different processing',
      'Capital budget released for fleet renewal',
    ],
    organisations: [
      'Large multinational mining houses',
      'State owned mineral corporations',
      'Mid sized independent mine operators',
      'Smelting and refining companies',
      'Mining contract service providers',
    ],
    designations: ['Procurement Manager', 'Maintenance Engineer', 'Metallurgist', 'Plant Manager', 'Operations Lead', 'Reliability Engineer'],
    buyerSegments: ['Mining Operators', 'Smelting and Refining', 'Mining Contractors', 'Steel and Metals Producers', 'Equipment Rental', 'Government Mineral Agencies'],
  },

  oil_gas: {
    label: 'oil and gas',
    xParameters: [
      p('Performance in Downhole & Process Conditions', 'Performance under the pressure, temperature and corrosive conditions of the application.'),
      p('Safety Certification & Hazardous Area Approval', 'Certification for hazardous area operation and conformity with the safety cases in force.'),
      p('Reliability & Unplanned Downtime Record', 'Failure record in field service and the production loss it has caused.'),
      p('Field Service Coverage & Response', 'Coverage of field service capability near the asset and the response time committed.'),
      p('Lifecycle Cost & Total Installed Cost', 'Installed cost together with inspection, maintenance and replacement over the asset life.'),
    ],
    customerBase: p('Operator & EPC Customer Base', 'Spread of upstream operators, refiners and engineering contractors served.'),
    triggerSignals: [
      'Field development or turnaround scheduled',
      'Tender published by a national oil company',
      'Safety case review requiring equipment upgrade',
      'Hiring maintenance or integrity engineers',
      'Production expansion approved at an asset',
      'Framework agreement approaching renewal',
    ],
    organisations: [
      'National oil and gas companies',
      'International upstream operators',
      'Refining and petrochemical operators',
      'Engineering procurement and construction contractors',
      'Oilfield service companies',
    ],
    designations: ['Procurement Manager', 'Integrity Engineer', 'Maintenance Manager', 'Project Engineer', 'Operations Lead', 'Technical Authority'],
    buyerSegments: ['Upstream Operators', 'Refining and Petrochemicals', 'Oilfield Services', 'Engineering Contractors', 'Pipeline Operators', 'National Oil Companies'],
  },

  diagnostics: {
    label: 'diagnostics',
    xParameters: [
      p('Assay Accuracy, Sensitivity & Specificity', 'Analytical and clinical performance of the assay against the reference method.'),
      p('Regulatory Clearance & Laboratory Accreditation', 'Clearances held and fit with the accreditation the laboratory is audited against.'),
      p('Test Menu Breadth & Platform Throughput', 'Range of tests on the platform and the throughput achieved in routine running.'),
      p('Instrument Reliability & Service Uptime', 'Instrument downtime record and the service response committed.'),
      p('Cost per Reportable Result', 'Reagent, consumable and maintenance cost across a realistic test mix.'),
    ],
    customerBase: p('Laboratory & Hospital Customer Base', 'Coverage across reference laboratories, hospital labs and collection networks, and contract duration.'),
    triggerSignals: [
      'New laboratory or collection centre opening',
      'Accreditation audit requiring method validation',
      'Tender published by a hospital or laboratory chain',
      'Test menu expansion into a new specialty',
      'Hiring laboratory or technical managers',
      'Reagent contract approaching renewal',
    ],
    organisations: [
      'National diagnostic laboratory chains',
      'Multi site private hospital groups',
      'State run public health laboratories',
      'Independent pathology laboratories',
      'Diagnostic product distributors',
    ],
    designations: ['Laboratory Manager', 'Procurement Manager', 'Technical Head', 'Quality Manager', 'Biomedical Scientist', 'Supply Chain Lead'],
    buyerSegments: ['Diagnostic Laboratory Chains', 'Hospital Laboratories', 'Public Health Agencies', 'Research Institutions', 'Collection Networks', 'Distribution Partners'],
  },

  beverages: {
    label: 'beverages',
    xParameters: [
      p('Taste Profile & Product Consistency', 'Consistency of taste and carbonation from batch to batch and across bottling sites.'),
      p('Pack Format & Size Range', 'Range across cans, bottles and multipacks covering the occasions the category sells into.'),
      p('Shelf Life & Cold Chain Handling', 'Shelf life delivered and the handling the product needs through distribution.'),
      p('Food Safety & Ingredient Compliance', 'Ingredient approval, labelling and food safety certification in each market sold into.'),
      p('Bottling Capacity & Fill Rate', 'Bottling and distribution capacity behind the range, and the ability to keep stock on shelf.'),
    ],
    customerBase: p('Retail & Foodservice Customer Base', 'Coverage across grocery retail, convenience, quick service restaurants, vending and institutional channels.'),
    triggerSignals: [
      'Category range review opened at a grocery or convenience chain',
      'New outlet format or store cluster rolling out',
      'Quick service restaurant renegotiating its pouring agreement',
      'Vending or institutional contract approaching renewal',
      'Hiring category buyers or beverage merchandisers',
      'Sugar tax or labelling rule changing the approved range',
    ],
    organisations: [
      'National supermarket and grocery chains',
      'Convenience and forecourt retail groups',
      'Quick service restaurant and cafe chains',
      'Beverage wholesalers and cash and carry operators',
      'Vending and institutional catering operators',
    ],
    designations: ['Category Buyer', 'Procurement Manager', 'Beverage Merchandiser', 'Supply Chain Lead', 'Store Operations Manager', 'Quality Manager'],
    buyerSegments: ['Grocery and Supermarket Retail', 'Convenience and Forecourt', 'Quick Service Restaurants and Cafes', 'Hotels Restaurants and Catering', 'Vending and Institutional', 'Wholesale and Distribution'],
  },

  consumer_goods: {
    label: 'consumer goods',
    xParameters: [
      p('Product Quality & Consistency', 'Consistency of the product delivered to shelf and the complaint record behind it.'),
      p('Portfolio Breadth & Pack Format Range', 'Range across variants, pack sizes and price points covering the shopper mission.'),
      p('Shelf Availability & Fill Rate', 'Ability to keep stock on shelf, measured by fill rate and out of stock incidence.'),
      p('Brand Investment & Shopper Marketing', 'Marketing support behind the brand and the activation offered to the retailer.'),
      p('Certification & Label Compliance', 'Product certification and labelling compliance for each market sold into.'),
    ],
    customerBase: p('Retail & Channel Customer Base', 'Coverage across modern trade, general trade, ecommerce and institutional channels.'),
    triggerSignals: [
      'Category range review opened at a retail chain',
      'New store or outlet format rolling out',
      'Own label programme launched in the category',
      'Hiring category buyers or merchandisers',
      'Entry into a new region or sales channel',
      'Supplier listing window opening for the category',
    ],
    organisations: [
      'National supermarket and grocery chains',
      'Regional convenience retail groups',
      'Quick commerce and ecommerce platforms',
      'Privately held wholesale distributors',
      'Hotel, restaurant and catering operators',
    ],
    designations: ['Category Buyer', 'Procurement Manager', 'Merchandising Manager', 'Supply Chain Lead', 'Private Label Manager', 'Quality Manager'],
    buyerSegments: ['Supermarket and Grocery Retail', 'Convenience and Specialty Retail', 'Ecommerce Platforms', 'Wholesale and Distribution', 'Hotels Restaurants and Catering', 'Institutional Buyers'],
  },

  consumer_electronics: {
    label: 'consumer electronics',
    xParameters: [
      p('Audio & Device Performance', 'Measured performance against the claims made: sound quality, display, battery life or sensor accuracy as the category requires.'),
      p('Build Quality & Durability', 'Materials, assembly and the failure rate seen in the field over normal use.'),
      p('Feature Set & Connectivity', 'Features and connectivity offered against competing models at the same price.'),
      p('Design, Comfort & User Experience', 'Industrial design, fit and the ease of living with the product day to day.'),
      p('Certification & Safety Compliance', 'Electrical, radio and battery safety certification for the markets sold into.'),
    ],
    customerBase: p('Retail & Channel Customer Base', 'Coverage across electronics retail, ecommerce platforms, telecom channels and institutional buyers, and the shelf space held.'),
    triggerSignals: [
      'Category range review opened at an electronics retail chain',
      'New model launch cycle opening supplier discussions',
      'Ecommerce platform expanding its own label range',
      'Telecom operator bundling devices with a new plan',
      'Hiring category buyers or product managers for the category',
      'Entry into a new country requiring local certification',
    ],
    organisations: [
      'National electronics and appliance retail chains',
      'Ecommerce and quick commerce platforms',
      'Telecom operator retail channels',
      'Regional distributors and importers',
      'Corporate and institutional bulk buyers',
    ],
    designations: ['Category Buyer', 'Procurement Manager', 'Product Manager', 'Merchandising Manager', 'Supply Chain Lead', 'Quality Manager'],
    buyerSegments: ['Electronics and Specialty Retail', 'Ecommerce Platforms', 'Telecom Retail Channels', 'Distribution and Wholesale', 'Corporate and Institutional Buyers', 'Brand and Private Label Owners'],
  },

  industrial: {
    label: 'industrial goods',
    xParameters: [
      p('Product Specification & Technical Fit', 'How closely the product meets the technical specification the buyer works to.'),
      p('Quality Consistency & Defect Record', 'Consistency delivered across orders and the rejection record in incoming inspection.'),
      p('Standards Certification & Compliance', 'Certification against the standards that govern the product in the markets covered.'),
      p('Production Capacity & Lead Time Reliability', 'Capacity available and the record of delivering to the lead time quoted.'),
      p('Technical Support & After Sales Service', 'Engineering support before the sale and the service capability behind it afterwards.'),
    ],
    customerBase: p('Industrial & Distributor Customer Base', 'Spread of manufacturing, contracting and distribution customers, and the depth of those accounts.'),
    triggerSignals: [
      'New facility or line announced that will need supply',
      'Capacity expansion approved at a customer site',
      'Supply disruption opening qualification of a second source',
      'Hiring procurement or engineering roles for a project',
      'Certification or standards change affecting approved suppliers',
      'Framework or supply contract approaching renewal',
    ],
    organisations: [
      'Large integrated manufacturing groups',
      'Mid sized regional processors',
      'Privately held engineering contractors',
      'Public sector infrastructure agencies',
      'Independent industrial distributors',
    ],
    designations: ['Procurement Manager', 'Design Engineer', 'Quality Manager', 'Production Manager', 'Maintenance Engineer', 'Sourcing Specialist'],
    buyerSegments: ['Manufacturing and Processing', 'Construction and Infrastructure', 'Transport and Logistics', 'Energy and Utilities', 'Industrial Distribution', 'Government and Public Agencies'],
  },
} satisfies Record<string, IndustryProfile>

export type IndustryKey = keyof typeof INDUSTRY_PROFILES

/**
 * Which industry a market belongs to, read off its name. Ordered: the first
 * match wins, so narrow trades are tested before the broad ones.
 */
const RULES: { key: IndustryKey; test: RegExp }[] = [
  // Machinery that happens to be called a platform, read before the software rule.
  { key: 'industrial_equipment', test: /\b(aerial|work|elevating|access|lifting|scissor|boom|mast)\s+platforms?\b/i },
  // A cell or module is a component even when the name says what it powers.
  { key: 'electronics', test: /\b(battery cells?|lithium[\s-]?ion|semiconductors?|microcontrollers?|chipsets?|wafers?|printed circuits?)\b/i },
  { key: 'consumer_electronics', test: /\b(headphones?|earphones?|earbuds?|speakers?|soundbars?|smart ?watch\w*|wearables?|fitness trackers?|television|\btv\b|laptops?|tablets?|smartphones?|mobile phones?|cameras?|gaming consoles?|printers?|monitors?|home appliances?|air purifiers?|vacuum cleaners?|electric (?:tooth)?brush\w*|shavers?|trimmers?|hearing aids?|air conditioners?|refrigerators?|washing machines?|microwaves?|smart home|streaming devices?|gaming|video games?)\b/i },
  { key: 'beverages', test: /\b(beverages?|drinks?|soft drinks?|carbonated|cola|coke|pepsi|soda|sparkling water|bottled water|energy drinks?|sports drinks?|juices?|iced tea|coffee|tea|dairy drinks?|smoothies?|squash|syrups?|tonic|mixers?)\b/i },
  { key: 'spices', test: /\b(spices?|seasonings?|masala|herbs?|condiments?|oleoresins?)\b/i },
  // The phrases carry this rule: bare "water" is a modifier far more often
  // than a product ("water bottle", "water heater", "coconut water").
  { key: 'water_treatment', test: /\b(water treatment|wastewater treatment|water and wastewater|water recycling|water reuse|water utilit\w+|effluent treatment|water|wastewater|effluent|desalination|sewage)\b/i },
  { key: 'diagnostics', test: /\b(diagnostics?|assays?|ivd|pathology|laborator\w+|testing kits?|reagents?)\b/i },
  { key: 'medical_devices', test: /\b(medical devices?|wound care|wound dressings?|wound|surgical|catheters?|implants?|orthop\w+|dental|npwt|patient|hospital equipment|hospital furniture|hospital beds?|medical furniture|therapy devices?|stents?|prosthe\w+)\b/i },
  { key: 'pharma', test: /\b(pharmaceuticals?|pharma|drugs?|biosimilars?|biologics?|vaccines?|generics?|api\b|medicines?|injectables?)\b/i },
  { key: 'cosmetics', test: /\b(essential oils?|cosmetic|cosmetics|skin ?care|hair ?care|personal care|beauty|fragrance|perfume|toiletr\w+)\b/i },
  { key: 'food_ingredients', test: /\b(ingredients?|lactoferrin|antioxidants?|emulsifiers?|enzymes?|proteins?|extracts?|additives?|nutraceuticals?|supplements?|flavou?rs?|sweeteners?|starch|probiotics?|whey|casein)\b/i },
  // Plant and edible oils are groceries; without them "oil" alone sends an
  // olive oil market to the petroleum profile.
  { key: 'consumer_goods', test: /\b((?:olive|coconut|sunflower|mustard|palm|groundnut|peanut|sesame|canola|rapeseed|soybean|rice bran|vegetable|edible|cooking)\s+oils?|ghee|snacks?|chips|crisps|baby (?:food|formula)|infant formula|cereals?|frozen foods?|ready meals?|sauces?|ice ?creams?|chocolates?|confectioner\w+|dairy|biscuits?|noodles?|packaged foods?|apparel|footwear|furniture|toys?|pet food|whisk(?:y|ey)|spirits?|wine|beer|household|detergents?|tobacco|consumer|grocer\w+|brush|brushes|toothbrush\w*|razors?|oral care|diapers?|tissue|mattress(?:es)?|luggage|watch(?:es)?|jewell?ery|water bottles?|drinkware|tumblers?|sippers?|vacuum flasks?|cookware|utensils?|crocker\w+|cutlery|tableware)\b/i },
  { key: 'agriculture', test: /\b(agricultur\w+|agri|crops?|fertili[sz]ers?|pesticides?|herbicides?|insecticides?|seeds?|farms?|farming|irrigation|agrochemicals?)\b/i },
  { key: 'drones_geospatial', test: /\b(drone|drones|uav|geospatial|lidar|remote sensing|aerial (survey|imaging|inspection)|photogrammetry|gis)\b/i },
  { key: 'datacenter', test: /\b(data ?cent(er|re)|colocation|hyperscale|server|rack|cooling infrastructure)\b/i },
  { key: 'software_platform', test: /\b(artificial intelligence|machine learning|generative ai|causal ai|\bai\b|software|saas|platform|cloud|cyber\w*|analytics|digital twin|automation software|erp|crm|payable|invoice|workflow|application)\b/i },
  { key: 'telecom', test: /\b(5g infrastructure|5g networks?|telecom infrastructure|network infrastructure|mobile infrastructure|telecom\w*|5g|mobile network|broadband|fibre|fiber|tower|spectrum|base station)\b/i },
  { key: 'electronics', test: /\b(semiconductors?|electronics|chipsets?|pcb|sensors?|displays?|battery cells?|microcontrollers?|integrated circuits?)\b/i },
  { key: 'renewables_hydrogen', test: /\b(renewable energy|solar energy|solar power|solar pv|wind energy|wind power|offshore wind|green hydrogen|renewable|solar|wind|hydrogen|electroly[sz]er|biofuel|green energy|energy storage|battery storage)\b/i },
  { key: 'power_grid', test: /\b(transmission|substation|power ?line|grid|utility asset|switchgear|transformer|distribution network|electricity)\b/i },
  // "Oil" on its own is a botanical or culinary word as often as a petroleum
  // one — tea tree, olive, coconut — so it only counts here in context.
  { key: 'oil_gas', test: /\b(oil and gas|oil ?field|crude oil|fuel oil|motor oil|engine oil|lubricating oil|heating oil|shale oil|gas|petroleum|refinery|refining|petrochemical|upstream|downstream|pipeline|lng)\b/i },
  { key: 'construction', test: /\b(construction|cement|concrete|building materials?|infrastructure|flooring|roofing|insulation|aggregates?|rebars?|tmt bars?|steel bars?|bricks?|tiles?)\b/i },
  { key: 'mining', test: /\b(mining|minerals?|ores?|smelting|metallurg\w+|steel|aluminium|aluminum|coal)\b/i },
  { key: 'automotive', test: /^(?!.*\b(rental|leasing|hire|sharing|subscription)\b).*\b(automotive|vehicles?|cars?|electric vehicles?|\bev\b|trucks?|two wheelers?|tyres?|tires?|auto components?)\b/i },
  { key: 'chemicals', test: /\b(lubricants?|greases?|solvents?|chemicals?|polymers?|resins?|adhesives?|coatings?|paints?|pigments?|surfactants?|catalysts?)\b/i },
  { key: 'packaging', test: /\b(packaging|packag\w+|cartons?|closures?|pouches?|label stock|container board|corrugated|boxes|crates?|wrapping|paper|paperboard|pet bottles?|glass bottles?|plastic bottles?|bottles?)\b/i },
  { key: 'logistics', test: /\b(logistics|freight|warehous\w+|supply chain|shipping|courier|cold chain|transport)\b/i },
  { key: 'industrial_equipment', test: /\b(equipment|machine\w*|pump|pumps|valve|valves|compressor|turbine|robot|robotics|aerial work platform|forklift|crane|conveyor|hvac)\b/i },
]

/**
 * Who ends up with the thing, when the industry is not one we name.
 *
 * The business test runs first: an office chair and a yoga mat are both
 * furniture to a keyword, but one is bought by a facilities manager and the
 * other off a shelf, and the word that settles it is "office".
 */
const BUSINESS_SIGNALS =
  /\b(industrial|commercial|enterprise|professional|institutional|medical|clinical|hospital|surgical|patient|laboratory|aerospace|military|defence|defense|marine|offshore|mining|agricultural|construction|office|warehouse|factory|plant|machinery|machine tools?|cnc|hydraulic|pneumatic|bearings?|gearbox|compressors?|generators?|turbines?|valves?|pumps?|fleet|b2b|wholesale|bulk)\b/i

/** Things a shopper buys, where no business word applies. */
const CONSUMER_SIGNALS =
  /\b(consumer|retail|household|personal|home|kitchen|baby|infant|pet|fashion|lifestyle|leisure|sports?|outdoor|wearable|handheld|portable|mats?|bicycles?|bikes?|instruments?|guitars?|pianos?|toys?|games?|luggage|backpacks?|watch(?:es)?|jewell?ery|cookware|bedding|mattress(?:es)?|sofas?|furniture|apparel|clothing|shoes?|footwear|cosmetics?|skin ?care|hair ?care|snacks?|beverages?|coffee|tea|strollers?|diapers?|books?|stationery|fitness|yoga|camping|gifts?|candles?|perfumes?|grooming|hobby|craft|water bottles?|drinkware|tumblers?|sippers?|vacuum flasks?|cookware|utensils?|crocker\w*|cutlery|tableware|lunch ?box(?:es)?)\b/i

/**
 * The market's subject: geography and the trailing report words removed, so
 * "India Water Bottle Market" is weighed as "Water Bottle".
 */
function subjectOf(name: string): string {
  let subject = stripScopePrefix(name)
  for (;;) {
    const next = subject
      .replace(/\s*\b(market|industry|analysis|report|outlook|forecast|size|share|trends?)\b\s*$/i, '')
      .trim()
    if (next === subject || !next) break
    subject = next
  }
  return subject || name.trim()
}

/**
 * Where a keyword lands decides what it means.
 *
 * A market name is a noun phrase: everything before the final noun describes
 * it. In "Water Bottle" the thing is a bottle and "water" only says which
 * kind, so a rule matching "water" is reading a modifier, not the product.
 * Matching anywhere in the name treated the two alike, which is how a water
 * bottle study came back surveying municipal wastewater utilities, an olive
 * oil study came back as petroleum, and steel cookware came back as mining.
 *
 * So a match is scored rather than taken on sight:
 *   • a match covering the head — the last word — identifies the product;
 *   • a multi-word match is specific enough to mean what it says;
 *   • a lone word anywhere else is a modifier and does not classify.
 *
 * Nothing reaching the floor falls through to the composed profile, which is
 * vaguer but reliably about the right trade. Confidently wrong is the worse
 * failure: it is the one that puts effluent discharge rules in front of a
 * client who sells drinkware.
 */
const HEAD_SCORE = 100
const WORD_SCORE = 10

function scoreRule(test: RegExp, subject: string): number {
  // Scan every match; the one nearest the head wins for this rule.
  const re = new RegExp(test.source, test.flags.includes('g') ? test.flags : test.flags + 'g')
  let best = -1
  for (const m of subject.matchAll(re)) {
    const matched = (m[0] ?? '').trim()
    if (!matched) continue
    const end = (m.index ?? 0) + (m[0]?.length ?? 0)
    const isHead = subject.slice(end).trim() === ''
    const words = matched.split(/\s+/).length
    // Only a head match or a multi-word phrase clears the floor.
    if (!isHead && words < 2) continue
    const score = (isHead ? HEAD_SCORE : 0) + words * WORD_SCORE
    if (score > best) best = score
  }
  return best
}

/**
 * Trades that sell to plants, grids, fleets and contractors. None of them
 * ever supplies a shopper, so none may serve a market that reads as one.
 */
const B2B_ONLY: ReadonlySet<IndustryKey> = new Set<IndustryKey>([
  'water_treatment',
  'power_grid',
  'renewables_hydrogen',
  'oil_gas',
  'mining',
  'construction',
  'chemicals',
  'industrial_equipment',
  'industrial',
  'logistics',
  'datacenter',
  'telecom',
  'agriculture',
  'packaging',
])

/** The named industry for a market, or null when nothing matches confidently. */
export function classifyIndustry(marketName: string | null | undefined): IndustryKey | null {
  const subject = subjectOf(marketName ?? '')
  if (!subject) return null

  let bestKey: IndustryKey | null = null
  let bestScore = -1
  // Rules stay in narrow-to-broad order, so an equal score keeps the first.
  for (const rule of RULES) {
    const score = scoreRule(rule.test, subject)
    if (score > bestScore) {
      bestScore = score
      bestKey = rule.key
    }
  }
  return bestScore < 0 ? null : bestKey
}

/**
 * The profile for a market: a named industry where one is recognised, and
 * otherwise one composed from who buys it and what kind of thing it is.
 *
 * Never heavy industry by default — that is how a headphone study ended up
 * surveying engineering contractors and public infrastructure agencies.
 */
export function industryProfile(marketName: string | null | undefined): IndustryProfile {
  const key = classifyIndustry(marketName)
  // "Office furniture" is furniture to a keyword and a facilities purchase in
  // life, so a business word overrides a consumer category.
  const consumerKey = key === 'consumer_goods' || key === 'consumer_electronics'
  const businessWord = BUSINESS_SIGNALS.test(marketName ?? '')
  // ...and the reverse. These trades sell to plants, grids and contractors,
  // never to a shelf, so a market that reads as a shopper's purchase is
  // better served by the composed consumer profile than by one of them.
  const shopperMarket = !businessWord && isConsumerMarket(marketName)
  const mismatched = key !== null && B2B_ONLY.has(key) && shopperMarket

  if (key && !mismatched && !(consumerKey && businessWord)) {
    return INDUSTRY_PROFILES[key]
  }

  const name = marketName ?? ''
  const subject =
    stripScopePrefix(name).replace(/\b(market|industry|analysis|report)\b/gi, '').trim() || name
  const audience = BUSINESS_SIGNALS.test(name)
    ? 'business'
    : CONSUMER_SIGNALS.test(name) || isConsumerMarket(name)
      ? 'consumer'
      : 'business'

  return composeProfile(subject, audience, offeringTypeOf(name))
}

/** The four scoring parameters every market shares on the business axis. */
export function commonBusinessParameters(where: string): ScoringParameter[] {
  const place = where && !/^global$/i.test(where) ? ` in ${where}` : ''
  return [
    p('Revenue Scale & Growth', `Revenue attributable to this market${place} and the rate at which it is growing, read from financial statements and investor material.`),
    p('Brand Strength & Market Share', `Recognition among buyers${place} and the share of category spend held against competing suppliers.`),
    p('Distribution Reach & Channel Network', `Strength of the route to market${place}: direct sales, distributors, dealers and online channels.`),
    p('Financial Health & Funding', 'Balance sheet strength, funding position and the capacity to invest behind growth or absorb a downturn.'),
  ]
}
