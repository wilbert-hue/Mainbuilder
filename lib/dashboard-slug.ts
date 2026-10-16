/**
 * The share link's shape: /shared/<slug>--<id>.
 *
 * The slug is decoration — the id is what resolves the dashboard — so the
 * parser must find the id whatever the slug did, and the builder must not
 * produce a slug that hides the separator.
 */

/** A dashboard id: 24 hex characters. */
const ID_RE = /[0-9a-f]{24}/i

/**
 * Market name → link slug.
 *
 * Trailing dashes are stripped *after* truncating: a name cut mid-word at 60
 * characters used to end in a dash, which ran into the "--" separator and gave
 * "…trials---<id>". Splitting that on "--" left the id with a leading dash, so
 * the link 404'd.
 */
export function slugifyDashboardName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)
      .replace(/-+$/, '') || 'dashboard'
  )
}

/**
 * The dashboard id inside a share-link path segment.
 *
 * Reads the trailing id directly rather than splitting on the separator, so a
 * link already in a client's inbox with a stray dash still resolves.
 */
export function dashboardIdFromParam(param: string | null | undefined): string {
  const raw = (param ?? '').trim()
  if (!raw) return ''
  const match = raw.match(new RegExp(`(${ID_RE.source})$`, 'i'))
  return match ? match[1] : raw
}
