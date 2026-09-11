import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ORDER_CUTOFF } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A deliberately tiny endpoint the rider app can poll often without cost.
// It returns one row of aggregates, not the orders themselves, so the full
// list is only fetched when something has actually changed.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const where = { orderDate: { gte: new Date(`${ORDER_CUTOFF}T00:00:00`) } };
  if (user.role === 'delivery') where.assignedToId = user.id;

  const agg = await prisma.order.aggregate({
    where,
    _count: { _all: true },
    _max: { updatedAt: true },
  });

  return NextResponse.json({
    count: agg._count._all,
    latest: agg._max.updatedAt ? new Date(agg._max.updatedAt).getTime() : 0,
  });
}
