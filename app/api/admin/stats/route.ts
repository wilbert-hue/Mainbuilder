import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { checkAdminAccess } from '@/lib/auth/admin'
import { getMongoClient } from '@/lib/mongodb'
import { getMongoDatabaseName, getMongoCollectionName } from '@/lib/mongo-config'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await checkAdminAccess(user.uid)
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const client = await getMongoClient()
  const db = client.db(getMongoDatabaseName())
  const collection = db.collection(getMongoCollectionName())
  const usersCollection = db.collection('users')

  // Aggregate dashboards by ownerId
  const grouped = await collection.aggregate([
    {
      $group: {
        _id: '$ownerId',
        count: { $sum: 1 },
        dashboards: {
          $push: {
            id: '$_id',
            name: '$name',
            createdAt: '$createdAt',
            currency: '$currency',
          },
        },
        lastCreated: { $max: '$createdAt' },
      },
    },
    { $sort: { count: -1 } },
  ]).toArray()

  // Collect unique ownerIds to look up emails
  const ownerIds = grouped.map((g) => g._id).filter(Boolean)
  const userDocs = ownerIds.length
    ? await usersCollection.find({ _id: { $in: ownerIds } as any }).toArray()
    : []

  const emailById = new Map(userDocs.map((u: any) => [u._id, u.email]))

  const stats = grouped.map((g) => ({
    email: emailById.get(g._id) ?? g._id ?? '(unknown)',
    ownerId: g._id,
    count: g.count,
    lastCreated: g.lastCreated ?? null,
    dashboards: (g.dashboards as any[]).sort(
      (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    ),
  }))

  const totalDashboards = stats.reduce((s, r) => s + r.count, 0)

  return NextResponse.json({ stats, totalDashboards, totalUsers: stats.length })
}
