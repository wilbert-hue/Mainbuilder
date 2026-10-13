/**
 * Demo METHODOLOGY block for the intelligence tables.
 *
 * An uploaded workbook carries its own METHODOLOGY rows above the table and
 * those always win. When the builder's static/demo toggle is on there is no
 * workbook, so the block is written from the market name instead: the same
 * three sections an analyst export uses, with the market's own subject
 * threaded through every line.
 *
 * Nothing here is market data. It describes how the directory *would* be
 * assembled, which is exactly what the locked preview is selling.
 */

import type { MethodologySection } from '@/lib/intelligence-sheet-types'

/** "Global Advance Wound Care Market" → "Advance Wound Care". */
function marketSubject(market: string): string {
  let subject = market.trim()
  for (;;) {
    const next = subject
      .replace(/\s*(industry|market|analysis|report|devices?)\s*$/i, '')
      .replace(/^(global|worldwide)\s+/i, '')
      .trim()
    if (next === subject || !next) break
    subject = next
  }
  return subject || market.trim()
}

/** Buyer-side organisations, chosen by what the market plainly is. */
function organisations(subject: string): string[] {
  const s = subject.toLowerCase()
  if (/(health|medical|clinic|wound|surgical|patient|pharma|diagnost|therapy|device)/.test(s)) {
    return [
      'Multinational hospital chains',
      'Regional public healthcare networks',
      'Large non profit nursing home networks',
      'Independent private clinics',
      'Mid sized home healthcare groups',
    ]
  }
  if (/(software|platform|cloud|analytics|data|digital|saas|cyber|ai)/.test(s)) {
    return [
      'Global enterprise IT organisations',
      'Regional managed service providers',
      'Public sector technology departments',
      'High growth technology companies',
      'Mid market shared service centres',
    ]
  }
  if (/(energy|power|oil|gas|solar|battery|grid|utility|renewable)/.test(s)) {
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

/** Buy-side job titles — the people a primary-research call actually reaches. */
function designations(): string[] {
  return [
    'Procurement Manager',
    'Purchasing Specialist',
    'Supply Chain Lead',
    'Category Manager',
    'Head of Operations',
    'Technical Evaluation Lead',
  ]
}

/** Events that mark a live buying window for this market. */
function triggerSignals(subject: string): string[] {
  const lower = subject.toLowerCase()
  return [
    `Opening a new ${lower} facility or expanding existing capacity`,
    `Hiring specialists or certified staff for a new ${lower} programme`,
    `Launching a new ${lower} service line or dedicated team`,
    `Adding ${lower} equipment or upgrading installed systems`,
    `Securing accreditation or certification covering ${lower}`,
  ]
}

/**
 * The three-section block shown above a demo intelligence table.
 * Returns an empty array without a market name, so the caller can skip the panel.
 */
export function buildDemoMethodology(
  market: string | null | undefined,
  intelligenceSource: 'customer' | 'distributor' = 'customer'
): MethodologySection[] {
  const name = (market ?? '').trim()
  if (!name) return []

  const subject = marketSubject(name)
  const audience = intelligenceSource === 'distributor' ? 'distributors and channel partners' : 'buyers'

  return [
    {
      title: 'Primary Research',
      groups: [
        { title: 'Organizations we surveyed', items: organisations(subject) },
        { title: 'Designations we spoke to', items: designations() },
      ],
      paragraphs: [
        `Verified telephone and email interviews with ${audience} active in ${subject}, re-validated every quarter.`,
      ],
    },
    {
      title: 'Real-time Trigger Signals',
      groups: [{ items: triggerSignals(subject) }],
      paragraphs: ['…and 50+ other trigger signals'],
    },
    {
      title: 'Intent Capture from Search Results (Real-time)',
      groups: [],
      paragraphs: [
        `Intent data is captured from the search and content behaviour of organisations researching ${subject}, then matched back to the company record so the directory reflects who is in-market now.`,
      ],
    },
  ]
}
