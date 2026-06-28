/**
 * POST /api/dashboards/save with optional gzip for large dashboards (Vercel 4.5MB limit).
 */

const COMPRESS_THRESHOLD_BYTES = 3_000_000

async function gzipStringToBase64(text: string): Promise<string> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  const buffer = await new Response(stream).arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export async function postDashboardSave(payload: Record<string, unknown>): Promise<Response> {
  const json = JSON.stringify(payload)
  const sizeMB = json.length / 1_048_576

  if (json.length <= COMPRESS_THRESHOLD_BYTES) {
    return fetch('/api/dashboards/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
    })
  }

  if (typeof CompressionStream === 'undefined') {
    throw new Error(
      `Dashboard data is too large (~${sizeMB.toFixed(1)} MB) for this browser. ` +
        'Try fewer geographies/segments, or use Chrome/Edge.'
    )
  }

  const compressed = await gzipStringToBase64(json)
  return fetch('/api/dashboards/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _compressed: true, payload: compressed }),
  })
}
