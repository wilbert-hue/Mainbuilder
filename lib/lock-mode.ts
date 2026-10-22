/**
 * Whether the dashboard withholds generated content.
 *
 * Locks are a client-facing device: a preview shows the shape of the research
 * and sells the rest. While working on what is generated, they are in the way —
 * you cannot read what you are trying to fix. So they are off in a development
 * server and on in a production build, which is what Vercel runs.
 *
 * Nothing about the deployed site changes when this file ships.
 */
export const LOCKS_ENABLED = process.env.NODE_ENV === 'production'
