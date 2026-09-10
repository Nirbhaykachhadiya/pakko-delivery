const API_VERSION = '2025-07';

function attr(attrs, ...keys) {
  for (const k of keys) {
    const hit = (attrs || []).find(
      (a) => a.name?.toLowerCase().trim() === k.toLowerCase()
    );
    if (hit?.value) return String(hit.value).trim();
  }
  return null;
}

// Maps a raw Shopify order into our DB shape.
// Customer PII is blocked on the Basic plan, so name/phone/address come from
// the note_attributes written by the COD form app.
export function mapOrder(o) {
  const na = o.note_attributes || [];
  const ship = o.shipping_address || {};

  const name =
    attr(na, 'Name', 'full name', 'customer name') ||
    `${o.customer?.first_name || ''} ${o.customer?.last_name || ''}`.trim() ||
    'Unknown';

  const rawPin = attr(na, 'PIN code', 'pincode', 'pin', 'zip') || ship.zip || null;

  return {
    shopifyOrderId: String(o.id),
    orderNumber: o.name,
    customerName: name,
    phone: attr(na, 'Phone', 'mobile', 'phone number') || o.phone || ship.phone || null,
    address: attr(na, 'Address', 'address1', 'street') || ship.address1 || null,
    // store digits only so lookups always match
    pincode: rawPin ? String(rawPin).replace(/\D/g, '') || null : null,
    city: attr(na, 'City', 'city') || ship.city || null,
    utmCampaign: attr(na, 'utm_campaign'),
    products: (o.line_items || []).map((li) => ({
      name: li.name,
      qty: li.quantity,
      price: li.price,
    })),
    totalPrice: o.total_price,
    orderDate: new Date(o.created_at),
  };
}

// `since` is a Date. Falls back to `days` if not given.
export async function fetchShopifyOrders({ since, days = 30, maxPages = 20 } = {}) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!domain || !token) {
    throw new Error('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ACCESS_TOKEN');
  }

  const start = since ? new Date(since) : new Date(Date.now() - days * 86400000);

  let url =
    `https://${domain}/admin/api/${API_VERSION}/orders.json` +
    `?status=any&limit=250&created_at_min=${start.toISOString()}`;

  const all = [];

  for (let page = 0; page < maxPages && url; page++) {
    const res = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': token },
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`Shopify ${res.status}: ${await res.text()}`);

    const { orders } = await res.json();
    all.push(...orders);

    const link = res.headers.get('link') || '';
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }

  return all;
}
