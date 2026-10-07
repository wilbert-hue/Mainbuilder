/**
 * Contact enrichment — POST /api/enrich
 *
 * Backs the "Access data" cells in the preview directories (see
 * components/charts/AccessDataCell.tsx), revealing a contact on demand instead
 * of shipping emails and phone numbers in the page.
 *
 * Backed by SalesQL's person-enrichment endpoint, which resolves a *named
 * individual* only: its accepted parameter groups are [linkedin_url], [email],
 * [full_name + organization_name] and [full_name + organization_domain]. There
 * is no company-only lookup — SalesQL lists Prospector/Search as "coming soon"
 * — so a row with no contact name and no personal LinkedIn URL is reported as
 * a miss rather than guessed at.
 *
 * The API key stays on the server; the browser never sees it.
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ENRICH_URL = 'https://api-public.salesql.com/v1/persons/enrich'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 15_000

interface SalesQlPerson {
  full_name?: string
  title?: string
  linkedin_url?: string
  emails?: Array<{ email?: string; type?: string; status?: string }>
  phones?: Array<{ phone?: string; type?: string; is_valid?: boolean }>
}

/** Repeat lookups of the same person cost nothing and return instantly. */
const cache = new Map<string, { at: number; person: SalesQlPerson | null }>()

function cached(key: string): { person: SalesQlPerson | null } | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return { person: hit.person }
}

const asText = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** A personal profile, not a company page — only /in/ URLs identify a person. */
const personalLinkedIn = (url: string): string => (/\/in\//.test(url) ? url : '')

/** Accepts a bare domain, a URL, or an email address. */
function toDomain(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  const fromEmail = value.includes('@') ? value.split('@').pop() ?? '' : value
  return fromEmail
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[/?#].*$/, '')
    .trim()
}

/**
 * Build the query from whichever identifier group the row can satisfy, best
 * first. A personal LinkedIn URL is exact; domain beats company name, which
 * matches poorly — "MG Motor India" misses where the domain resolves.
 */
function buildQuery(input: {
  person: string
  company: string
  domain: string
  linkedin: string
}): URLSearchParams | null {
  const params = new URLSearchParams()
  if (input.linkedin) {
    params.set('linkedin_url', input.linkedin)
    return params
  }
  if (!input.person) return null
  params.set('full_name', input.person)
  if (input.domain) {
    params.set('organization_domain', input.domain)
    return params
  }
  if (input.company) {
    params.set('organization_name', input.company)
    return params
  }
  return null
}

/** Work contacts first, then anything verified, then whatever exists. */
function pickEmail(person: SalesQlPerson): string {
  const emails = (person.emails ?? []).filter((e) => asText(e.email))
  if (!emails.length) return ''
  const work = emails.find((e) => (e.type ?? '').toLowerCase() === 'work')
  const verified = emails.find((e) => (e.status ?? '').toLowerCase() === 'verified')
  return asText((work ?? verified ?? emails[0]).email)
}

function pickPhone(person: SalesQlPerson): string {
  const phones = (person.phones ?? []).filter((p) => asText(p.phone))
  if (!phones.length) return ''
  const work = phones.find((p) => (p.type ?? '').toLowerCase() === 'work' && p.is_valid !== false)
  const valid = phones.find((p) => p.is_valid !== false)
  return asText((work ?? valid ?? phones[0]).phone)
}

/** A fresh response each time: a NextResponse body is a one-shot stream, so a
 *  shared instance would serialise empty on its second use. */
const notFound = () => NextResponse.json({ found: false })

export async function POST(request: NextRequest) {
  const apiKey = process.env.SALESQL_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { found: false, error: 'Contact lookup is not configured.' },
      { status: 503 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ found: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  const input = {
    person: asText(body.person),
    company: asText(body.company),
    domain: toDomain(asText(body.domain)),
    linkedin: personalLinkedIn(asText(body.linkedin)),
  }

  const query = buildQuery(input)
  // No name and no personal profile URL — nothing the API can resolve.
  if (!query) return notFound()

  const key = query.toString()
  let person: SalesQlPerson | null
  const hit = cached(key)

  if (hit) {
    person = hit.person
  } else {
    try {
      const res = await fetch(`${ENRICH_URL}?${key}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (res.status === 404) {
        cache.set(key, { at: Date.now(), person: null })
        return notFound()
      }
      if (!res.ok) {
        // Provider-side failure may be transient, so it is not cached. The
        // client retries on a non-OK status rather than showing "not found".
        return NextResponse.json({ found: false, error: 'Lookup failed.' }, { status: 502 })
      }
      person = (await res.json()) as SalesQlPerson
      cache.set(key, { at: Date.now(), person })
    } catch {
      return NextResponse.json({ found: false, error: 'Lookup failed.' }, { status: 502 })
    }
  }

  if (!person) return notFound()

  const email = pickEmail(person)
  const phone = pickPhone(person)
  const name = asText(person.full_name)
  const title = asText(person.title)
  const linkedin = asText(person.linkedin_url)

  // Nothing worth revealing — report a miss so the cell shows the not-found note.
  if (!email && !phone && !name && !linkedin) return notFound()

  return NextResponse.json({ found: true, name, title, email, phone, linkedin })
}
