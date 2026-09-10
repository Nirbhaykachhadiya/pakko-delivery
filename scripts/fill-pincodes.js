// Lists pincodes in your orders that have no area name yet, and suggests one
// from India Post. Paste the output into lib/pincodes.js and fix the names.
//
// Run: node scripts/fill-pincodes.js

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

function knownPins() {
  const src = fs.readFileSync('lib/pincodes.js', 'utf8');
  return new Set([...src.matchAll(/'(\d{6})'\s*:/g)].map((m) => m[1]));
}

async function lookup(pin) {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();
    const offices = data?.[0]?.PostOffice;
    if (!offices?.length) return null;
    const best = offices.find((o) => o.DeliveryStatus === 'Delivery') || offices[0];
    return best.Name;
  } catch {
    return null;
  }
}

async function main() {
  const known = knownPins();

  const rows = await prisma.order.groupBy({
    by: ['pincode'],
    _count: { _all: true },
    orderBy: { _count: { pincode: 'desc' } },
  });

  const missing = rows.filter((r) => r.pincode && !known.has(r.pincode));

  if (!missing.length) {
    return console.log('Every pincode in your orders already has an area name.');
  }

  console.log(`\n${missing.length} pincodes need a name.`);
  console.log('Paste these into lib/pincodes.js, then correct any wrong names:\n');

  for (const m of missing) {
    const name = await lookup(m.pincode);
    console.log(`  '${m.pincode}': '${name || 'CHECK THIS'}',   // ${m._count._all} orders`);
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log('');
}

main().catch(console.error).finally(() => prisma.$disconnect());
