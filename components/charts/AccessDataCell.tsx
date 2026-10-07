'use client'

import { useState } from 'react'

/**
 * Gated contact cell in the preview tables. Clicking "Access data" looks the row's
 * contact up through /api/enrich (served by the gated vault site, which holds the
 * SalesQL key) and fills in whichever field this column shows.
 */

export type ContactField = 'email' | 'phone' | 'linkedin' | 'name' | 'title'

/** Which contact field a column header asks for, or null if it is not a contact column. */
export function contactFieldOf(header: string): ContactField | null {
  const h = header.trim().toLowerCase()
  if (h.includes('email')) return 'email'
  if (h.includes('phone') || h === 'office no.' || h.includes('mobile')) return 'phone'
  if (h.includes('linkedin')) return 'linkedin'
  if (h === 'contact person') return 'name'
  if (h === 'role' || h === 'contact role' || h === 'designation') return 'title'
  return null
}

interface LookupResult {
  found: boolean
  name?: string
  title?: string
  email?: string
  phone?: string
  linkedin?: string
}

type Row = Record<string, unknown>

const pick = (row: Row, keys: string[]) => {
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

// One lookup per row, shared by every cell in it, so revealing Email and then
// Phone for the same company only spends one credit.
const lookups = new Map<string, Promise<LookupResult>>()

function lookup(row: Row): Promise<LookupResult> {
  const query = {
    person: pick(row, ['Contact Person']),
    company: pick(row, ['Company Name', 'Company', 'Customer Name/Company Name']),
    domain: pick(row, ['Domain', 'Website', 'Office Website', 'Email', 'Office Email']),
    linkedin: pick(row, ['LinkedIn']),
  }
  const key = JSON.stringify(query)
  let p = lookups.get(key)
  if (!p) {
    p = fetch('/api/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    }).then((r) => {
      if (r.status === 401 || r.status === 404) return { found: false }
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json() as Promise<LookupResult>
    })
    // Let a failed request be retried instead of caching the failure.
    p.catch(() => lookups.delete(key))
    lookups.set(key, p)
  }
  return p
}

const NOT_FOUND = "Oops, we were not able to find relevant person's data for this company"

export function AccessDataCell({ row, field }: { row: Row; field: ContactField }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [value, setValue] = useState('')

  async function reveal() {
    setState('loading')
    try {
      const res = await lookup(row)
      setValue(res.found ? res[field] || '' : '')
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    if (!value) return <span className="text-xs italic text-slate-500">{NOT_FOUND}</span>
    if (field === 'email') return <a className="text-sky-700 hover:underline break-all" href={`mailto:${value}`}>{value}</a>
    if (field === 'phone') return <a className="text-sky-700 hover:underline" href={`tel:${value.replace(/\s+/g, '')}`}>{value}</a>
    if (field === 'linkedin') return <a className="text-sky-700 hover:underline break-all" href={value} target="_blank" rel="noopener noreferrer">{value}</a>
    return <span>{value}</span>
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={reveal}
        disabled={state === 'loading'}
        className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 transition hover:bg-sky-100 disabled:cursor-wait disabled:opacity-60"
      >
        {state === 'loading' ? 'Looking up…' : 'Access data'}
      </button>
      {state === 'error' && <span className="text-[11px] text-rose-600">Lookup failed, please try again.</span>}
    </span>
  )
}
