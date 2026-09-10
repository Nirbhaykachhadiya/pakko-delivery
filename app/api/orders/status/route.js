import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

const ALLOWED = ['pending', 'out_for_delivery', 'rescheduled', 'delivered', 'cancelled'];
const PAYMENTS = ['cash', 'online'];

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { orderId, status, cancelReason, cancelNote, pendingNote, pendingUntil, paymentMode } =
    await req.json();

  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: 'Unknown status' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: Number(orderId) } });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (user.role === 'delivery' && order.assignedToId !== user.id) {
    return NextResponse.json({ error: 'This order is not assigned to you' }, { status: 403 });
  }

  if (status === 'delivered' && !PAYMENTS.includes(paymentMode)) {
    return NextResponse.json({ error: 'Choose cash or online' }, { status: 400 });
  }
  if (status === 'cancelled' && !cancelReason) {
    return NextResponse.json({ error: 'Pick a reason for cancelling' }, { status: 400 });
  }
  if (status === 'rescheduled' && !pendingNote?.trim()) {
    return NextResponse.json({ error: 'Write what the customer said' }, { status: 400 });
  }

  const isAttempt = status === 'rescheduled' || status === 'cancelled';

  const data = {
    status,
    deliveredAt: status === 'delivered' ? new Date() : null,
    paymentMode: status === 'delivered' ? paymentMode : null,
    cancelledAt: status === 'cancelled' ? new Date() : null,
    cancelReason: status === 'cancelled' ? cancelReason : null,
    cancelNote: status === 'cancelled' ? cancelNote?.trim() || null : null,
    pendingNote: status === 'rescheduled' ? pendingNote.trim() : null,
    pendingUntil: status === 'rescheduled' && pendingUntil ? new Date(pendingUntil) : null,
    lastAttemptAt: isAttempt ? new Date() : order.lastAttemptAt,
    attemptCount: isAttempt ? order.attemptCount + 1 : order.attemptCount,
  };

  const updated = await prisma.order.update({
    where: { id: Number(orderId) },
    data,
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ ok: true, order: updated });
}
