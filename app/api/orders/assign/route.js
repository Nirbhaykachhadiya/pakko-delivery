import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

const OPEN = ['pending', 'out_for_delivery', 'rescheduled'];

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { orderIds, riderId } = await req.json();

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return NextResponse.json({ error: 'Pick at least one order' }, { status: 400 });
  }

  const ids = orderIds.map(Number);
  const assigning = riderId !== null && riderId !== undefined;

  // A rider can only hand over orders that are currently his, and can never
  // leave an order unassigned - it must go to a named person.
  if (user.role === 'delivery') {
    if (!assigning) {
      return NextResponse.json(
        { error: 'Choose who should take this order' },
        { status: 400 }
      );
    }
    const mine = await prisma.order.count({
      where: { id: { in: ids }, assignedToId: user.id },
    });
    if (mine !== ids.length) {
      return NextResponse.json(
        { error: 'You can only pass on orders assigned to you' },
        { status: 403 }
      );
    }
  }

  if (assigning) {
    const rider = await prisma.user.findFirst({
      where: { id: Number(riderId), role: 'delivery', active: true },
    });
    if (!rider) {
      return NextResponse.json({ error: 'That delivery boy was not found' }, { status: 400 });
    }
  }

  await prisma.order.updateMany({
    where: { id: { in: ids } },
    data: {
      assignedToId: assigning ? Number(riderId) : null,
      assignedAt: assigning ? new Date() : null,
      assignedById: assigning ? user.id : null,
      assignedByName: assigning ? user.name : null,
      assignedByRole: assigning ? user.role : null,
    },
  });

  const result = await prisma.order.updateMany({
    where: { id: { in: ids }, status: { in: OPEN } },
    data: { status: assigning ? 'out_for_delivery' : 'pending' },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
