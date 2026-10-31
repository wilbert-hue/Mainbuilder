/**
 * The B2B and B2C questionnaires.
 *
 * The deterministic generators phrase every question from a theme table, which
 * keeps the framework rules but shows the template through: an industrial
 * gearbox gets asked which "pack or format" it is bought in, and an air
 * purifier is asked whether its quality is consistent "from pack to pack".
 *
 * The model fixes the vocabulary and breaks the rules instead — in testing it
 * wrote a whole section of yes/no questions and dropped the question mark off
 * nearly every consumer question. So the rules are checked here rather than
 * trusted: anything that fails goes back to the deterministic questionnaire.
 *
 * Server only.
 */

import { askForJson, cleanProse, COMMON_RULES } from '@/lib/llm-client'
import type {
  MarketProfileParts,
  QuestionSectionPart,
  GeneratedQuestionPart,
} from '@/lib/demo-generation-types'

const SELECT_ALL = 'Select all that apply.'

/** A question opening with one of these can be answered yes or no. */
const YES_NO_OPENER =
  /^(is|are|was|were|do|does|did|will|would|have|has|had|can|could|should|shall|may|might)\b/i

const B2B_SYSTEM = `You write a B2B buyer questionnaire for a market research study.

Return ONLY JSON: {"sections":[{"title":string,"questions":[{"text":string,"type":"single_choice"|"multi_choice"}]}]}

Exactly 4 sections of 6 questions each. Use the section titles given to you, in the order given.
Section 1 is about buying and suppliers and its FIRST question asks what the organisation chose.
Section 2 is about adoption and use.
Section 3 is about experience with what they chose.
Section 4 is about the future - EVERY question in it must be future or conditional tense.

Rules, all mandatory:
- One idea per question. Every question is closed and ends with a question mark.
- NEVER a question that can be answered yes or no. Never start a question with
  Is, Are, Do, Does, Did, Will, Would, Have, Has, Can, Could or Should.
- Never ask "how often" on its own. Never name a calendar year. Never use a hyphen.
- Write numbers as digits. Never put the answer options inside the question text.
- Every question must apply to every respondent in this market.
- A multi_choice question ends with "? ${SELECT_ALL}" and a single_choice question never does.
- Vary the wording. Six questions that differ only by one noun are wrong.
${COMMON_RULES}`

const B2C_SYSTEM = `You write a B2C consumer questionnaire for a market research study.

Return ONLY JSON: {"sections":[{"title":string,"questions":[{"text":string,"type":"single_choice"|"multi_choice"}]}]}

Exactly 4 sections of 5 questions each, with these titles and in this order:
1 what was bought, which variant, which claim decided it
2 where they buy, what they pay, and why
3 whether it performs, what goes wrong, value for money
4 repurchase, switching, what they want next, next budget

Write a short Title Case title for each section naming this market's subject.

Rules, all mandatory:
- One idea per question. Every question is closed and ends with a question mark.
- NEVER a question that can be answered yes or no. Never start a question with
  Is, Are, Do, Does, Did, Will, Would, Have, Has, Can, Could or Should.
- No questions about frequency, duration, household role, storage, or how they first heard of it.
- Never use the wording "latest purchase". Never name a calendar year. Never use a hyphen.
- EXACTLY ONE question in the whole questionnaire may use the word "brand". The other 19 must not.
- Never put example answers inside a question. No "e.g.", and no bracketed list of options.
- Every question must apply to every respondent.
- A multi_choice question ends with "? ${SELECT_ALL}" and a single_choice question never does.
- A multi_choice question never asks which main item they bought.
- Write for a shopper, in the words a shopper uses.
${COMMON_RULES}`

/**
 * Say why a question was thrown out, when asked.
 *
 * A questionnaire falls back as a whole, so without this a rejection is a
 * silent "FELL BACK" and the rule that fired is anyone's guess. Set LLM_DEBUG
 * to see it; it is off in production because a rejection is routine, not an
 * error.
 */
function reject(reason: string, text: unknown): null {
  if (process.env.LLM_DEBUG) {
    console.error(`  rejected [${reason}]: ${typeof text === 'string' ? text : JSON.stringify(text)}`)
  }
  return null
}

/**
 * Normalise one question, repairing only what is safe to repair.
 *
 * A missing question mark is a formatting slip the model makes constantly and
 * fixing it changes no meaning. Everything else is a rule break and is left to
 * fail, because quietly rewriting a question is how a leading one gets through.
 */
function cleanQuestion(raw: unknown): GeneratedQuestionPart | null {
  if (!raw || typeof raw !== 'object') return reject('not an object', raw)
  const rec = raw as Record<string, unknown>
  let text = cleanProse(rec.text)
  const type = rec.type === 'multi_choice' ? 'multi_choice' : 'single_choice'

  if (text.length < 12 || text.length > 220) return reject('length', text)

  if (type === 'multi_choice') {
    // Accept it with or without the suffix, then impose the exact wording.
    text = text.replace(new RegExp(`\\s*${SELECT_ALL.replace('.', '\\.')}\\s*$`, 'i'), '').trim()
    if (!text.endsWith('?')) text = `${text}?`
    text = `${text} ${SELECT_ALL}`
  } else {
    if (text.endsWith('.')) text = `${text.slice(0, -1).trim()}?`
    if (!text.endsWith('?')) text = `${text}?`
    if (text.includes(SELECT_ALL)) return reject('select-all on single choice', text)
  }

  // House style has no hyphens. Opening one out changes no meaning, and
  // throwing away twenty-four good questions over "next-generation" is a worse
  // outcome than writing "next generation".
  text = text.replace(/(\w)-(\w)/g, '$1 $2').replace(/\s*-\s*/g, ' ').replace(/\s+/g, ' ').trim()

  if (YES_NO_OPENER.test(text)) return reject('yes/no opener', text)
  if (/\b(19|20)\d{2}\b/.test(text)) return reject('calendar year', text)
  if (/how often/i.test(text) && !/\b(per|each|in a|a year|a month|a week)\b/i.test(text)) {
    return reject('bare how often', text)
  }
  if (/latest purchase/i.test(text)) return reject('latest purchase', text)
  // "Which packaging feature (e.g., bottle, can, label) attracts you?" shows the
  // respondent its own answer options, which leads the answer.
  if (/\be\.?g\.?\b|\bfor example\b/i.test(text)) return reject('example answers in question', text)

  // One question mark: a second means two questions in one.
  if ((text.match(/\?/g) || []).length !== 1) return reject('question mark count', text)

  return { text, type }
}

/** Shape one section, requiring every question in it to pass. */
function cleanSection(raw: unknown, perSection: number): QuestionSectionPart | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Record<string, unknown>
  const title = cleanProse(rec.title).replace(/[.;,]+$/, '').trim()
  if (title.length < 3 || title.length > 70) return reject('section title', title)
  if (!Array.isArray(rec.questions)) return reject('questions not an array', rec.questions)

  const questions: GeneratedQuestionPart[] = []
  const seen = new Set<string>()
  for (const q of rec.questions) {
    const question = cleanQuestion(q)
    if (!question) return null
    const key = question.text.toLowerCase()
    if (seen.has(key)) return reject('duplicate question', question.text)
    seen.add(key)
    questions.push(question)
  }

  return questions.length === perSection
    ? { title, questions }
    : reject(`section has ${questions.length} questions, want ${perSection}`, title)
}

function cleanSections(value: unknown, perSection: number): QuestionSectionPart[] | null {
  if (!Array.isArray(value) || value.length !== 4) {
    return reject(`section count ${Array.isArray(value) ? value.length : 'none'}`, '')
  }
  const out: QuestionSectionPart[] = []
  for (const raw of value) {
    const section = cleanSection(raw, perSection)
    if (!section) return null
    out.push(section)
  }
  return out
}

/** Every question across the questionnaire, flattened. */
const allQuestions = (sections: QuestionSectionPart[]): GeneratedQuestionPart[] =>
  sections.flatMap((s) => s.questions)

/**
 * Write a questionnaire for a market.
 *
 * `profile.askUnit` is what carries the Diet Coke fix: when the market name is
 * itself a brand, the questionnaire is told to ask about a pack size or a
 * retailer instead, and any question that says "brand" anyway is rejected.
 */
export async function generateQuestionnaire(
  market: string,
  profile: MarketProfileParts,
  kind: 'b2b' | 'b2c',
  sectionTitles: string[] | null,
  signal?: AbortSignal
): Promise<QuestionSectionPart[] | null> {
  const name = market.trim()
  if (name.length < 3) return null

  const perSection = kind === 'b2b' ? 6 : 5
  const titleBlock =
    kind === 'b2b' && sectionTitles?.length === 4
      ? `\nSection titles, in order: ${sectionTitles.join(' | ')}`
      : ''

  const brandBlock = profile.isBrand
    ? `\n\nIMPORTANT: "${profile.subject}" is itself a single brand, not a category of competing brands. A question asking which brand they chose has only one possible answer and reads as a mistake. Do NOT use the word "brand" anywhere in this questionnaire. Ask about the ${profile.askUnit} instead, and about where they buy it and which variant.`
    : `\nAsk about the ${profile.askUnit} where the questionnaire asks what was chosen.`

  const parsed = await askForJson(
    `${kind}-questions`,
    kind === 'b2b' ? B2B_SYSTEM : B2C_SYSTEM,
    `Market: ${name}\nSubject: ${profile.subject}\nWhat it is: ${profile.definition}${titleBlock}${brandBlock}`,
    4000,
    signal
  )
  if (!parsed) return null

  const sections = cleanSections(parsed.sections, perSection)
  if (!sections) return null

  const questions = allQuestions(sections)

  // The reason the profile call exists: a market that is one brand must never
  // be asked which brand it is.
  if (profile.isBrand && questions.some((q) => /\bbrands?\b/i.test(q.text))) {
    return reject('brand question on a single-brand market', '')
  }

  // A consumer questionnaire asks about brand exactly once.
  if (kind === 'b2c' && !profile.isBrand) {
    const brandQuestions = questions.filter((q) => /\bbrands?\b/i.test(q.text)).length
    if (brandQuestions > 1) return reject(`${brandQuestions} brand questions, want 1`, '')
  }

  // Six questions that differ only by one noun was a real failure in testing:
  // "Which brand do you use for foam dressings?" five times over.
  for (const section of sections) {
    const openings = new Set(section.questions.map((q) => q.text.split(' ').slice(0, 4).join(' ').toLowerCase()))
    if (openings.size < Math.ceil(section.questions.length / 2)) {
      return reject(`only ${openings.size} distinct openings in "${section.title}"`, '')
    }
  }

  return sections
}
