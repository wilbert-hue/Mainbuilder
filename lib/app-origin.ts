import type { NextRequest } from 'next/server'

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '')
}

/**
 * Public base URL for share links and redirects.
 * Prefer NEXT_PUBLIC_APP_URL when set (production, LAN IP, or tunnel).
 */
export function getPublicAppOrigin(req?: NextRequest): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim()
  if (fromEnv) return stripTrailingSlash(fromEnv)

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  if (!req) return ''

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  if (host) {
    const isLocal =
      host.includes('localhost') ||
      host.startsWith('127.') ||
      host.startsWith('0.0.0.0')
    const proto =
      req.headers.get('x-forwarded-proto') ||
      (isLocal ? 'http' : 'https')
    return `${proto}://${host}`
  }

  const origin = req.headers.get('origin')
  if (origin) return stripTrailingSlash(origin)

  return ''
}
