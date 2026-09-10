import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchShopifyOrders, mapOrder } from '@/lib/shopify';
import { ORDER_CUTOFF } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Vercel's cron has no login session, so it authenticates with a secret
// header instead. Vercel sends CRON_SECRET automatically as a Bearer token.
function authorised(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req) {
  if (!authorised(req)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
  }

  const cutoff = new Date(`${ORDER_CUTOFF}T00:00:00`);

  try {
    const raw = await fetchShopifyOrders({ since: cutoff });
    let created = 0;
    let updated = 0;

    for (const o of raw) {
      const data = mapOrder(o);
      if (data.orderDate < cutoff) continue;

      const existing = await prisma.order.findUnique({
        where: { shopifyOrderId: data.shopifyOrderId },
        select: { id: true },
      });

      if (existing) {
        await prisma.order.update({
          where: { shopifyOrderId: data.shopifyOrderId },
          data: {
            customerName: data.customerName,
            phone: data.phone,
            address: data.address,
            pincode: data.pincode,
            city: data.city,
            products: data.products,
            totalPrice: data.totalPrice,
          },
        });
        updated++;
      } else {
        await prisma.order.create({ data });
        created++;
      }
    }

    return NextResponse.json({ ok: true, created, updated, at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
