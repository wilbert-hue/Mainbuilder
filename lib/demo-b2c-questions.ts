/**
 * The B2C demo questionnaire: 4 sections of 5 questions, written to the
 * consumer survey guide.
 *
 *   1  what was bought, which variant, which claim decided it
 *   2  where they buy, what they pay, which brand and why
 *   3  whether it performs, what goes wrong, value for money
 *   4  repurchase, switching, what they want next, next budget
 *
 * Section 3 follows the kind of offering: a consumable is asked about taste
 * and quality, a durable about reliability and after sales, a service about
 * support, a digital product about features and the plan.
 *
 * Rules kept: no frequency, duration, household role, storage, awareness or
 * trigger questions; no "latest purchase" wording; every question applies to
 * every respondent; multi choice ends with "? Select all that apply." and
 * never asks for the main item; exactly one brand question.
 */

import type { ConsumerOffering } from '@/lib/demo-survey-offering'

export interface ConsumerQuestion {
  text: string
  type: 'single_choice' | 'multi_choice'
}

export interface ConsumerSection {
  title: string
  focus: string
  questions: ConsumerQuestion[]
}

const one = (text: string): ConsumerQuestion => ({ text, type: 'single_choice' })
const many = (text: string): ConsumerQuestion => ({ text, type: 'multi_choice' })

/** Section 3 differs by what the thing is; everything else is shared. */
function experienceQuestions(s: string, offering: ConsumerOffering): ConsumerQuestion[] {
  if (offering === 'durable') {
    return [
      one(`How well has the ${s} you bought performed against what you expected?`),
      one(`How reliable has your ${s} been since you bought it?`),
      many(`Which problems have you had with your ${s}? Select all that apply.`),
      one(`How was your experience when you needed service or support for your ${s}?`),
      one(`How good is the value for money of the ${s} you bought?`),
    ]
  }
  if (offering === 'service') {
    return [
      one(`How well has your ${s} matched what you were promised?`),
      one(`How quickly were your questions about your ${s} answered?`),
      many(`Which problems have you had with your ${s}? Select all that apply.`),
      one(`How easy was it to get an issue with your ${s} resolved?`),
      one(`How good is the value for money of the ${s} you pay for?`),
    ]
  }
  if (offering === 'digital') {
    return [
      one(`Which part of your ${s} do you use most?`),
      one(`How reliable has your ${s} been when you need it?`),
      many(`Which problems have you had with your ${s}? Select all that apply.`),
      one(`How helpful was support when something went wrong with your ${s}?`),
      one(`How good is the value for money of the plan you pay for?`),
    ]
  }
  return [
    one(`How well does the quality of the ${s} you buy match what you expect?`),
    one(`How consistent is the quality of the ${s} you buy from pack to pack?`),
    many(`Which problems have you had with the ${s} you buy? Select all that apply.`),
    one(`How does the ${s} you buy compare with what you paid?`),
    one(`How good is the value for money of the ${s} you buy?`),
  ]
}

const SECTION_TITLES: Record<ConsumerOffering, [string, string, string, string]> = {
  consumable: [
    'Product Choice and Labels',
    'Shops Prices and Brands',
    'Quality and Value',
    'Repurchase and Future Budget',
  ],
  durable: [
    'Product Choice and Features',
    'Shops Prices and Brands',
    'Performance and Support',
    'Repurchase and Future Budget',
  ],
  service: [
    'Plan Choice and Features',
    'Where and What You Pay',
    'Service Quality and Value',
    'Renewal and Future Budget',
  ],
  digital: [
    'Plan Choice and Features',
    'Where and What You Pay',
    'Features and Value',
    'Renewal and Future Budget',
  ],
}

const FOCUS: [string, string, string, string] = [
  'What people bought and which claim or feature decided it.',
  'Where people buy {s}, what they pay and which brand they choose.',
  'How {s} performs, what goes wrong and whether it is worth the money.',
  'What people will buy next, what would make them switch and what they will spend.',
]

/**
 * Build the consumer questionnaire. 19 questions across 4 sections, with the
 * single brand question in section 2.
 */
export function buildB2cQuestionnaire(
  subject: string,
  offering: ConsumerOffering
): ConsumerSection[] {
  const s = subject.toLowerCase()
  const titles = SECTION_TITLES[offering]
  const isPlan = offering === 'service' || offering === 'digital'
  const decider = isPlan
    ? `What decided the ${s} plan you chose?`
    : `Which feature decided the ${s} you chose?`
  const whatMatters =
    offering === 'service'
      ? `Which parts of the cover matter to you when choosing ${s}? Select all that apply.`
      : offering === 'digital'
        ? `Which parts of the plan matter to you when choosing ${s}? Select all that apply.`
        : `Which claims on the pack matter to you when choosing ${s}? Select all that apply.`
  // A shopper buys a size of oil and a plan of insurance; never a "size or plan".
  const unit = isPlan ? 'plan' : 'pack size'
  const chosen = isPlan ? 'plan' : 'type'

  const sections: ConsumerQuestion[][] = [
    [
      one(`Which type of ${s} do you buy for yourself or your home?`),
      one(decider),
      many(whatMatters),
      one(`Which ${unit} of ${s} do you buy?`),
      one(`What is the main reason you chose that ${chosen} over the alternatives?`),
    ],
    [
      one(`Where do you buy ${s}?`),
      one(`What do you pay for the ${s} you buy?`),
      // The one brand question the survey is allowed, in the required form.
      one(`Which brand did you buy because it offered quality, steady pricing and wide availability?`),
      one(`What is the main reason you buy that brand of ${s}?`),
      many(`Which sources do you check before choosing ${s}? Select all that apply.`),
    ],
    experienceQuestions(s, offering),
    [
      one(`Would you buy the same ${s} again next time?`),
      one(`What would make you switch to a different brand of ${s}?`),
      many(`Which improvements would you want in the ${s} you buy? Select all that apply.`),
      one(`Where would you buy ${s} next time?`),
      one(`What do you plan to spend on ${s} next time?`),
    ],
  ]

  return sections.map((questions, i) => ({
    title: titles[i],
    focus: FOCUS[i].replace('{s}', s),
    questions,
  }))
}
