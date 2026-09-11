import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchShopifyOrders, mapOrder } from '@/lib/shopify';
import { requireRole } from '@/lib/auth';
import { ORDER_CUTOFF, MIN_ORDER_NUMBER, orderNumberValue } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function shopifyFields(d) {
  return {
    customerName: d.customerName,
    phone: d.phone,
    address: d.address,
    pincode: d.pincode,
    city: d.city,
    products: d.products,
    totalPrice: d.totalPrice,
  };
}

function sameAsStored(a, b) {
  return (
    a.customerName === b.customerName &&
    a.phone === b.phone &&
    a.address === b.address &&
    a.pincode === b.pincode &&
    a.totalPrice === b.totalPrice &&
    JSON.stringify(a.products) === JSON.stringify(b.products)
  );
}

export async function POST() {
  const auth = await requireRole('admin');
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const started = Date.now();
  const cutoff = new Date(`${ORDER_CUTOFF}T00:00:00`);

  try {
    const raw = await fetchShopifyOrders({ since: cutoff });

    const incoming = raw.map(mapOrder).filter((d) => {
      if (d.orderDate < cutoff) return false;
      const n = orderNumberValue(d.orderNumber);
      // Anything numbered below the starting point is ignored for good
      return n === null || n >= MIN_ORDER_NUMBER;
    });

    if (incoming.length === 0) {
      return NextResponse.json({
        ok: true,
        created: 0,
        updated: 0,
        from: MIN_ORDER_NUMBER,
        ms: Date.now() - started,
      });
    }

    const ids = incoming.map((d) => d.shopifyOrderId);
    const existing = await prisma.order.findMany({
      where: { shopifyOrderId: { in: ids } },
      select: {
        shopifyOrderId: true,
        customerName: true,
        phone: true,
        address: true,
        pincode: true,
        totalPrice: true,
        products: true,
      },
    });

    const byId = new Map(existing.map((e) => [e.shopifyOrderId, e]));

    const toCreate = [];
    const toUpdate = [];
    for (const d of incoming) {
      const prev = byId.get(d.shopifyOrderId);
      if (!prev) toCreate.push(d);
      else if (!sameAsStored(d, prev)) toUpdate.push(d);
    }

    let created = 0;
    if (toCreate.length) {
      const res = await prisma.order.createMany({ data: toCreate, skipDuplicates: true });
      created = res.count;
    }

    let updated = 0;
    if (toUpdate.length) {
      const BATCH = 25;
      for (let i = 0; i < toUpdate.length; i += BATCH) {
        const slice = toUpdate.slice(i, i + BATCH);
        await prisma.$transaction(
          slice.map((d) =>
            prisma.order.update({
              where: { shopifyOrderId: d.shopifyOrderId },
              data: shopifyFields(d),
            })
          )
        );
        updated += slice.length;
      }
    }

    return NextResponse.json({
      ok: true,
      fetched: incoming.length,
      created,
      updated,
      from: MIN_ORDER_NUMBER,
      ms: Date.now() - started,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
