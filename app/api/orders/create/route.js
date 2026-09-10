import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export const runtime = 'nodejs';

const clean = (p) => String(p || '').replace(/\D/g, '');

export async function POST(req) {
  const auth = await requireRole('admin');
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { customerName, phone, pincode, address, products, riderId } = await req.json();

  if (!customerName?.trim())
    return NextResponse.json({ error: 'Enter the customer name' }, { status: 400 });

  const ph = clean(phone);
  if (ph.length < 10)
    return NextResponse.json({ error: 'Enter a 10 digit phone number' }, { status: 400 });

  const items = (products || []).filter((p) => p.name?.trim());
  if (!items.length)
    return NextResponse.json({ error: 'Add at least one product' }, { status: 400 });

  const clines = items.map((p) => ({
    name: p.name.trim(),
    qty: Number(p.qty) || 1,
    price: String(p.price || '0'),
  }));

  const total = clines.reduce((sum, p) => sum + Number(p.price) * p.qty, 0);

  // Manual orders get their own numbering so they never clash with Shopify's
  const count = await prisma.order.count({ where: { source: 'manual' } });
  const orderNumber = `M-${String(count + 1).padStart(4, '0')}`;

  const assigning = riderId !== null && riderId !== undefined && riderId !== '';

  const order = await prisma.order.create({
    data: {
      shopifyOrderId: `manual-${Date.now()}`,
      orderNumber,
      source: 'manual',
      customerName: customerName.trim(),
      phone: ph,
      address: address?.trim() || null,
      pincode: clean(pincode) || null,
      products: clines,
      totalPrice: String(total),
      orderDate: new Date(),
      status: assigning ? 'out_for_delivery' : 'pending',
      assignedToId: assigning ? Number(riderId) : null,
      assignedAt: assigning ? new Date() : null,
      assignedById: assigning ? auth.user.id : null,
      assignedByName: assigning ? auth.user.name : null,
      assignedByRole: assigning ? 'admin' : null,
    },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ ok: true, order });
}
