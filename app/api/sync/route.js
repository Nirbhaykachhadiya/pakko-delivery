import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchShopifyOrders, mapOrder } from '@/lib/shopify';
import { requireRole } from '@/lib/auth';
import { ORDER_CUTOFF } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const auth = await requireRole('admin');
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const cutoff = new Date(`${ORDER_CUTOFF}T00:00:00`);

  try {
    // Only ever pull from the cutoff forward
    const raw = await fetchShopifyOrders({ since: cutoff });
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const o of raw) {
      const data = mapOrder(o);

      if (data.orderDate < cutoff) {
        skipped++;
        continue;
      }

      const existing = await prisma.order.findUnique({
        where: { shopifyOrderId: data.shopifyOrderId },
        select: { id: true },
      });

      if (existing) {
        // Refresh only Shopify-side fields; never touch delivery workflow
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

    return NextResponse.json({
      ok: true,
      fetched: raw.length,
      created,
      updated,
      skipped,
      cutoff: ORDER_CUTOFF,
      syncedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
