// Quick connection + PII check. Run: node test-shopify.js
const fs = require('fs');

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach((line) => {
  const m = line.match(/^\s*([\w.]+)\s*=\s*"?([^"\r\n]*)"?/);
  if (m) env[m[1]] = m[2];
});

const pick = (attrs, ...keys) => {
  for (const k of keys) {
    const hit = (attrs || []).find(
      (a) => a.name?.toLowerCase().trim() === k.toLowerCase()
    );
    if (hit?.value) return hit.value;
  }
  return null;
};

async function run() {
  const url = `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/2025-07/orders.json?status=any&limit=3`;
  const res = await fetch(url, {
    headers: { 'X-Shopify-Access-Token': env.SHOPIFY_ACCESS_TOKEN },
  });

  if (!res.ok) {
    console.error(`HTTP ${res.status}`, await res.text());
    return;
  }

  const { orders } = await res.json();
  console.log(`Fetched ${orders.length} order(s)\n`);

  orders.forEach((o) => {
    const na = o.note_attributes;
    console.log(`--- ${o.name} ---`);
    console.log('  NAME    :', pick(na, 'Name') || 'MISSING');
    console.log('  PHONE   :', pick(na, 'Phone') || 'MISSING');
    console.log('  ADDRESS :', pick(na, 'Address') || 'MISSING');
    console.log('  PIN     :', pick(na, 'PIN code') || 'MISSING');
    console.log('  PRODUCTS:', (o.line_items || []).map((li) => `${li.name} x${li.quantity}`).join(' | '));
  });
}

run().catch((e) => console.error(e.message));
