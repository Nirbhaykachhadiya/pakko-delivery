import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ORDER_CUTOFF } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_FIELD = {
  delivered: 'deliveredAt',
  cancelled: 'cancelledAt',
  rescheduled: 'lastAttemptAt',
};

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const rider = searchParams.get('rider');
  const q = searchParams.get('q');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const dateBy = searchParams.get('dateBy');

  const cutoff = new Date(`${ORDER_CUTOFF}T00:00:00`);
  const where = { orderDate: { gte: cutoff } };

  if (user.role === 'delivery') {
    where.assignedToId = user.id;
  } else if (rider === 'unassigned') {
    where.assignedToId = null;
  } else if (rider) {
    where.assignedToId = Number(rider);
  }

  if (status) where.status = status;

  if (from || to) {
    const field = DATE_FIELD[dateBy] || 'orderDate';
    const range = field === 'orderDate' ? { gte: cutoff } : {};
    if (from) {
      const start = new Date(`${from}T00:00:00`);
      range.gte = field === 'orderDate' && start < cutoff ? cutoff : start;
    }
    if (to) {
      const end = new Date(`${to}T00:00:00`);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    where[field] = range;
  }

  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
      { address: { contains: q, mode: 'insensitive' } },
      { pincode: { contains: q } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    // "manual" sorts before "shopify", so hand-typed orders sit at the top
    orderBy: [{ source: 'asc' }, { orderDate: 'desc' }],
    take: 500,
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ orders });
}
