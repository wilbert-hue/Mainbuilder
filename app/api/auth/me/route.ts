import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { isUserAdmin } from '@/lib/auth/users'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ user: null }, { status: 200 })
  const admin = await isUserAdmin(user.uid)
  return NextResponse.json({ user: { id: user.uid, email: user.email, isAdmin: admin } }, { status: 200 })
}
