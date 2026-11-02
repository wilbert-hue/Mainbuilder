/**
 * Liveness probe — always 200 if the Node server is up.
 *
 * Intentionally has NO dependency on Mongo or R2. Render (and other PaaS) use
 * the health check to decide whether to route traffic; if it depended on Mongo,
 * a transient Atlas hiccup would make the whole app appear down. Use
 * /api/dashboards/health for the richer readiness view (Mongo + R2 status).
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      // Which build is actually serving, and whether it can reach the services
      // it needs. Without this there is no way to tell a deployment that has
      // not happened from an environment variable that was never saved — the
      // symptom is identical from outside.
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      configured: {
        deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
        groq: Boolean(process.env.GROQ_API_KEY),
        mongo: Boolean(process.env.MONGODB_URI),
      },
    },
    { status: 200 }
  )
}
