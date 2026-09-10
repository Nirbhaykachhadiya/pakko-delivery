import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { ORDER_CUTOFF } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const auth = await requireRole('admin');
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const rider = searchParams.get('rider');

  const cutoff = new Date(`${ORDER_CUTOFF}T00:00:00`);
  const range = { gte: cutoff };
  if (from) {
    const start = new Date(`${from}T00:00:00`);
    range.gte = start < cutoff ? cutoff : start;
  }
  if (to) {
    const end = new Date(`${to}T00:00:00`);
    end.setHours(23, 59, 59, 999);
    range.lte = end;
  }

  // Stats use the same date window as the table, and narrow by rider too, so
  // the whole page reads as one consistent view of the same filter.
  const base = { orderDate: range };
  const where = { ...base };
  if (rider === 'unassigned') where.assignedToId = null;
  else if (rider) where.assignedToId = Number(rider);

  const [byStatus, unassigned, total, riders, perRider, byArea, byPayment] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.order.count({ where: { ...base, assignedToId: null } }),
    prisma.order.count({ where }),
    prisma.user.findMany({
      where: { role: 'delivery', active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.order.groupBy({
      by: ['assignedToId', 'status'],
      where: { ...base, assignedToId: { not: null } },
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ['pincode'],
      where,
      _count: { _all: true },
      orderBy: { _count: { pincode: 'desc' } },
      take: 12,
    }),
    prisma.order.groupBy({
      by: ['paymentMode'],
      where: { ...where, status: 'delivered' },
      _count: { _all: true },
    }),
  ]);

  const counts = {
    pending: 0,
    out_for_delivery: 0,
    rescheduled: 0,
    delivered: 0,
    cancelled: 0,
  };
  byStatus.forEach((r) => {
    counts[r.status] = r._count._all;
  });

  const payments = { cash: 0, online: 0 };
  byPayment.forEach((p) => {
    if (p.paymentMode) payments[p.paymentMode] = p._count._all;
  });

  const riderStats = riders.map((r) => {
    const rows = perRider.filter((p) => p.assignedToId === r.id);
    const get = (s) => rows.find((x) => x.status === s)?._count._all || 0;
    return {
      id: r.id,
      name: r.name,
      assigned: rows.reduce((sum, x) => sum + x._count._all, 0),
      toDeliver: get('out_for_delivery'),
      rescheduled: get('rescheduled'),
      delivered: get('delivered'),
      cancelled: get('cancelled'),
    };
  });

  const areas = byArea
    .filter((a) => a.pincode)
    .map((a) => ({ pincode: a.pincode, count: a._count._all }));

  return NextResponse.json({ total, unassigned, counts, payments, riderStats, areas });
}
