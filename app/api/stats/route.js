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

  const base = { orderDate: range };

  // `scoped` narrows to one rider when asked - it drives the six count
  // buttons. `base` stays global and drives the tab strip, so the
  // "Not assigned" tab always shows the real number of loose orders no
  // matter which rider is being looked at.
  const scoped = rider ? { ...base, assignedToId: Number(rider) } : base;

  const [byStatus, unassignedGlobal, total, riders, perRider, byPayment] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], where: scoped, _count: { _all: true } }),
    prisma.order.count({
      where: {
        ...base,
        assignedToId: null,
        // same rule as the list: finished orders are not "not assigned"
        status: { notIn: ['delivered', 'cancelled'] },
      },
    }),
    prisma.order.count({ where: scoped }),
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
      by: ['paymentMode'],
      where: { ...scoped, status: 'delivered' },
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
      total: rows.reduce((sum, x) => sum + x._count._all, 0),
      assigned: get('out_for_delivery'),
      rescheduled: get('rescheduled'),
      delivered: get('delivered'),
      cancelled: get('cancelled'),
    };
  });

  return NextResponse.json({
    total,
    counts,
    payments,
    riderStats,
    // always global - used by the tab strip
    unassigned: unassignedGlobal,
    scopedToRider: Boolean(rider),
  });
}
