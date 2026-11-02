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

import { askForJson, cleanProse, reject, stockStageTitles, COMMON_RULES } from '@/lib/llm-client'
import type {
  MarketProfileParts,
  QuestionSectionPart,
  GeneratedQuestionPart,
} from '@/lib/demo-generation-types'

const SELECT_ALL = 'Select all that apply.'

/** A question opening with one of these can be answered yes or no. */
const YES_NO_OPENER =
  /^(is|are|was|were|do|does|did|will|would|have|has|had|can|could|should|shall|may|might)\b/i

/**
 * A stand-in for the thing being bought.
 *
 * "Where did you purchase the ingredient?" only means something after another
 * question has said which ingredient, which is what made a questionnaire read
 * as a conversation rather than twenty independent items.
 */
const STANDS_IN_FOR_SUBJECT =
  /\b(the|this|that|your|their|its)\s+(product|item|ingredient|unit|device|service|brand|offering|solution|supplier|provider|retailer|purchase|one)\b/i

/** Wording that points at another question instead of asking its own. */
const BACK_REFERENCE =
  /\b(you (chose|selected|picked|mentioned|named|identified)|the one you|chosen (brand|supplier|product|provider)|previous(ly)? (question|answer)|above|aforementioned|same (brand|product|supplier) again)\b/i

/** Conversational register, where a survey wants a neutral one. */
const CONVERSATIONAL =
  // "fell short" was here and came out again: it is ordinary business register,
  // and once a question names its own subject in full there is nothing chatty
  // left in it. Banning it only cost retries.
  /\b(ultimately|opt(ed)? for|happen to|end(ed)? up|by any chance|would you say|feel like)\b/i

/**
 * The respondent described from outside.
 *
 * Told not to say "you", the model starts asking what "the shopper" would do,
 * which is a question about somebody else.
 */
const THIRD_PERSON_RESPONDENT =
  /\b(the|a)\s+(shopper|consumer|customer|buyer|respondent|participant|user|purchaser)\b/i

const B2B_SYSTEM = `You write a B2B buyer questionnaire for a market research study.

Return ONLY JSON: {"sections":[{"title":string,"questions":[{"text":string,"type":"single_choice"|"multi_choice"}]}]}

Exactly 4 sections of 6 questions each. Use the section titles given to you, in the order given.
Section 1 is about buying and suppliers and its FIRST question asks what the organisation chose.
Section 2 is about adoption and use.
Section 3 is about experience with what they chose.
Section 4 is about the future - EVERY question in it must be future or conditional tense.

EVERY QUESTION MUST STAND ALONE. A respondent may see it on its own, in any order, with no other
question in front of it. So each one names the subject in full and never points back at another
question or at an answer given earlier.

Rules, all mandatory:
- Name the subject in full in every question. Never "the product", "the item", "the supplier",
  "it" or any other word standing in for it, and never "the one you chose".
- Write in a neutral survey register. No conversational wording: not "ultimately", "opt for",
  "might you consider", "happen to", "end up", "by any chance".
- Never describe the respondent from outside. No "the shopper", "the customer", "the buyer",
  "the respondent". Ask about the purchase itself, in the passive voice.
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

NEVER list possible answers inside a question. No "e.g.", no "such as", no bracketed list of
types. "Which type of wound care product (e.g., dressing, bandage, negative pressure device) was
purchased?" is wrong — the options belong in the answer list, not the question. Write "Which type
of advanced wound care product was purchased most recently?" and stop there.

Exactly 4 sections of 5 questions each, with these titles and in this order:
1 what was bought, which variant, which claim decided it
2 where they buy, what they pay, and why
3 whether it performs, what goes wrong, value for money
4 repurchase, switching, what they want next, next budget

Write a short Title Case title for each section, in the language a shopper of THIS thing would
recognise. Name the actual activity, not the abstract stage.

Write a short Title Case title for each section. Every title must NAME the market's short subject
and say its stage in the words a shopper of THIS thing would use. Do not repeat the section
description above as the title.

NEVER use the words Buying, Purchase, Purchasing, Adoption, Usage, Performance, Investment,
Repurchase or Intentions. Those are the stock words, and using them makes every market's tabs read
identically. Say the same thing in this market's own language instead.

For an air purifier market:
  ["Choosing an Air Purifier", "Where Air Purifiers Are Bought",
   "Living With an Air Purifier", "The Next Air Purifier"]

EVERY QUESTION MUST STAND ALONE. A respondent may see it on its own, in any order, with no other
question in front of it. So each one names the subject in full and never points back at another
question.

BAD - these only make sense read in sequence, and read as a conversation rather than a survey:
  "Which product type did you select?"        (which product? names nothing)
  "Where did you purchase the ingredient?"    ("the ingredient" points at an earlier answer)
  "Which performance attribute fell short?"   (short of what? assumes the question before it)
  "Which alternative might you consider next?"

GOOD - each names its own subject and could be asked first:
  "Which type of plant based protein ingredient was purchased most recently?"
  "At which type of retailer were the plant based protein ingredients purchased?"
  "Which aspect of plant based protein ingredient performance was rated lowest?"

Rules, all mandatory:
- Name the subject in full in every question. Never "the product", "the item", "the ingredient",
  "the unit", "the service", "it", "that one" or any other word standing in for it.
- Never refer to a previous question, a previous answer, or anything "you chose" earlier.
- Write in a neutral survey register. No conversational wording: not "ultimately", "opt for",
  "might you consider", "happen to", "end up", "by any chance".
- Never describe the respondent from outside. No "the buyer", "the customer", "the respondent".
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
  if (BACK_REFERENCE.test(text)) return reject('refers to another question', text)
  if (CONVERSATIONAL.test(text)) return reject('conversational register', text)
  if (THIRD_PERSON_RESPONDENT.test(text)) return reject('respondent in third person', text)
  // "Which packaging feature (e.g., bottle, can, label) attracts you?" shows the
  // respondent its own answer options, which leads the answer.
  // Listing the options inside the question is the model's most stubborn habit:
  // "Which channel (direct sales, distributor, online portal) was used?" Cutting
  // the bracket out leaves the question intact and asking the same thing, so it
  // is repaired rather than refused — refusing it threw away the other 19.
  text = text
    .replace(/\s*\((?:e\.?g\.?|such as|for example)[^)]*\)/gi, '')
    .replace(/\s*\([^)]*,[^)]*\)/g, '')
    .replace(/\s+([?,.])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

  // Outside brackets there is no safe cut: "Which type, such as foam or film,
  // was bought?" needs rewriting, not trimming.
  if (/\be\.?g\.?\b|\bfor example\b|\bsuch as\b/i.test(text)) {
    return reject('example answers in question', text)
  }

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


const SUBJECT_STOPWORDS = new Set(['and', 'for', 'the', 'with', 'based', 'global', 'market'])

/**
 * Word stems a question can use to name this market's subject.
 * Stemmed to five characters so "ingredients" matches "ingredient".
 */
function subjectStems(subject: string): string[] {
  return subject
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length >= 4 && !SUBJECT_STOPWORDS.has(word))
    .map((word) => word.slice(0, 5))
}

/**
 * How many questions name what they are asking about.
 *
 * Banning the stand-in words is not enough on its own: the model answers a ban
 * on "the product" by dropping the noun altogether ("Which type was
 * purchased?"), which is just as dependent on the question before it.
 */
function namesSubject(text: string, stems: string[]): boolean {
  if (!stems.length) return true
  const lower = text.toLowerCase()
  return stems.some((stem) => lower.includes(stem))
}

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


  // The four stages named with the stock words give every market the same tabs.
  const stock = stockStageTitles(sections.map((s) => s.title))
  if (stock.length) return reject('section titles use the stock stage words', stock.join(' / '))

  // A questionnaire where most questions never name their own subject reads as
  // one conversation in twenty parts.
  const stems = subjectStems(profile.subject)
  const named = questions.filter((q) => namesSubject(q.text, stems)).length
  if (named < Math.ceil(questions.length * 0.7)) {
    return reject(`only ${named} of ${questions.length} questions name the subject`)
  }

  // A stand-in is only a problem in a question that never says what it is
  // standing in for. "Which claim on the plant based protein ingredient
  // packaging influenced the purchase decision?" says it twice over.
  const orphaned = questions.find(
    (q) => STANDS_IN_FOR_SUBJECT.test(q.text) && !namesSubject(q.text, stems)
  )
  if (orphaned) return reject('stands in for a subject it never names', orphaned.text)

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
